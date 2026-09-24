// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Npgsql;
using System.Data;

namespace KhojiGenAIServer.Data;

/// <summary>
/// Usage
/// var dataAccess = new PgDataAccess("Host=localhost;Username=postgres;Password=pass;Database=mydb");
/// var users = dataAccess.ExecuteReader(
///     "SELECT id, name FROM users WHERE active = @active",
///     r => new { Id = r.GetInt32(0), Name = r.GetString(1) },
///     [ ("@active", true) ]
/// );
/// </summary>
class PgDataAccess
{
    protected string ConnectionString;

    public PgDataAccess(string connectionString)
    {
        this.ConnectionString = connectionString;
    }

    public T Execute<T>(Func<NpgsqlCommand, T> executor, string sql, IEnumerable<(string Name, object Value)> parameters = null)
    {
        using var connection = new NpgsqlConnection(ConnectionString);
        connection.Open();

        using var command = new NpgsqlCommand(sql, connection);
        if (parameters != null)
        {
            foreach (var (Name, Value) in parameters)
                command.Parameters.AddWithValue(Name, Value ?? DBNull.Value);
        }

        return executor(command);
    }

    public int ExecuteNonQuery(string sql, IEnumerable<(string Name, object Value)> parameters = null) =>
        this.Execute(cmd => cmd.ExecuteNonQuery(), sql, parameters);

    public T ExecuteScalar<T>(string sql, IEnumerable<(string Name, object Value)> parameters = null) =>
        this.Execute(cmd => (T)cmd.ExecuteScalar(), sql, parameters);

    public List<T> ExecuteReader<T>(string sql, Func<IDataRecord, T> map, IEnumerable<(string Name, object Value)> parameters = null) =>
        Execute(cmd =>
        {
            using var reader = cmd.ExecuteReader();
            var results = new List<T>();
            while (reader.Read())
                results.Add(map(reader));
            return results;
        }, sql, parameters);
}
