// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Npgsql;

namespace KhojiGenAIServer.Infrastructure;

/// <summary>
/// Will probably be a lot slower than in-memory rate limiting, but useful for distributed scenarios
/// </summary>
class PostgresRateLimiter
{
    const string SchemaName = "kgs";

    readonly TimeSpan timeWindow;
    readonly int maxRequests;

    static PostgresRateLimiter()
    {
        using var conn = new NpgsqlConnection(KhojiConstants.DatabaseConnectionString);
        conn.Open();

        using var cmd = new NpgsqlCommand($@"""
            -- Ensure schema
            CREATE SCHEMA IF NOT EXISTS {SchemaName};

            -- Ensure table
            CREATE TABLE IF NOT EXISTS {SchemaName}.rate_limit_logs (
                key TEXT NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL
            );

            -- Ensure index
            CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time 
                ON {SchemaName}.rate_limit_logs (key, timestamp);

            -- Create or replace function
            CREATE OR REPLACE FUNCTION {SchemaName}.check_rate_limit(
                p_key TEXT, 
                p_now TIMESTAMPTZ, 
                p_cutoff TIMESTAMPTZ, 
                p_max INT
            )
            RETURNS BOOLEAN AS $$
            DECLARE
                cnt INT;
            BEGIN
                -- Delete old rows for this key
                DELETE FROM {SchemaName}.rate_limit_logs 
                WHERE key = p_key AND timestamp <= p_cutoff;

                -- Count valid requests
                SELECT COUNT(*) INTO cnt
                FROM {SchemaName}.rate_limit_logs
                WHERE key = p_key AND timestamp > p_cutoff;

                IF cnt < p_max THEN
                    INSERT INTO {SchemaName}.rate_limit_logs (key, timestamp) 
                    VALUES (p_key, p_now);
                    RETURN TRUE;
                ELSE
                    RETURN FALSE;
                END IF;
            END;
            $$ LANGUAGE plpgsql;
            """, conn);

        cmd.ExecuteNonQuery();
    }

    public PostgresRateLimiter(TimeSpan timeWindow, int maxRequests)
    {
        this.timeWindow = timeWindow;
        this.maxRequests = maxRequests;
    }

    public async Task<bool> IsAllowedAsync(string key)
    {
        var now = DateTime.UtcNow;
        var cutoff = now - timeWindow;

        const string sql = $"SELECT {SchemaName}.check_rate_limit(@key, @now, @cutoff, @max)";

        await using var conn = new NpgsqlConnection(KhojiConstants.DatabaseConnectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("now", now);
        cmd.Parameters.AddWithValue("cutoff", cutoff);
        cmd.Parameters.AddWithValue("max", maxRequests);

        var allowed = (bool)await cmd.ExecuteScalarAsync();
        return allowed;
    }
}
