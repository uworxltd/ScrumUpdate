// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Data;

// public because of tests
public class KbsGateway(ILogger logger, string connectionString)
{
    // keeping it internal, we are creating sql from parameters
    internal Dictionary<string, string> GetConfigurations(int instanceId, IEnumerable<string> keys)
    {
        string keysSql = string.Join(", ", keys.Select(k => $"'{k}'"));
        var dataAccess = new PgDataAccess(connectionString);
        var result = dataAccess.ExecuteReader<(string, string)>(
            $"""
            SELECT prop_key, prop_value
            FROM khoji.config
            WHERE instance_id = @instanceId
                AND prop_key IN (
                    {keysSql}
                )
            """,
            r => (r.GetString(0), r.GetString(1)),
            [("@instanceId", instanceId)]);

        return result.Where(p => !string.IsNullOrWhiteSpace(p.Item1))
            .ToDictionary(q => q.Item1.Trim().ToLower(), q => q.Item2);
    }

    public Dictionary<string, string> GetSprintAnalyticsConfigurations(int instanceId) =>
        GetConfigurations(instanceId,
        [
            "sprint.analytics.target.project.key",
            "sprint.analytics.target.board.id",
            "sprint.analytics.target.sprint.id"
        ]);

    public bool VerifyWebChatUser(int instanceId, int userId, out string email, out string message)
    {
        var dataAccess = new PgDataAccess(connectionString);
        var sql = @"
			select u.id, u.email,
				i.id, i.tenant_id, i.platform, i.instance_name
			from khoji.khoji_user u left outer join khoji.user_access ua on u.id = ua.user_id
				left outer join khoji.instance i on ua.instance_id = i.id
			where i.id = @instanceId and u.id = @userId
			";
        var results = dataAccess.ExecuteReader<(string Email, string InstanceName)>(
            sql,
            r => (
                r.GetString(1),                         // email
                r.IsDBNull(5) ? null : r.GetString(5)   // i.instance_name (used for the existence check)
            ),
            [("@instanceId", instanceId), ("@userId", userId)]);

        email = null;
        message = "Not found";

        foreach (var r in results)
        {
            email = r.Email;
            message = null;
            return true;
        }

        return false;
    }

    public IEnumerable<(string Email, int InstanceId, string InstanceName)> GetSubscriptions(string aadObjectId)
    {
        var dataAccess = new PgDataAccess(connectionString);
        var sql = @"
            select u.id, u.email,
				i.id, i.tenant_id, i.platform, i.instance_name
			from khoji.khoji_user u left outer join khoji.user_access ua on u.id = ua.user_id
				left outer join khoji.instance i on ua.instance_id = i.id
			where u.msft_teams_aad_object_id = @oid
			";

        logger.LogInformation($"Prepared KBS Sql for Subscription Status with @oid: {aadObjectId}");

        var results = dataAccess.ExecuteReader<(string Email, int InstanceId, string InstanceName)>(
            sql,
            r => (r.GetString(1),                           // u.email
                r.IsDBNull(2) ? 0 : r.GetInt32(2),          // i.id
                r.IsDBNull(5) ? null : r.GetString(5)),     // i.instance_name
            [("@oid", aadObjectId)]);

        var added = new List<int>();
        var list = new List<(string Email, int InstanceId, string InstanceName)>();

        foreach (var r in results)
        {
            if (r.InstanceId > 0)
            {
                if (!added.Contains(r.InstanceId))
                {
                    logger.LogInformation($"[{aadObjectId}] Email: {r.Email}, InstanceId: {r.InstanceId}, InstanceName: {r.InstanceName}");
                    added.Add(r.InstanceId);
                    list.Add((r.Email, r.InstanceId, r.InstanceName));
                }
            }
            else
            {
                if (!added.Contains(0))
                {
                    logger.LogInformation($"[{aadObjectId}] Email: {r.Email}, InstanceId: {r.InstanceId}, InstanceName: {r.InstanceName}");
                    added.Add(0);
                    list.Add((r.Email, 0, null));
                }
            }
        }

        return list;
    }

    public int Disconnect(string aadObjectId)
    {
        var dataAccess = new PgDataAccess(connectionString);
        var sql = @"
            update khoji.khoji_user
            set msft_teams_aad_object_id = null
            where msft_teams_aad_object_id = @oid
			";
        return dataAccess.ExecuteNonQuery(sql, [("@oid", aadObjectId)]);
    }

