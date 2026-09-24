// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

//namespace Uworx.Khoji.Tests;

//[TestFixture, Category(TestCatory.Unit)]
//public class DockerSecretsManagerTests
//{
//    [SetUp]
//    public void SetUp()
//    {
//        Environment.SetEnvironmentVariable("POSTGRES_USER", null);
//        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);
//        Environment.SetEnvironmentVariable("POSTGRES_DB", null);
//    }

//    [Test]
//    public void applySecretToEnvironmentVariable_NoPrefix_ShouldMapDirectly()
//    {
//        // Arrange
//        string secretName = "database_user";
//        string secretValue = "testuser";

//        // Act
//        DockerSecretsManager.applySecretToEnvironmentVariable(secretName, secretValue, "");

//        // Assert
//        Assert.That(Environment.GetEnvironmentVariable("POSTGRES_USER"), Is.EqualTo("testuser"));
//    }

//    [Test]
//    public void applySecretToEnvironmentVariable_WithMatchingPrefix_ShouldStripPrefix()
//    {
//        string secretName = "app_database_user";
//        string secretValue = "prefixuser";

//        DockerSecretsManager.applySecretToEnvironmentVariable(secretName, secretValue, "app_");

//        Assert.That(Environment.GetEnvironmentVariable("POSTGRES_USER"), Is.EqualTo("prefixuser"));
//    }

//    [Test]
//    public void applySecretToEnvironmentVariable_WithNonMatchingPrefix_ShouldNotMap()
//    {
//        string secretName = "other_database_user";
//        string secretValue = "ignoreduser";

//        DockerSecretsManager.applySecretToEnvironmentVariable(secretName, secretValue, "app_");

//        Assert.That(Environment.GetEnvironmentVariable("POSTGRES_USER"), Is.Null);
//    }

//    [Test]
//    public void applySecretToEnvironmentVariable_NoMapping_ShouldNotCreateEnvVar()
//    {
//        string secretName = "unmapped_secret";
//        string secretValue = "somevalue";

//        DockerSecretsManager.applySecretToEnvironmentVariable(secretName, secretValue, "");

//        Assert.That(Environment.GetEnvironmentVariable("unmapped_secret"), Is.Null);
//    }

//    [Test]
//    public void applySecretToEnvironmentVariable_ExistingEnvVar_ShouldOverwrite()
//    {
//        Environment.SetEnvironmentVariable("POSTGRES_USER", "dummy");

//        string secretName = "database_user";
//        string secretValue = "newuser";

//        DockerSecretsManager.applySecretToEnvironmentVariable(secretName, secretValue, "");

//        Assert.That(Environment.GetEnvironmentVariable("POSTGRES_USER"), Is.EqualTo("newuser"));
//    }
//}