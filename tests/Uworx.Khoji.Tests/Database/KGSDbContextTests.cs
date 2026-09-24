// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using Uworx.Khoji.Tests.Base;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests.Database;

[TestFixture, Category(TestCatory.Unit)]
class KGSDbContextTests : DatabaseTestFixture
{
    [Test]
    public void TeamUserPreference_CanBeAdded()
    {
        // Arrange
        var aadObjectId = "user-123";
        var preferredInstanceId = 5;

        // Act
        var preference = base.AddTeamUserPreference(aadObjectId, preferredInstanceId);

        // Assert
        Assert.That(preference, Is.Not.Null);
        Assert.That(preference.MsftTeamsAadObjectId, Is.EqualTo(aadObjectId));
        Assert.That(preference.PreferredInstanceId, Is.EqualTo(preferredInstanceId));
        Assert.That(preference.Id, Is.GreaterThan(0));
    }

    [Test]
    public void TeamUserPreference_CanBeRetrieved()
    {
        // Arrange
        var aadObjectId = "user-456";
        base.AddTeamUserPreference(aadObjectId);

        // Act
        var retrieved = base.DbContext.Set<TeamUserPreference>()
            .FirstOrDefault(p => p.MsftTeamsAadObjectId == aadObjectId);

        // Assert
        Assert.That(retrieved, Is.Not.Null);
        Assert.That(retrieved.MsftTeamsAadObjectId, Is.EqualTo(aadObjectId));
    }

    [Test]
    public void TeamUserPreference_WithoutInstanceId_IsNull()
    {
        // Arrange
        var aadObjectId = "user-789";

        // Act
        var preference = base.AddTeamUserPreference(aadObjectId);

        // Assert
        Assert.That(preference.PreferredInstanceId, Is.Null);
    }

    [Test]
    public void TeamUserPreference_CanBeUpdated()
    {
        // Arrange
        var aadObjectId = "user-update";
        var preference = base.AddTeamUserPreference(aadObjectId, 1);

        // Act
        preference.PreferredInstanceId = 10;
        DbContext.SaveChanges();
        RefreshContext();

        var updated = base.DbContext.Set<TeamUserPreference>()
            .First(p => p.MsftTeamsAadObjectId == aadObjectId);

        // Assert
        Assert.That(updated.PreferredInstanceId, Is.EqualTo(10));
    }

    [Test]
    public void ProactiveSubscription_CanBeAdded()
    {
        // Arrange
        var serviceType = "scrum-watch";
        var channelId = "channel-123";
        var instanceId = 42;

        // Act
        var subscription = base.AddProactiveSubscription(serviceType, channelId, instanceId);

        // Assert
        Assert.That(subscription, Is.Not.Null);
        Assert.That(subscription.ServiceType, Is.EqualTo(serviceType));
        Assert.That(subscription.ChannelId, Is.EqualTo(channelId));
        Assert.That(subscription.InstanceId, Is.EqualTo(instanceId));
    }

    [Test]
    public void ProactiveSubscription_CanBeRetrieved()
    {
        // Arrange
        var serviceType = "sprint-watch";
        var channelId = "channel-456";
        var instanceId = 99;
        base.AddProactiveSubscription(serviceType, channelId, instanceId);

        // Act
        var retrieved = base.DbContext.Set<ProactiveSubscription>()
            .FirstOrDefault(s => s.ChannelId == channelId);

        // Assert
        Assert.That(retrieved, Is.Not.Null);
        Assert.That(retrieved.ServiceType, Is.EqualTo(serviceType));
        Assert.That(retrieved.InstanceId, Is.EqualTo(instanceId));
    }

    [Test]
    public void ProactiveSubscription_WithUserEmail_StoresEmail()
    {
        // Arrange
        var userEmail = "user@example.com";

        // Act
        var subscription = base.AddProactiveSubscription("test-service", "channel-1", 1, userEmail);

        // Assert
        Assert.That(subscription.UserEmail, Is.EqualTo(userEmail));
    }

