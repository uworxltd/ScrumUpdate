// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using System.Collections;
using System.ComponentModel;
using System.Text.Json;

namespace KhojiGenAIServer.DatabaseCollections;

// public because of tests
public class PersistedDictionary<TKey, TValue> : IDictionary<TKey, TValue>
{
    readonly ILogger logger;
    readonly Func<KGSDbContext> createDbContext;
    readonly int instanceId;
    readonly string dictionaryName;

    public PersistedDictionary(ILogger logger, Func<KGSDbContext> createDbContext,
        int instanceId, string dictionaryName)
    {
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
        this.createDbContext = createDbContext ?? throw new ArgumentNullException(nameof(createDbContext));
        this.instanceId = instanceId;
        this.dictionaryName = dictionaryName ?? throw new ArgumentNullException(nameof(dictionaryName));
    }

    TKey convertKey(string keyString)
    {
        if (keyString == null)
            throw new ArgumentNullException(nameof(keyString));

        // Handle string type directly
        if (typeof(TKey) == typeof(string))
            return (TKey)(object)keyString;

        // Handle other primitive types using Convert
        try
        {
            // Try using Convert for common types first
            if (typeof(TKey).IsPrimitive || typeof(TKey) == typeof(decimal))
                return (TKey)Convert.ChangeType(keyString, typeof(TKey));

            // Try using TypeConverter
            var converter = TypeDescriptor.GetConverter(typeof(TKey));
            if (converter != null && converter.CanConvertFrom(typeof(string)))
                return (TKey)converter.ConvertFromString(keyString);

            // If TKey has a Parse method, use it
            var parseMethod = typeof(TKey).GetMethod("Parse", new[] { typeof(string) });
            if (parseMethod != null)
                return (TKey)parseMethod.Invoke(null, new object[] { keyString });

            throw new InvalidOperationException($"Cannot convert string to type {typeof(TKey).Name}");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to convert key '{keyString}' to type {typeof(TKey).Name}", ex);
        }
    }

    bool isValidItem(StoredKeyValue item)
    {
        try
        {
            var valueType = Type.GetType(item.ValueType);
            if (valueType == null) return false;

            var value = JsonSerializer.Deserialize(item.ValueJson, valueType);
            return value is TValue;
        }
        catch (Exception ex)
        {
            logger.LogError($"[{dictionaryName}] Invalid item with key {item.Key}: {ex.Message}");
            return false;
        }
    }

