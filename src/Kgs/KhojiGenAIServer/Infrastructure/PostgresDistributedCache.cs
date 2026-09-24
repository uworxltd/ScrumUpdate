// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using Microsoft.Extensions.Caching.Distributed;

namespace KhojiGenAIServer.Infrastructure;

class PostgresDistributedCache : IDistributedCache
{
    readonly KGSDbContext dbContext;

    public PostgresDistributedCache() =>
        this.dbContext = new KGSDbContext();

    bool isExpired(DistributedCacheEntry entry)
    {
        if (entry.ExpiresAt.HasValue && entry.ExpiresAt.Value < DateTimeOffset.UtcNow)
            return true;
        if (entry.AbsoluteExpiration.HasValue && entry.AbsoluteExpiration.Value < DateTimeOffset.UtcNow)
            return true;
        return false;
    }

    void setExpiration(DistributedCacheEntry entry, DistributedCacheEntryOptions options)
    {
        entry.AbsoluteExpiration = options.AbsoluteExpiration;
        entry.SlidingExpiration = options.SlidingExpiration;
        entry.ExpiresAt = options.AbsoluteExpirationRelativeToNow.HasValue
            ? DateTimeOffset.UtcNow.Add(options.AbsoluteExpirationRelativeToNow.Value)
            : (options.SlidingExpiration.HasValue
                ? DateTimeOffset.UtcNow.Add(options.SlidingExpiration.Value)
                : (DateTimeOffset?)null);
    }

    void refreshExpiration(DistributedCacheEntry entry)
    {
        if (entry.SlidingExpiration.HasValue)
            entry.ExpiresAt = DateTimeOffset.UtcNow.Add(entry.SlidingExpiration.Value);
    }

    public PostgresDistributedCache(string connectionString) =>
        this.dbContext = new KGSDbContext(connectionString);

    public byte[] Get(string key)
    {
        var entry = dbContext.DistributedCacheEntries.Find(key);
        if (entry == null || isExpired(entry))
            return null;
        refreshExpiration(entry);
        dbContext.SaveChanges();
        return entry.Value;
    }

    public async Task<byte[]> GetAsync(string key, CancellationToken token = default)
    {
        var entry = await dbContext.DistributedCacheEntries.FindAsync(new object[] { key }, token);
        if (entry == null || isExpired(entry))
            return null;
        refreshExpiration(entry);
        await dbContext.SaveChangesAsync(token);
        return entry.Value;
    }

    public void Refresh(string key)
    {
        var entry = dbContext.DistributedCacheEntries.Find(key);
        if (entry != null && !isExpired(entry))
        {
            refreshExpiration(entry);
            dbContext.SaveChanges();
        }
    }

    public async Task RefreshAsync(string key, CancellationToken token = default)
    {
        var entry = await dbContext.DistributedCacheEntries.FindAsync(new object[] { key }, token);
        if (entry != null && !isExpired(entry))
        {
            refreshExpiration(entry);
            await dbContext.SaveChangesAsync(token);
        }
    }

    public void Remove(string key)
    {
        var entry = dbContext.DistributedCacheEntries.Find(key);
        if (entry != null)
        {
            dbContext.DistributedCacheEntries.Remove(entry);
            dbContext.SaveChanges();
        }
    }

    public async Task RemoveAsync(string key, CancellationToken token = default)
    {
        var entry = await dbContext.DistributedCacheEntries.FindAsync(new object[] { key }, token);
        if (entry != null)
        {
            dbContext.DistributedCacheEntries.Remove(entry);
            await dbContext.SaveChangesAsync(token);
        }
    }

    public void Set(string key, byte[] value, DistributedCacheEntryOptions options)
    {
        var entry = dbContext.DistributedCacheEntries.Find(key);
        if (entry == null)
        {
            entry = new DistributedCacheEntry { Key = key };
            dbContext.DistributedCacheEntries.Add(entry);
        }
        entry.Value = value;
        setExpiration(entry, options);
        dbContext.SaveChanges();
    }

    public async Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
    {
        var entry = await dbContext.DistributedCacheEntries.FindAsync(new object[] { key }, token);
        if (entry == null)
        {
            entry = new DistributedCacheEntry { Key = key };
            await dbContext.DistributedCacheEntries.AddAsync(entry, token);
        }
        entry.Value = value;
        setExpiration(entry, options);
        await dbContext.SaveChangesAsync(token);
    }
}