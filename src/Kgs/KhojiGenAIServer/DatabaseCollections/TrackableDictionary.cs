// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Abstractions;
using KhojiGenAIServer.Data;
using System.Text.Json;

namespace KhojiGenAIServer.DatabaseCollections;

// public because of tests
public class TrackableDictionary<TValue> : SortedDictionary<string, TValue>
{
    readonly ILogger logger;
    readonly string connectionString;
    readonly int instanceId;
    readonly string dictionaryName;

    public event Action<TValue> OnAddition = null;
    public event Action<TValue> OnRemoval = null;
    public event Action<TValue, string> OnDifference = null;

    public TrackableDictionary(ILogger logger,
        string connectionString, int instanceId, string dictionaryName)
    {
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
        this.connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
        this.instanceId = instanceId;
        this.dictionaryName = dictionaryName ?? throw new ArgumentNullException(nameof(dictionaryName));

        loadFromDatabase();
    }

    void loadFromDatabase()
    {
        using var db = new KGSDbContext(this.connectionString);
        var storedItems = db.StoredKeyValues
            .Where(x => x.InstanceId == instanceId && x.DictionaryName == dictionaryName)
            .OrderBy(x => x.Order)
            .ToList();

        Clear();

        foreach (var item in storedItems)
        {
            try
            {
                var key = item.Key;

                var valueType = Type.GetType(item.ValueType);
                if (valueType == null) continue;

                var value = JsonSerializer.Deserialize(item.ValueJson, valueType);
                if (value is TValue typedValue)
                    base.Add(key, typedValue);
            }
            catch (Exception ex)
            {
                // Log error but continue loading other items
                logger.LogError($"[{dictionaryName}] Failed to load item with key {item.Key}: {ex.Message}");
            }
        }
    }

    public async Task SaveChangesAsync()
    {
        using var db = new KGSDbContext(this.connectionString);
        var existingEntries = db.StoredKeyValues
            .Where(x => x.InstanceId == instanceId && x.DictionaryName == dictionaryName);
        db.StoredKeyValues.RemoveRange(existingEntries);

        int order = 0;
        foreach (var kvp in this.OrderBy(v => v.Key))
        {
            var valueType = kvp.Value?.GetType() ?? typeof(TValue);
            var storedItem = new StoredKeyValue
            {
                InstanceId = instanceId,
                DictionaryName = dictionaryName,
                Key = kvp.Key,
                Order = order++,
                ValueType = valueType.AssemblyQualifiedName ?? valueType.FullName ?? valueType.Name,
                ValueJson = JsonSerializer.Serialize(kvp.Value, valueType),
            };

            db.StoredKeyValues.Add(storedItem);
        }

        await db.SaveChangesAsync();
    }

    public async Task ReplaceWithAsync<T>(IEnumerable<T> source,
        Func<T, string> keySelector,
        Func<T, TValue> valueSelector)
    {
        this.DiffWith(source, keySelector, valueSelector,
            onAddition: (k, v) => OnAddition?.Invoke(v),
            onRemoval: (k, v) => OnRemoval?.Invoke(v),
            onDifference: (k, v, message) => OnDifference?.Invoke(v, message)
        );

        this.Clear();
        foreach (var v in source)
            this.Add(keySelector(v), valueSelector(v));

        await SaveChangesAsync();
    }

    public async Task ReplaceWithAsync<T>(IEnumerable<T> source,
        Func<T, string> keySelector) where T : TValue
    {
        this.DiffWith(source, keySelector, t => t,
            onAddition: (k, v) => OnAddition?.Invoke(v),
            onRemoval: (k, v) => OnRemoval?.Invoke(v),
            onDifference: (k, v, message) => OnDifference?.Invoke(v, message)
        );

        this.Clear();
        foreach (var v in source)
            this.Add(keySelector(v), v);

        await SaveChangesAsync();
    }

    public async Task ReplaceWithAsync(IDictionary<string, TValue> source)
    {
        this.DiffWith(source.ToArray(), i => i.Key, i => i.Value,
            onAddition: (k, v) => OnAddition?.Invoke(v),
            onRemoval: (k, v) => OnRemoval?.Invoke(v),
            onDifference: (k, v, message) => OnDifference?.Invoke(v, message)
        );

        this.Clear();
        foreach (var v in source)
            this.Add(v.Key, v.Value);

        await SaveChangesAsync();
    }

    public async Task AddAndSaveAsync(string key, TValue value)
    {
        Add(key, value);
        await SaveChangesAsync();
    }

    public async Task RemoveAndSaveAsync(string key)
    {
        if (Remove(key))
            await SaveChangesAsync();
    }

    public void Reload() => // Reload from database (useful if data might have changed externally)
        loadFromDatabase();

    // Override Add/Remove methods to provide immediate persistence options?
}