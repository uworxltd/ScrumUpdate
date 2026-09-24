// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using System.Text;

namespace KhojiGenAIServer;

static class KhojiConstants
{
    static string requireEnvirnmentVariable(string variable)
    {
        string value = Environment.GetEnvironmentVariable(variable);
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException(
                $"[FATAL] Environment variable {variable} is not set. " +
                $"KGS requires it to start — set it via docker-compose/.env, " +
                $"launchSettings.json, or the container environment and restart.");

        return value;
    }

    static string standardDatabaseConnectionString;

    public static void InitializeDatabaseConnectionString(string value)
        => standardDatabaseConnectionString = value;

    public static string DatabaseConnectionString
    {
        get
        {
            string value = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
            if (string.IsNullOrWhiteSpace(value))
                value = standardDatabaseConnectionString;
            if (string.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException(
                    "[FATAL] No database connection string configured. Set it via the standard configuration " +
                    "(appsettings.json ConnectionStrings:DefaultConnection / user-secrets) or the " +
                    "ConnectionStrings__DefaultConnection environment variable (docker-compose/.env, launchSettings.json), " +
                    "then restart KGS.");
            return value;
        }
    }

    public static string KhojiXFeUrlForBot
        => $"{KhojiConstants.KhojiXBaseUrl}/login?disableCaptcha=TXVoYW1tYWRBaG1hZA%3D%3D&redirect=msft-teams&userId=$1&teamsAppId=$2&referer=$3";

    public static string KhojiXBaseUrl
        => requireEnvirnmentVariable("KHOJIX_BASE_URL");

    public static string KhojiXBusinessServerUrl
        => requireEnvirnmentVariable("KHOJIX_BUSINESS_SERVER_URL");

    public static string KhojiXBasicAuthUsername
        => requireEnvirnmentVariable("KHOJI_BASICAUTHUSERNAME");

    public static string KhojiXBasicAuthPassword
        => requireEnvirnmentVariable("KHOJI_BASICAUTHUSERPASSWORD");

    public static string KhojiXBasicCreds
        => Convert.ToBase64String(Encoding.UTF8.GetBytes($"{KhojiXBasicAuthUsername}:{KhojiXBasicAuthPassword}"));

    public static string McpAtlassianUrl
        => Environment.GetEnvironmentVariable("MCP_ATLASSIAN_URL") ?? "http://mcp-atlassian:4001/mcp/";
}
