// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Uworx.Khoji.Tests.Fixtures;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests.Infrastructure;

[TestFixture, Category(TestCatory.Unit)]
public class ConfigurationTests
{
    TestConfigurationBuilder configBuilder = new();

    [Test]
    public void Configuration_WithDefaults_ContainsUnleashSettings()
    {
        // Arrange & Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["Unleash:ApiKey"], Is.Not.Null.And.Not.Empty);
        Assert.That(config["Unleash:HostUrl"], Is.Not.Null.And.Not.Empty);
    }

    [Test]
    public void Configuration_WithDefaults_ContainsDatabaseSettings()
    {
        // Arrange & Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["ConnectionStrings:DefaultConnection"], Is.Not.Null.And.Not.Empty);
    }

    [Test]
    public void Configuration_WithDefaults_ContainsLlmKeys()
    {
        // Arrange & Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["CLAUDE_API_KEY"], Is.Not.Null.And.Not.Empty);
        Assert.That(config["OPENAI_API_KEY"], Is.Not.Null.And.Not.Empty);
    }

    [Test]
    public void Configuration_WithDefaults_ContainsBaseUrls()
    {
        // Arrange & Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["KHOJIX_BASE_URL"], Is.Not.Null.And.Not.Empty);
        Assert.That(config["KHOJIX_BUSINESS_SERVER_URL"], Is.Not.Null.And.Not.Empty);
        Assert.That(config["MCP_ATLASSIAN_URL"], Is.Not.Null.And.Not.Empty);
    }

    [Test]
    public void Configuration_CanOverrideUnleashSettings()
    {
        // Arrange
        var apiKey = "custom-api-key-xyz";
        var hostUrl = "http://custom-unleash:8080";
        configBuilder.WithUnleash(apiKey, hostUrl);

        // Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["Unleash:ApiKey"], Is.EqualTo(apiKey));
        Assert.That(config["Unleash:HostUrl"], Is.EqualTo(hostUrl));
    }

    [Test]
    public void Configuration_CanDisableUnleash()
    {
        // Arrange
        configBuilder.WithUnleashDisabled();

        // Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["Unleash:ApiKey"], Is.Empty);
        Assert.That(config["Unleash:HostUrl"], Is.Empty);
    }

    [Test]
    public void Configuration_CanOverrideDatabaseConnection()
    {
        // Arrange
        var customConnection = "Server=custom-server;Port=5433;Username=admin;Password=secret;Database=custom-db";
        configBuilder.WithDatabase(customConnection);

        // Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["ConnectionStrings:DefaultConnection"], Is.EqualTo(customConnection));
    }

    [Test]
    public void Configuration_CanSetCustomValue()
    {
        // Arrange
        configBuilder.WithValue("Custom:Setting", "custom-value");

        // Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["Custom:Setting"], Is.EqualTo("custom-value"));
    }

    [Test]
    public void Configuration_CanSetMultipleCustomValues()
    {
        // Arrange
        configBuilder
            .WithValue("Setting1", "value1")
            .WithValue("Setting2", "value2")
            .WithValue("Setting3", "value3");

        // Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["Setting1"], Is.EqualTo("value1"));
        Assert.That(config["Setting2"], Is.EqualTo("value2"));
        Assert.That(config["Setting3"], Is.EqualTo("value3"));
    }

    [Test]
    public void Configuration_OverridesDefaults()
    {
        // Arrange
        var customUrl = "http://localhost:9999";
        configBuilder
            .WithUnleashDefaults()
            .WithUnleash("override-key", customUrl);

        // Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["Unleash:ApiKey"], Is.EqualTo("override-key"));
        Assert.That(config["Unleash:HostUrl"], Is.EqualTo(customUrl));
    }

    [Test]
    public void Configuration_ValueCanBeNull()
    {
        // Arrange
        configBuilder.WithValue("NullSetting", null);

        // Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["NullSetting"], Is.Null);
    }

    [Test]
    public void Configuration_GetValues_ReturnsAllConfiguredValues()
    {
        // Arrange
        configBuilder
            .WithValue("Custom1", "val1")
            .WithValue("Custom2", "val2");

        // Act
        var values = configBuilder.GetValues();

        // Assert
        Assert.That(values, Contains.Key("Unleash:ApiKey"));
        Assert.That(values, Contains.Key("ConnectionStrings:DefaultConnection"));
        Assert.That(values, Contains.Key("Custom1"));
        Assert.That(values, Contains.Key("Custom2"));
    }

    [Test]
    public void Configuration_PostHogDefaults_AreConfigured()
    {
        // Arrange & Act
        var config = configBuilder.Build();

        // Assert
        Assert.That(config["PostHog:ProjectApiKey"], Is.Not.Null.And.Not.Empty);
        Assert.That(config["PostHog:ApiHost"], Is.Not.Null.And.Not.Empty);
    }

    [Test]
    public void Configuration_BuiltMultipleTimes_ProducesConsistentResults()
    {
        // Arrange
        configBuilder.WithValue("TestKey", "TestValue");

        // Act
        var config1 = configBuilder.Build();
        var config2 = configBuilder.Build();

        // Assert
        Assert.That(config1["TestKey"], Is.EqualTo(config2["TestKey"]));
    }
}
