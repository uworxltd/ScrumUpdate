// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

namespace KhojiGenAIServer.Extensions;

static class DictionaryExtensions
{
    public static object? GetValueOrDefault(this IDictionary<string, object?> dict, string key, object? defaultValue = null) =>
        dict.TryGetValue(key, out var value) ? value : defaultValue;
}
