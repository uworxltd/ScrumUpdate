// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Unit)]
class UworxConstantsTests
{
    const string ConnEnvVar = "ConnectionStrings__DefaultConnection";
    const string BaselineEnvVar = "KHOJIX_BASE_URL";
    const string BusinessServerEnvVar = "KHOJIX_BUSINESS_SERVER_URL";
    const string BasicAuthUserEnvVar = "KHOJI_BASICAUTHUSERNAME";
    const string BasicAuthPassEnvVar = "KHOJI_BASICAUTHUSERPASSWORD";

    [Test]
    public void DatabaseConnectionString_ReadsConnectionStringsEnvVar()
    {
        // Arrange
        const string expected = "Host=test-host;Port=5432;Username=test;Password=test;Database=test";
        var previous = Environment.GetEnvironmentVariable(ConnEnvVar);

        try
        {
            Environment.SetEnvironmentVariable(ConnEnvVar, expected);

            // Act
            var actual = KhojiGenAIServer.KhojiConstants.DatabaseConnectionString;

            // Assert
            Assert.That(actual, Is.EqualTo(expected));
        }
        finally
        {
            Environment.SetEnvironmentVariable(ConnEnvVar, previous);
        }
    }

    [Test]
    public void DatabaseConnectionString_FallsBackToStandardConfiguration()
    {
        // Arrange
        const string fromConfig = "Host=from-config;Port=5432;Database=cfg";
        var previous = Environment.GetEnvironmentVariable(ConnEnvVar);

        try
        {
            Environment.SetEnvironmentVariable(ConnEnvVar, null);
            KhojiGenAIServer.KhojiConstants.InitializeDatabaseConnectionString(fromConfig);

            // Act
            var actual = KhojiGenAIServer.KhojiConstants.DatabaseConnectionString;

            // Assert
            Assert.That(actual, Is.EqualTo(fromConfig));
        }
        finally
        {
            KhojiGenAIServer.KhojiConstants.InitializeDatabaseConnectionString(null);
            Environment.SetEnvironmentVariable(ConnEnvVar, previous);
        }
    }

    [Test]
    public void DatabaseConnectionString_ThrowsWhenEnvVarMissing()
    {
        // Arrange
        var previous = Environment.GetEnvironmentVariable(ConnEnvVar);
        try
        {
            Environment.SetEnvironmentVariable(ConnEnvVar, null);

            // Act / Assert
            Assert.Throws<InvalidOperationException>(
                () => _ = KhojiGenAIServer.KhojiConstants.DatabaseConnectionString);
        }
        finally
        {
            Environment.SetEnvironmentVariable(ConnEnvVar, previous);
        }
    }

    [Test]
    public void DatabaseConnectionString_ThrowsWhenEnvVarBlank()
    {
        // Arrange
        var previous = Environment.GetEnvironmentVariable(ConnEnvVar);
        try
        {
            Environment.SetEnvironmentVariable(ConnEnvVar, "   ");

            // Act / Assert
            Assert.Throws<InvalidOperationException>(
                () => _ = KhojiGenAIServer.KhojiConstants.DatabaseConnectionString);
        }
        finally
        {
            Environment.SetEnvironmentVariable(ConnEnvVar, previous);
        }
    }

    [Test]
    public void KhojiXBaseUrl_ReadsEnvVar()
    {
        // Arrange
        const string expected = "http://localhost:4241";
        var previous = Environment.GetEnvironmentVariable(BaselineEnvVar);

        try
        {
            Environment.SetEnvironmentVariable(BaselineEnvVar, expected);

            // Act / Assert
            Assert.That(KhojiGenAIServer.KhojiConstants.KhojiXBaseUrl, Is.EqualTo(expected));
        }
        finally
        {
            Environment.SetEnvironmentVariable(BaselineEnvVar, previous);
        }
    }

