// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using System.Text.Json;

namespace KhojiGenAIServer.Extensions;

public static class JsonElementExtensions
{
    public static bool TryGetValue<T>(this JsonElement element, string propertyName, out T value)
    {
        value = default!;
        if (element.ValueKind != JsonValueKind.Object)
            return false;

        if (element.TryGetProperty(propertyName, out var prop))
        {
            try
            {
                value = JsonSerializer.Deserialize<T>(prop.GetRawText());
                return true;
            }
            catch
            {
                return false;
            }
        }

        return false;
    }
}