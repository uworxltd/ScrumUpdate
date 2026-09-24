// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using KhojiGenAIServer.Data;
using Microsoft.EntityFrameworkCore;

namespace Uworx.Khoji.Tests.Base;

abstract class DatabaseTestFixture : IDisposable
{
    protected KGSDbContext DbContext { get; private set; }

    [SetUp]
    public virtual void SetUpDatabase()
    {
        var options = new DbContextOptionsBuilder<KGSDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        DbContext = new KGSDbContext(options, dontLetItDispose: true);
        DbContext.Database.EnsureCreated();
    }

    [TearDown]
    public virtual void TearDownDatabase()
    {
        DbContext?.Database.EnsureDeleted();
        DbContext?.Dispose();
    }

    public void Dispose()
    {
        TearDownDatabase();
        GC.SuppressFinalize(this);
    }

    protected TeamUserPreference AddTeamUserPreference(string aadObjectId,
        int? preferredInstanceId = null)
    {
        var preference = new TeamUserPreference
        {
            MsftTeamsAadObjectId = aadObjectId,
            PreferredInstanceId = preferredInstanceId
        };

        DbContext.Set<TeamUserPreference>().Add(preference);
        DbContext.SaveChanges();

        return preference;
    }

    protected DistributedCacheEntry AddCacheEntry(string key, byte[] value,
        DateTimeOffset? expiresAt = null)
    {
        var entry = new DistributedCacheEntry
        {
            Key = key,
            Value = value,
            ExpiresAt = expiresAt
        };

        DbContext.Set<DistributedCacheEntry>().Add(entry);
        DbContext.SaveChanges();

        return entry;
    }

    protected ProactiveSubscription AddProactiveSubscription(string serviceType, string channelId, int instanceId,
        string? userEmail = null)
    {
        var subscription = new ProactiveSubscription
        {
            SubscriptionId = Guid.NewGuid(),
            ServiceType = serviceType,
            ChannelId = channelId,
            InstanceId = instanceId,
            UserEmail = userEmail,
            Created = DateTime.UtcNow
        };

        DbContext.Set<ProactiveSubscription>().Add(subscription);
        DbContext.SaveChanges();

        return subscription;
    }

    protected StoredKeyValue AddStoredKeyValue(string key,
        int order = 0,
        string dictionaryName = "default",
        string valueType = "string",
        string valueJson = "")
    {
        var keyValue = new StoredKeyValue
        {
            Key = key,
            Order = order,
            DictionaryName = dictionaryName,
            ValueType = valueType,
            ValueJson = valueJson
        };

        DbContext.Set<StoredKeyValue>().Add(keyValue);
        DbContext.SaveChanges();

        return keyValue;
    }

    protected void RefreshContext()
    {
        DbContext.ChangeTracker.Clear();
    }
}
