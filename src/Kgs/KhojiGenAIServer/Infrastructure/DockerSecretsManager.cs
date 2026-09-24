// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Extensions;

namespace KhojiGenAIServer.Infrastructure;

class DockerSecretsManager
{
    static bool applySecretToEnvironmentVariables(Dictionary<string, string> secretEnvironmentVariableMappings,
        string secretName, string secretValue, string prefix = "")
    {
        string normalizedName = secretName;
        if (!string.IsNullOrEmpty(prefix) && secretName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            normalizedName = secretName.Substring(prefix.Length);

        if (secretEnvironmentVariableMappings.TryGetValue(normalizedName, out string envVarName))
        {
            string existingValue = Environment.GetEnvironmentVariable(envVarName);

            if (string.IsNullOrWhiteSpace(existingValue))
            {
                Environment.SetEnvironmentVariable(envVarName, secretValue);
                Console.WriteLine($"[INFO] Environment Variable {envVarName} is set to {secretValue.MaskSecret()}");
            }
            else
                Console.WriteLine($"[WARNING] Environment Variable {envVarName} is already set to {existingValue.MaskSecret()}, ignoring secret {secretValue.MaskSecret()}");

            secretEnvironmentVariableMappings.Remove(normalizedName);
            return true;
        }

        return false;
    }

    static bool applySecretToConfigurations(Dictionary<string, string> secretConfigurationMappings,
        WebApplicationBuilder builder, string secretName, string secretValue, string prefix = "")
    {
        string normalizedName = secretName;
        if (!string.IsNullOrEmpty(prefix) && secretName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            normalizedName = secretName.Substring(prefix.Length);

        if (secretConfigurationMappings.TryGetValue(normalizedName, out string configurationName))
        {
            string existingValue = builder.Configuration[configurationName];

            if (string.IsNullOrWhiteSpace(existingValue))
            {
                builder.Configuration[configurationName] = secretValue;
                Console.WriteLine($"[INFO] Configuration {configurationName} is set to {secretValue.MaskSecret()}");
            }
            else
                Console.WriteLine($"[WARNING] Configuration {configurationName} is already set to {existingValue.MaskSecret()}, ignoring secret {secretValue.MaskSecret()}");

            secretConfigurationMappings.Remove(normalizedName);
            return true;
        }

        return false;
    }

    public static void LoadAndApplySecrets(WebApplicationBuilder builder, string secretsPath, string prefix)
    {
        try
        {
            if (!Directory.Exists(secretsPath))
            {
                Console.WriteLine($"[WARNING] Secrets folder not found: {secretsPath}");
                return;
            }

            var secretFiles = Directory.GetFiles(secretsPath);

            if (secretFiles.Length == 0)
            {
                Console.WriteLine("[WARNING] No secrets found in folder.");
                return;
            }

            Dictionary<string, string> secretEnvironmentVariableMappings = new(StringComparer.OrdinalIgnoreCase)
            {
                { "claude_api_key", "CLAUDE_API_KEY" },
                { "openai_api_key", "OPENAI_API_KEY" }
            };
            Dictionary<string, string> secretConfigurationMappings = new(StringComparer.OrdinalIgnoreCase)
            {
                { "tracking-api-token", "PostHog:ProjectApiKey" },
                { "unleash-key-server-side", "Unleash:ApiKey" }
            };

            foreach (var file in secretFiles)
            {
                string secretName = Path.GetFileName(file);
                string secretValue = File.ReadAllText(file).Trim();

                if (string.IsNullOrEmpty(secretValue))
                    Console.WriteLine($"[WARNING] Secret: {secretName} has no value");
                else
                {
                    if (!applySecretToEnvironmentVariables(secretEnvironmentVariableMappings, secretName, secretValue, prefix)
                        && !applySecretToConfigurations(secretConfigurationMappings, builder, secretName, secretValue, prefix))
                    { /* Console.WriteLine($"[WARNING] No Mapping for Secret: {secretName} = {secretValue.MaskSecret()}"); */ }
                }
            }

            if (secretEnvironmentVariableMappings.Count > 0)
                foreach (var k in secretEnvironmentVariableMappings.Keys.OrderBy(k => k))
                    Console.WriteLine($"[WARNING] {k} expected secret not found for Environment Variable {secretEnvironmentVariableMappings[k]}");
            if (secretConfigurationMappings.Count > 0)
                foreach (var k in secretConfigurationMappings.Keys.OrderBy(k => k))
                    Console.WriteLine($"[WARNING] {k} expected secret not found for Configuration {secretConfigurationMappings[k]}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error while reading secrets: {ex.Message}");
        }
    }

    public static void LoadAndApplySecrets(WebApplicationBuilder builder)
    {
        string secretsPath = "/run/secrets";
        try
        {
            string serverName = Environment.GetEnvironmentVariable("SECRETS_PREFIX");

            if (!string.IsNullOrEmpty(serverName))
            {
                Console.WriteLine($"[INFO] SECRETS_PREFIX detected: {serverName}, using as prefix.");
                LoadAndApplySecrets(builder, secretsPath, serverName);
                return;
            }
        }
        catch { }

        LoadAndApplySecrets(builder, secretsPath, string.Empty);
    }
}
