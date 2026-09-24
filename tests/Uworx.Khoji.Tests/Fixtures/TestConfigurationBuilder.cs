// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.Extensions.Configuration;

namespace Uworx.Khoji.Tests.Fixtures;

class TestConfigurationBuilder
{
    readonly Dictionary<string, string?> values = new();

    public TestConfigurationBuilder()
    {
        WithUnleashDefaults()
            .WithDatabaseDefaults()
            .WithPosthogDefaults()
            .WithLlmDefaults()
            .WithBaseUrlDefaults();
    }

    public TestConfigurationBuilder WithUnleashDefaults()
    {
        values["Unleash:ApiKey"] = "test-api-key-12345";
        values["Unleash:HostUrl"] = "http://localhost:8080";
        return this;
    }

    public TestConfigurationBuilder WithDatabaseDefaults()
    {
        values["ConnectionStrings:DefaultConnection"] = "Server=localhost;Port=5432;Username=test;Password=test;Database=test";
        return this;
    }

    public TestConfigurationBuilder WithPosthogDefaults()
    {
        values["PostHog:ProjectApiKey"] = "test-posthog-key";
        values["PostHog:ApiHost"] = "https://app.posthog.com";
        return this;
    }

    public TestConfigurationBuilder WithLlmDefaults()
    {
        values["CLAUDE_API_KEY"] = "sk-ant-test-key";
        values["OPENAI_API_KEY"] = "sk-test-key";
        return this;
    }

    public TestConfigurationBuilder WithBaseUrlDefaults()
    {
        values["KHOJIX_BASE_URL"] = "https://app.scrumupdate.com";
        values["KHOJIX_BUSINESS_SERVER_URL"] = "http://kbs:4243";
        values["MCP_ATLASSIAN_URL"] = "http://mcp-atlassian:4001/mcp/";
        return this;
    }

    public TestConfigurationBuilder WithUnleash(string apiKey, string hostUrl)
    {
        values["Unleash:ApiKey"] = apiKey;
        values["Unleash:HostUrl"] = hostUrl;
        return this;
    }

    public TestConfigurationBuilder WithUnleashDisabled()
    {
        values["Unleash:ApiKey"] = "";
        values["Unleash:HostUrl"] = "";
        return this;
    }

    public TestConfigurationBuilder WithDatabase(string connectionString)
    {
        values["ConnectionStrings:DefaultConnection"] = connectionString;
        return this;
    }

    public TestConfigurationBuilder WithValue(string key, string? value)
    {
        values[key] = value;
        return this;
    }

    public IConfiguration Build()
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }

    public Dictionary<string, string?> GetValues() => new(values);
}