    [Test]
    public void ProactiveSubscription_TrackingProperties_AreSet()
    {
        // Arrange & Act
        var subscription = base.AddProactiveSubscription("service", "channel", 1);

        // Assert
        Assert.That(subscription.Created, Is.Not.EqualTo(default(DateTime)));
        Assert.That(subscription.Updated, Is.Null);
        Assert.That(subscription.ConsecutiveFailureCount, Is.EqualTo(0));
    }

    [Test]
    public void DistributedCacheEntry_CanBeAdded()
    {
        // Arrange
        var key = "cache-key-123";
        var value = new byte[] { 1, 2, 3, 4, 5 };

        // Act
        var entry = base.AddCacheEntry(key, value);

        // Assert
        Assert.That(entry, Is.Not.Null);
        Assert.That(entry.Key, Is.EqualTo(key));
        Assert.That(entry.Value, Is.EqualTo(value));
    }

    [Test]
    public void DistributedCacheEntry_CanBeRetrieved()
    {
        // Arrange
        var key = "cache-retrieve";
        var value = new byte[] { 10, 20, 30 };
        base.AddCacheEntry(key, value);

        // Act
        var retrieved = base.DbContext.Set<DistributedCacheEntry>()
            .FirstOrDefault(e => e.Key == key);

        // Assert
        Assert.That(retrieved, Is.Not.Null);
        Assert.That(retrieved.Value, Is.EqualTo(value));
    }

    [Test]
    public void DistributedCacheEntry_WithExpiration_StoresExpirationDate()
    {
        // Arrange
        var key = "cache-expiring";
        var value = new byte[] { 99 };
        var expiresAt = DateTimeOffset.UtcNow.AddHours(1);

        // Act
        var entry = base.AddCacheEntry(key, value, expiresAt);

        // Assert
        Assert.That(entry.ExpiresAt, Is.EqualTo(expiresAt));
    }

    [Test]
    public void StoredKeyValue_CanBeAdded()
    {
        // Arrange
        var key = "stored-key-1";
        var value = "{\"test\": \"value\"}";

        // Act
        var stored = base.AddStoredKeyValue(key, 1, "test-dict", "json", value);

        // Assert
        Assert.That(stored, Is.Not.Null);
        Assert.That(stored.Key, Is.EqualTo(key));
        Assert.That(stored.ValueJson, Is.EqualTo(value));
    }

    [Test]
    public void StoredKeyValue_CanBeRetrieved()
    {
        // Arrange
        var key = "stored-retrieve";
        base.AddStoredKeyValue(key, 0, "dict", "string", "test-value");

        // Act
        var retrieved = base.DbContext.Set<StoredKeyValue>()
            .FirstOrDefault(kv => kv.Key == key);

        // Assert
        Assert.That(retrieved, Is.Not.Null);
        Assert.That(retrieved.ValueJson, Is.EqualTo("test-value"));
    }

    [Test]
    public void MultipleEntities_CanCoexist()
    {
        // Act
        var preference = base.AddTeamUserPreference("user-1");
        var subscription = base.AddProactiveSubscription("service", "channel", 1);
        var cache = base.AddCacheEntry("key", new byte[] { 1, 2, 3 });

        // Assert
        Assert.That(base.DbContext.Set<TeamUserPreference>().Count(), Is.EqualTo(1));
        Assert.That(base.DbContext.Set<ProactiveSubscription>().Count(), Is.EqualTo(1));
        Assert.That(base.DbContext.Set<DistributedCacheEntry>().Count(), Is.EqualTo(1));
    }

    [Test]
    public void DbContext_IsNotNull_AfterSetUp()
    {
        // Assert
        Assert.That(base.DbContext, Is.Not.Null);
    }

    [Test]
    public void InMemoryDatabase_IsUsed()
    {
        // Assert - Verify the in-memory database provider is being used
        Assert.That(base.DbContext.Database.ProviderName, Does.Contain("InMemory"));
    }
}
