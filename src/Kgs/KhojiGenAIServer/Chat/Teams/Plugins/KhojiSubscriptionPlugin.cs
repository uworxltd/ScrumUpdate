// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using Microsoft.Agents.Builder;
using System.ComponentModel;
using System.Dynamic;
using System.Text.Json;

namespace KhojiGenAIServer.Chat.Teams.Plugins;

record KhojiSubscriptionPluginPayload(int InstanceId);

class KhojiSubscriptionPlugin(
    ITurnContext turnContext, // we need to get rid of this before moving this to Chat.Plugins
    KhojiSubscriptionPluginPayload payload)
{
    IEnumerable<(int InstanceId, int TenantId, string InstanceName)> getUserRegisteredInstances(string aadObjId)
    {
        try
        {
            var dataAccess = new PgDataAccess(KhojiConstants.DatabaseConnectionString);
            var result = dataAccess.ExecuteReader(@"
            SELECT i.id, i.tenant_id, i.instance_name
            FROM khoji.khoji_user u left outer join khoji.user_access ua on u.id = ua.user_id
                left outer join khoji.instance i on ua.instance_id = i.id
            WHERE u.msft_teams_aad_object_id = @oid
            ",
                r => (r.GetInt32(0), r.GetInt32(1), r.GetString(2)),
                [("@oid", aadObjId)]);

            return result;
        }
        catch (Exception)
        {
            //Console.WriteLine($"Error checking subscription status: {ex.Message}");
            return null;
        }
    }

    string getTeamStructure(int instanceId)
    {
        var dataAccess = new PgDataAccess(KhojiConstants.DatabaseConnectionString);
        var result = dataAccess.ExecuteReader(
                $"""
                    SELECT t.id as id,
                    t.name as team_name,
                    (
                        SELECT json_agg(mem) FROM
                        (
                            SELECT u.id AS id,
                                   u.full_name AS "fullName",
                                   false AS "isInMultipleTeams",
                                   u.email AS "memberEmail",
                                   u.account_id AS "accountId",
                                   r AS "role",
                                   u.status as "status"
                            FROM khoji.team_members tm
                            JOIN khoji.instance_user u ON tm.user_id = u.id
                            INNER JOIN khoji.roles r ON r.id = u.role_id
                            WHERE tm.team_id = t.id AND u.instance_id = '{instanceId}'
                        ) mem
                    ) as members,
                    (
                        SELECT json_agg(sup) FROM
                        (
                            SELECT u.id AS id,
                                   u.full_name AS "fullName",
                                   false AS "isInMultipleTeams",
                                   u.email AS "memberEmail",
                                   u.account_id AS "accountId",
                                   r AS "role",
                                   u.status as "status"
                            FROM khoji.team_supervisor ts
                            JOIN khoji.instance_user u ON ts.user_id = u.id
                            INNER JOIN khoji.roles r ON r.id = u.role_id
                            WHERE ts.team_id = t.id AND u.instance_id = '{instanceId}'
                        ) sup
                    ) as supervisors
                    FROM khoji.teams t
                    WHERE t.instance_id = '{instanceId}'
                """,
                record =>
                {
                    dynamic row = new ExpandoObject();
                    var d = (IDictionary<string, object>)row;
                    for (int i = 0; i < record.FieldCount; i++)
                        d[record.GetName(i)] = record.IsDBNull(i) ? null : record.GetValue(i);
                    return row;
                }
             );

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        return JsonSerializer.Serialize(result, options);
    }

    [Description("gets the user's Team structure be it him as a member or supervisor of that team based on the instanceId provided")]
    public string GetUserTeamStructure()
    {
        return getTeamStructure(payload.InstanceId);
    }

    [Description("This function will return list of instances of the users, along with other associated meta data to them")]
    public IEnumerable<(int InstanceId, int TenantId, string InstanceName)> GetAllInstancesAgainstUser()
    {
        return getUserRegisteredInstances(turnContext.Activity.From.AadObjectId);
    }
}