    public bool CalendarConnected(int userKhojiId)
    {
        var dataAccess = new PgDataAccess(connectionString);
        var sql = @"
            select i.id
            from khoji.integrations i join khoji.user_access ua on ua.id = i.user_access_id
            where ua.instance_user_id = @userKhojiId
			";
        return dataAccess.ExecuteScalar<long?>(sql, [("@userKhojiId", userKhojiId)]) > 0;
    }

    public bool IsUserTeamSupervisorAndSchemaExists(string email, int instanceId)
    {
        var schema = $"tenant_{instanceId}";
        try
        {
            var dataAccess = new PgDataAccess(connectionString);

            var isSupervisor = dataAccess.ExecuteScalar<bool>(@"
				SELECT EXISTS (
					SELECT 1
					FROM khoji.team_supervisor ts
					JOIN khoji.instance_user u 
						ON ts.user_id = u.id
					WHERE u.email = @email
					  AND u.instance_id = @instanceId
				) AS is_supervisor;
				",
                [("@email", email), ("@instanceId", instanceId)]);

            if (!isSupervisor) return false;

            var result = dataAccess.ExecuteScalar<string>(@"
				SELECT schema_name
				FROM information_schema.schemata
				WHERE schema_name = @schema;
				",
                [("@schema", schema)]);

            return schema == result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"Checking for {schema} schema existance failed", ex.Message);
            return false;
        }
    }

    public bool IsDataSyncEnabled(int instanceId)
    {
        var dataAccess = new PgDataAccess(connectionString);
        var propValue = dataAccess.ExecuteScalar<string>(@"
            SELECT prop_value
            FROM khoji.config
            WHERE instance_id = @instanceId
                AND prop_key = 'worklog.data.sync.permission'
			",
            [("@instanceId", instanceId)]);

        if (bool.TryParse(propValue, out bool r)) return r;
        return false;
    }

    public int? GetConfiguredSprintId(int instanceId)
    {
        var dataAccess = new PgDataAccess(connectionString);
        var propValue = dataAccess.ExecuteScalar<string>(@"
            SELECT prop_value
            FROM khoji.config
            WHERE instance_id = @instanceId
                AND prop_key = 'sprint.analytics.target.sprint.id'
			",
            [("@instanceId", instanceId)]);

        if (int.TryParse(propValue, out int r)) return r;
        return null;
    }

    public int UpdateSprintAnalyticsConfiguration(int instanceId, string key, string value)
    {
        var dataAccess = new PgDataAccess(connectionString);
        return dataAccess.ExecuteNonQuery(
            """
            INSERT INTO khoji.config (instance_id, prop_key, prop_value)
            VALUES (@instanceId, @key, @value)
            ON CONFLICT (instance_id, prop_key)
            DO UPDATE SET prop_value = EXCLUDED.prop_value;
            """,
            [("@instanceId", instanceId), ("@key", key), ("@value", value)]);
    }

    // function that returns the user teams -> which he is supervisor of
    public IEnumerable<(string teamName, int teamId)> GetUserTeams(int instanceId, string email)
    {
        var dataAccess = new PgDataAccess(connectionString);
        var result = dataAccess.ExecuteReader<(string, int)>(@"
			SELECT 
				t.name        AS team_name,
				t.id          AS team_id
			FROM khoji.team_supervisor ts
			JOIN khoji.teams t 
				ON ts.team_id = t.id
			JOIN khoji.instance i
				ON t.instance_id = i.id
			JOIN khoji.instance_user iu 
				ON ts.user_id = iu.id
			JOIN khoji.user_access ua 
				ON ua.instance_user_id = iu.id
			JOIN khoji.khoji_user ku 
				ON ku.id = ua.user_id
			WHERE ku.email = @email
			  AND i.id = @instanceId",
            r => (r.GetString(0), r.GetInt32(1)),
            [("@instanceId", instanceId), ("@email", email)]);

        return result;
    }

    public IEnumerable<(string name, string accountId, string avatar)> GetTeamMembers(int teamId)
    {
        var dataAccess = new PgDataAccess(connectionString);
        var result = dataAccess.ExecuteReader<(string, string, string)>(@"
			SELECT 
				iu.full_name,
                iu.account_id,
                iu.avatar_url
            FROM khoji.instance_user iu
            JOIN khoji.team_members tm ON iu.id = tm.user_id
            WHERE tm.team_id = @teamId",
            r => (r.GetString(0), r.GetString(1), r.GetString(2)),
            [("@teamId", teamId)]);

        return result;
    }
}