    StoredKeyValue createStoredKeyValue(TKey key, TValue value, int order)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));
        var valueType = value?.GetType() ?? typeof(TValue);

        return new StoredKeyValue
        {
            InstanceId = instanceId,
            DictionaryName = dictionaryName,
            Key = key.ToString() ?? throw new InvalidOperationException($"Key of type {typeof(TKey).Name} returned null from ToString()"),
            Order = order,
            ValueType = valueType.AssemblyQualifiedName ?? valueType.FullName ?? valueType.Name,
            ValueJson = JsonSerializer.Serialize(value, valueType)
        };
    }

    public void Add(TKey key, TValue value)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));
        if (ContainsKey(key))
            throw new ArgumentException($"An item with the same key has already been added. Key: {key}");

        try
        {
            using var db = this.createDbContext();

            // Get max order and increment
            var maxOrder = db.StoredKeyValues
                        .Where(x => x.InstanceId == instanceId && x.DictionaryName == dictionaryName)
                    .Max(x => (int?)x.Order) ?? -1;

            var storedItem = createStoredKeyValue(key, value, maxOrder + 1);
            db.StoredKeyValues.Add(storedItem);
            db.SaveChanges();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{dictionaryName}] Failed to persist item with key {key}: {ex.Message}");
            throw new ApplicationException($"[{dictionaryName}] Failed to persist item with key {key}", ex);
        }
    }

    public bool ContainsKey(TKey key)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));

        using var db = this.createDbContext();
        var item = db.StoredKeyValues.FirstOrDefault(x => x.InstanceId == instanceId &&
            x.DictionaryName == dictionaryName && x.Key == key.ToString());

        return item != null && isValidItem(item);
    }

    public bool Remove(TKey key)
    {
        if (key == null) throw new ArgumentNullException(nameof(key));

        try
        {
            using var db = this.createDbContext();

            var storedItem = db.StoredKeyValues.FirstOrDefault(x => x.InstanceId == instanceId
                && x.DictionaryName == dictionaryName && x.Key == key.ToString());

            if (storedItem != null)
            {
                db.StoredKeyValues.Remove(storedItem);
                db.SaveChanges();
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            logger.LogError($"[{dictionaryName}] Failed to remove item with key {key}: {ex.Message}");
            throw;
        }
    }

    public bool TryGetValue(TKey key, out TValue value)
    {
        value = default;
        if (key == null) throw new ArgumentNullException(nameof(key));

        try
        {
            using var db = this.createDbContext();
            var storedItem = db.StoredKeyValues.FirstOrDefault(x => x.InstanceId == instanceId
                && x.DictionaryName == dictionaryName && x.Key == key.ToString());

            if (storedItem == null || !isValidItem(storedItem)) return false;

            var valueType = Type.GetType(storedItem.ValueType);
            var deserializedValue = JsonSerializer.Deserialize(storedItem.ValueJson, valueType);
            if (deserializedValue is TValue typedValue)
            {
                value = typedValue;
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            logger.LogError($"[{dictionaryName}] Failed to get value for key {key}: {ex.Message}");
            return false;
        }
    }

    public void Clear()
    {
        try
        {
            using var db = this.createDbContext();
            var itemsToRemove = db.StoredKeyValues.Where(x => x.InstanceId == instanceId && x.DictionaryName == dictionaryName);
            db.StoredKeyValues.RemoveRange(itemsToRemove);
            db.SaveChanges();
        }
        catch (Exception ex)
        {
            logger.LogError($"[{dictionaryName}] Failed to clear dictionary: {ex.Message}");
            throw;
        }
    }

    public TValue this[TKey key]
    {
        get
        {
            if (TryGetValue(key, out var value))
                return value;
            throw new KeyNotFoundException($"Key '{key}' not found in dictionary '{dictionaryName}'");
        }
        set
        {
            using var db = this.createDbContext();
            var storedItem = db.StoredKeyValues
                  .FirstOrDefault(x => x.InstanceId == instanceId
           && x.DictionaryName == dictionaryName
               && x.Key == key.ToString());

            if (storedItem != null)
            {
                // Update existing item
                var valueType = value?.GetType() ?? typeof(TValue);
                storedItem.ValueType = valueType.AssemblyQualifiedName ?? valueType.FullName ?? valueType.Name;
                storedItem.ValueJson = JsonSerializer.Serialize(value, valueType);
                db.SaveChanges();
            }
            else
            {
                // Add new item
                Add(key, value);
            }
        }
    }

    public ICollection<TKey> Keys
    {
        get
        {
            using var db = this.createDbContext();
            return db.StoredKeyValues
          .Where(x => x.InstanceId == instanceId && x.DictionaryName == dictionaryName)
               .OrderBy(x => x.Order)
            .ToList()
            .Where(isValidItem)
                     .Select(x => convertKey(x.Key))
                .ToList();
        }
    }

    public ICollection<TValue> Values
    {
        get
        {
            using var db = this.createDbContext();
            var items = db.StoredKeyValues
     .Where(x => x.InstanceId == instanceId && x.DictionaryName == dictionaryName)
     .OrderBy(x => x.Order)
                   .ToList()
       .Where(isValidItem);

            var values = new List<TValue>();
            foreach (var item in items)
            {
                var valueType = Type.GetType(item.ValueType);
                var value = JsonSerializer.Deserialize(item.ValueJson, valueType);
                if (value is TValue typedValue)
                    values.Add(typedValue);
            }
            return values;
        }
    }

    public int Count
    {
        get
        {
            using var db = this.createDbContext();
            var items = db.StoredKeyValues
                        .Where(x => x.InstanceId == instanceId && x.DictionaryName == dictionaryName)
                   .ToList();
            return items.Count(isValidItem);
        }
    }

    public bool IsReadOnly => false;

    public void Add(KeyValuePair<TKey, TValue> item) => Add(item.Key, item.Value);

    public bool Contains(KeyValuePair<TKey, TValue> item)
    {
        if (TryGetValue(item.Key, out var value))
            return EqualityComparer<TValue>.Default.Equals(value, item.Value);
        return false;
    }

    public void CopyTo(KeyValuePair<TKey, TValue>[] array, int arrayIndex)
    {
        if (array == null) throw new ArgumentNullException(nameof(array));
        if (arrayIndex < 0) throw new ArgumentOutOfRangeException(nameof(arrayIndex));

        var items = this.ToList();
        if (array.Length - arrayIndex < items.Count)
            throw new ArgumentException("Destination array is not long enough");

        foreach (var item in items)
            array[arrayIndex++] = item;
    }

    public bool Remove(KeyValuePair<TKey, TValue> item)
    {
        if (Contains(item)) return Remove(item.Key);
        return false;
    }

    public IEnumerator<KeyValuePair<TKey, TValue>> GetEnumerator()
    {
        using var db = this.createDbContext();
        var items = db.StoredKeyValues
            .Where(x => x.InstanceId == instanceId && x.DictionaryName == dictionaryName)
            .OrderBy(x => x.Order)
            .ToList()
            .Where(isValidItem);

        foreach (var item in items)
        {
            var key = convertKey(item.Key);
            var valueType = Type.GetType(item.ValueType);
            var value = JsonSerializer.Deserialize(item.ValueJson, valueType);
            if (value is TValue typedValue)
                yield return new KeyValuePair<TKey, TValue>(key, typedValue);
        }
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