    [Test]
    public void KhojiXBaseUrl_ThrowsWhenEnvVarMissing()
    {
        // Arrange
        var previous = Environment.GetEnvironmentVariable(BaselineEnvVar);
        try
        {
            Environment.SetEnvironmentVariable(BaselineEnvVar, null);

            // Act / Assert
            Assert.Throws<InvalidOperationException>(
                () => _ = KhojiGenAIServer.KhojiConstants.KhojiXBaseUrl);
        }
        finally
        {
            Environment.SetEnvironmentVariable(BaselineEnvVar, previous);
        }
    }

    [Test]
    public void KhojiXBusinessServerUrl_ReadsEnvVar()
    {
        // Arrange
        const string expected = "http://kbs:4243";
        var previous = Environment.GetEnvironmentVariable(BusinessServerEnvVar);

        try
        {
            Environment.SetEnvironmentVariable(BusinessServerEnvVar, expected);

            // Act / Assert
            Assert.That(KhojiGenAIServer.KhojiConstants.KhojiXBusinessServerUrl, Is.EqualTo(expected));
        }
        finally
        {
            Environment.SetEnvironmentVariable(BusinessServerEnvVar, previous);
        }
    }

    [Test]
    public void KhojiXBusinessServerUrl_ThrowsWhenEnvVarMissing()
    {
        // Arrange
        var previous = Environment.GetEnvironmentVariable(BusinessServerEnvVar);
        try
        {
            Environment.SetEnvironmentVariable(BusinessServerEnvVar, null);

            // Act / Assert
            Assert.Throws<InvalidOperationException>(
                () => _ = KhojiGenAIServer.KhojiConstants.KhojiXBusinessServerUrl);
        }
        finally
        {
            Environment.SetEnvironmentVariable(BusinessServerEnvVar, previous);
        }
    }

    [Test]
    public void KhojiXBasicAuthUsername_ThrowsWhenEnvVarMissing()
    {
        // Arrange
        var previous = Environment.GetEnvironmentVariable(BasicAuthUserEnvVar);
        try
        {
            Environment.SetEnvironmentVariable(BasicAuthUserEnvVar, null);

            // Act / Assert
            Assert.Throws<InvalidOperationException>(
                () => _ = KhojiGenAIServer.KhojiConstants.KhojiXBasicAuthUsername);
        }
        finally
        {
            Environment.SetEnvironmentVariable(BasicAuthUserEnvVar, previous);
        }
    }

    [Test]
    public void KhojiXBasicAuthPassword_ThrowsWhenEnvVarMissing()
    {
        // Arrange
        var previous = Environment.GetEnvironmentVariable(BasicAuthPassEnvVar);
        try
        {
            Environment.SetEnvironmentVariable(BasicAuthPassEnvVar, null);

            // Act / Assert
            Assert.Throws<InvalidOperationException>(
                () => _ = KhojiGenAIServer.KhojiConstants.KhojiXBasicAuthPassword);
        }
        finally
        {
            Environment.SetEnvironmentVariable(BasicAuthPassEnvVar, previous);
        }
    }

    [Test]
    public void KhojiXBasicCreds_UsesBasicAuthProperties()
    {
        // Arrange
        var previousUser = Environment.GetEnvironmentVariable(BasicAuthUserEnvVar);
        var previousPass = Environment.GetEnvironmentVariable(BasicAuthPassEnvVar);
        const string expected = "dXNlckBleGFtcGxlLmNvbTpzM2NyZXQ="; // base64("user@example.com:s3cret")

        try
        {
            Environment.SetEnvironmentVariable(BasicAuthUserEnvVar, "user@example.com");
            Environment.SetEnvironmentVariable(BasicAuthPassEnvVar, "s3cret");

            // Act / Assert
            Assert.That(KhojiGenAIServer.KhojiConstants.KhojiXBasicCreds, Is.EqualTo(expected));
        }
        finally
        {
            Environment.SetEnvironmentVariable(BasicAuthUserEnvVar, previousUser);
            Environment.SetEnvironmentVariable(BasicAuthPassEnvVar, previousPass);
        }
    }
}