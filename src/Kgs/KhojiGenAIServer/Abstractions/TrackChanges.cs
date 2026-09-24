// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using System.Collections.Concurrent;
using System.Reflection;
using System.Text;
using DescriptionAttribute = System.ComponentModel.DescriptionAttribute;

namespace KhojiGenAIServer.Abstractions;

static class TrackChanges
{
    static readonly ConcurrentDictionary<Type, PropertyInfo[]> propertyCache = new();

    static string formatValue(object? v) =>
        v switch
        {
            null => "unset",
            DateTime dt => dt.ToString("u"),  // ISO-like but friendly
            bool b => b ? "enabled" : "disabled",
            Enum e => e.ToString(),
            _ => v.ToString() ?? "unset"
        };

    public static OrderedDictionary<TKey, TValue> ToOrderedDictionary<T, TKey, TValue>(this IEnumerable<T> source,
        Func<T, TKey> keySelector,
        Func<T, TValue> valueSelector) where TKey : notnull // where is coming from OrderedDictionary
    {
        var dict = new OrderedDictionary<TKey, TValue>();
        foreach (var item in source)
            dict.Add(keySelector(item), valueSelector(item));
        return dict;
    }

    public static OrderedDictionary<TKey, T> ToOrderedDictionary<T, TKey>(this IEnumerable<T> source,
        Func<T, TKey> keySelector) where TKey : notnull
    {
        var dict = new OrderedDictionary<TKey, T>();
        foreach (var item in source)
            dict.Add(keySelector(item), item);
        return dict;
    }

    public static void DiffWith<T, TKey, TValue>(this IDictionary<TKey, TValue> existing,
        IEnumerable<T> source,
        Func<T, TKey> keySelector,
        Func<T, TValue> valueSelector,
        Action<TKey, TValue> onAddition,
        Action<TKey, TValue> onRemoval,
        Action<TKey, TValue, string> onDifference) where TKey : notnull
    {
        var sourceKeys = new HashSet<TKey>();

        foreach (var item in source)
        {
            var key = keySelector(item);
            sourceKeys.Add(key);

            var newValue = valueSelector(item);

            if (existing.ContainsKey(key))
            {
                var oldValue = existing[key];
                var diff = oldValue.GetDifferenceText(newValue);

                if (!string.IsNullOrEmpty(diff))
                    onDifference(key, newValue, diff);
            }
            else
                onAddition(key, newValue);
        }

        foreach (var key in existing.Keys.Except(sourceKeys))
            onRemoval(key, existing[key]);
    }

    public static void DiffWith<T, TKey>(this IDictionary<TKey, T> existing,
        IEnumerable<T> source,
        Func<T, TKey> keySelector,
        Action<TKey, T, string> onDifference) where TKey : notnull =>
        existing.DiffWith(source, keySelector,
        valueSelector: t => t,
        onAddition: (k, v) => onDifference(k, v, $"{k} added"),
        onRemoval: (k, v) => onDifference(k, v, $"{k} removed"),
        onDifference);

    public static string GetDifferenceText<T>(this T oldObject, T newObject)
    {
        if (oldObject is null && newObject is null)
            return string.Empty;
        else if (oldObject is null)
            return $"Object initialized: {newObject}";
        else if (newObject is null)
            return $"Object unset (was {oldObject})";

        var type = typeof(T);
        var props = propertyCache.GetOrAdd(
            type,
            t => t.GetProperties(BindingFlags.Public | BindingFlags.Instance));
        var changes = new StringBuilder();

        foreach (var prop in props)
        {
            try
            {
                var oldValue = prop.GetValue(oldObject);
                var newValue = prop.GetValue(newObject);

                if (!Equals(oldValue, newValue))
                {
                    string displayName = prop.GetCustomAttribute<DescriptionAttribute>()?.Description
                        ?? prop.Name;

                    if (oldValue is null && newValue is not null)
                        changes.AppendLine($"{displayName} initialized to {formatValue(newValue)}");
                    else if (oldValue is not null && newValue is null)
                        changes.AppendLine($"{displayName} unset (was {formatValue(oldValue)})");
                    else
                        changes.AppendLine($"{displayName} changed from {formatValue(oldValue)} to {formatValue(newValue)}");
                }
            }
            catch (Exception ex)
            {
                changes.AppendLine($"Failed to compare {prop.Name}: {ex.Message}");
            }
        }

        return changes.Length == 0 ? string.Empty : changes.ToString();
    }
}
