// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using Npgsql;
using System.ComponentModel;
using System.Text;
using System.Text.Json;
using Uworx.Khoji.Agile.AI;

namespace KhojiGenAIServer.Chat.Plugins;

class DatabasePlugin(ILogger logger, PluginPayload payload)
{
    static readonly string[] forbiddenSqlKeywords =
    [
        // Settings changes
        "set ", "reset ", "alter role", "alter user", "alter database",

        // Data modification
        "insert", "update", "delete", "truncate", "merge",

        // Schema / DB changes
        "create", "drop", "alter ", "comment on", "reindex", "vacuum",

        // File system / server access
        "copy", "pg_read_file", "pg_read_binary_file", "pg_stat_file",
        "pg_ls_dir", "pg_list_directory", "pg_logdir_ls",

        // Process / OS interaction
        "pg_terminate_backend", "pg_cancel_backend", "pg_reload_conf",

        // Code execution / special
        "do ", "call ", "security definer", "language plpgsql"
    ];

    string removeSqlComments(string sql)
    {
        var lines = sql.Split('\n');
        var noLineComments = lines
            .Where(l => !l.TrimStart().StartsWith("--"))
            .ToList();

        var withoutBlockComments = string.Join("\n", noLineComments);
        while (true)
        {
            var start = withoutBlockComments.IndexOf("/*", StringComparison.Ordinal);
            if (start == -1) break;
            var end = withoutBlockComments.IndexOf("*/", start + 2, StringComparison.Ordinal);
            if (end == -1) break;
            withoutBlockComments = withoutBlockComments.Remove(start, end - start + 2);
        }

        return withoutBlockComments;
    }

    void validateSqlIsSafe(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
            throw new ArgumentException("SQL cannot be empty.");

        // Remove comments for cleaner scanning
        var noComments = removeSqlComments(sql);
        var lowered = noComments.ToLowerInvariant();

        foreach (var keyword in forbiddenSqlKeywords)
        {
            if (lowered.StartsWith(keyword)) // contains ?
            {
                logger.LogInformation($"SQL: {sql}");
                throw new InvalidOperationException(
                    $"Query contains forbidden keyword: '{keyword.Trim()}'"
                );
            }
        }

        // Disallow multiple statements
        if (lowered.TrimEnd(';').Contains(";"))
        {
            logger.LogInformation($"SQL: {sql}");
            throw new InvalidOperationException("Multiple SQL statements are not allowed.");
        }
    }

    string schema => $"tenant_{payload.InstanceId}";

    [ToolFunction("list_tables")]
    [Description("Lists all available tables in the database")]
    public string ListTables()
    {
        logger.LogInformation($"[{schema}] ListTables");
        var dataAccess = new PgDataAccess(KhojiConstants.DatabaseConnectionString);
        var results = dataAccess.ExecuteReader(@"
            SELECT table_name,
                obj_description(format('%I.%I', table_schema, table_name)::regclass) AS table_comment
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE' --(table_type = 'VIEW' OR) 
                AND table_schema = @schema
            ORDER BY table_name
            ",
            r => (r.GetString(0), r.GetString(1)),
            [("@schema", schema)]);

        if (results == null || results.Count == 0)
            return "No tables found in the database.";

        var sb = new StringBuilder();
        sb.AppendLine($"Available tables in schema '{schema}':");

        foreach (var r in results)
        {
            var comment = !string.IsNullOrWhiteSpace(r.Item2) ? $" -- {r.Item2}" : "";
            sb.AppendLine($"{r.Item1}{comment}");
        }

        // Add relationship information
        sb.AppendLine();
        sb.AppendLine("Key Relationships:");
        sb.AppendLine("issues.issue_key connects to: sprint_issues, comments, worklogs");
        sb.AppendLine("issues.issue_id connects to: changelogs (issue_key in changelogs)");
        sb.AppendLine("sprint_issues.sprint_id connects to: sprints");
        sb.AppendLine("sprints.board_id connects to: boards");
        // Add hints
        sb.AppendLine();
        sb.AppendLine("Key Hints:");
        sb.AppendLine("We are connected to the database has only the data of the given team / board, we dont need to consider anything more");
        sb.AppendLine("sprints.state can be used to determine if the sprint is ACTIVE or not");

        return sb.ToString();
    }

    [ToolFunction("describe_table")]
    [Description("Describes the table structure for SQL query generation")]
    public string DescribeTable(
        [Description("Name of the table")] string table)
    {
        logger.LogInformation($"[{schema}] DescribeTable");

        if (table.Contains('.'))
        {
            var parts = table.Split('.');
            if (parts.Length > 1)
                table = parts[1];
            //schema = parts[0];
        }

        var dataAccess = new PgDataAccess(KhojiConstants.DatabaseConnectionString);
        var results = dataAccess.ExecuteReader(@"
            SELECT c.column_name, c.data_type,
                pd.description AS column_comment
            FROM information_schema.columns c
                LEFT JOIN pg_catalog.pg_class pc ON pc.relname = c.table_name
                LEFT JOIN pg_catalog.pg_namespace pn ON pn.oid = pc.relnamespace 
                    AND pn.nspname = c.table_schema
                LEFT JOIN pg_catalog.pg_description pd ON pd.objoid = pc.oid 
                    AND pd.objsubid = c.ordinal_position
            WHERE c.table_schema = @schema
                AND c.table_name = @table
            ORDER BY c.ordinal_position;
            ",
            r => (r.GetString(0), r.GetString(1), r.GetString(2)),
            [("@schema", schema), ("@table", table)]);

        var columnDescriptions = results.Select(r =>
        {
            var description = !string.IsNullOrWhiteSpace(r.Item3)
                ? $" -- {r.Item3}"
                : "";
            return $"{r.Item1} ({r.Item2}){description}";
        });

        return $"Table: {table}\nColumns:\n" + string.Join("\n", columnDescriptions);
    }

    [ToolFunction("read_data")]
    [Description("Executes SQL query")]
    //public async Task<IEnumerable<IDictionary<string, object?>>> ReadData(
    public async Task<string> ReadData(
        [Description("SQL query to execute")] string sql)
    {
        logger.LogInformation($"[{schema}] ReadData sql: {sql}");

        try
        {
            using var connection = new NpgsqlConnection(KhojiConstants.DatabaseConnectionString);
            connection.Open();

            // 🛡 Hardening step; so user cant do any harm
            var hardeningSql = $"SET search_path TO \"{schema}\";";
            hardeningSql += @"
            SET default_transaction_read_only = on;
            SET session_replication_role = replica;
            SET statement_timeout = '5s';
            SET idle_in_transaction_session_timeout = '10s';
            ";
            using var hardenCmd = new NpgsqlCommand(hardeningSql, connection);
            await hardenCmd.ExecuteNonQueryAsync();

            // ⚠️ We dont want to run any harmful query
            validateSqlIsSafe(sql);

            // ✅ We are good to go
            using var command = new NpgsqlCommand(sql, connection);
            using var reader = await command.ExecuteReaderAsync();

            var results = new List<Dictionary<string, object>>();

            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object>();
                for (var i = 0; i < reader.FieldCount; i++)
                    row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);

                results.Add(row);
            }

            logger.LogInformation($"[{schema}] Query returned {results.Count} items");
            return JsonSerializer.Serialize(results, new JsonSerializerOptions { WriteIndented = true });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{schema}] Failed to run the query {sql}");
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }
}
