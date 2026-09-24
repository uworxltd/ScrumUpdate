// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Text;
using System.Text.Json;

namespace KhojiGenAIServer.Features.Kia;

static class KiaExtensions
{
    static Dictionary<string, object?> toDictionary(JObject jObject)
    {
        var dict = new Dictionary<string, object?>();

        foreach (var property in jObject.Properties())
            dict[property.Name] = toValue(property.Value);

        return dict;
    }

    static Dictionary<string, object?> toDictionary(JsonElement jObject)
    {
        var dict = new Dictionary<string, object?>();

        foreach (var property in jObject.EnumerateObject())
            dict[property.Name] = toValue(property.Value);

        return dict;
    }

    static object? toValue(JToken token)
    {
        return token.Type switch
        {
            JTokenType.Object => toDictionary((JObject)token),
            JTokenType.Array => ((JArray)token).Select(toValue).ToList(),
            JTokenType.Integer => token.Value<long>(),
            JTokenType.Float => token.Value<double>(),
            JTokenType.Boolean => token.Value<bool>(),
            JTokenType.Null => null,
            _ => token.ToString() // strings, dates, etc.
        };
    }

    static object? toValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => toDictionary(element),
            JsonValueKind.Array => element.EnumerateArray().Select(toValue).ToList(),
            JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.String => element.GetString(),
            _ => element.ToString() // fallback for Undefined or others
        };
    }

    public static async Task<Dictionary<string, object?>?> ReadFromJsonNewtonsoft(this HttpContext context)
    {
        using var reader = new StreamReader(context.Request.Body);
        var body = await reader.ReadToEndAsync();

        if (string.IsNullOrWhiteSpace(body)) return null;

        var token = JsonConvert.DeserializeObject<JToken>(body);

        return token is JObject jObj ? toDictionary(jObj) : null;
    }

    public static async Task<Dictionary<string, object?>?> ReadFromJsonSystemTextJson(this HttpContext context)
    {
        using var reader = new StreamReader(context.Request.Body);
        var body = await reader.ReadToEndAsync();

        if (string.IsNullOrWhiteSpace(body)) return null;

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.ValueKind == JsonValueKind.Object
            ? toDictionary(doc.RootElement)
            : null;
    }

    public static Dictionary<string, object?>? ReadFromJsonNewtonSoft(this String str)
    {
        if (string.IsNullOrWhiteSpace(str)) return null;
        var token = JsonConvert.DeserializeObject<JToken>(str);
        return token is JObject jObj ? toDictionary(jObj) : null;
    }

    public static string? GetStringOrEmpty(this Dictionary<string, object?> dict, string key) =>
        dict.ContainsKey(key) && dict.TryGetValue(key, out var obj)
        ? obj?.ToString()?.Trim() ?? string.Empty
        : string.Empty;

    public static DateTime? GetDateOrNull(this Dictionary<string, object?> dict, string key) =>
        DateTime.TryParse(dict.GetStringOrEmpty(key), out var date)
        ? date
        : null;

    public static List<object?> GetListOrEmpty(this Dictionary<string, object?> dict, string key) =>
        dict.ContainsKey(key) && dict[key] is List<object?> list
        ? list : new List<object?>();

    public static Dictionary<string, object?> GetDictionaryOrEmpty(this Dictionary<string, object?> dict, string key) =>
        dict.ContainsKey(key) && dict[key] is Dictionary<string, object?> d
        ? d : new Dictionary<string, object?>();

    public static Dictionary<string, object?> GetOrCreateDictionary(this Dictionary<string, object?> dict, string key)
    {
        if (!dict.TryGetValue(key, out var obj) || obj is not Dictionary<string, object?> childDict)
        {
            childDict = new Dictionary<string, object?>();
            dict[key] = childDict;
        }
        return childDict;
    }

    public static List<Dictionary<string, object?>> GetListOfDictionaryOrEmpty(this Dictionary<string, object?> dict, string key) =>
        dict.ContainsKey(key) && dict[key] is List<Dictionary<string, object?>> ld
        ? ld
        : dict.ContainsKey(key) && dict[key] is List<object> lo
            ? lo.OfType<Dictionary<string, object?>>().ToList() // filters + casts only the valid ones
            : new List<Dictionary<string, object?>>();

    public static T? GetValueOrDefault<T>(this Dictionary<string, object?> dict, string key)
    {
        if (dict.TryGetValue(key, out var obj) && obj is T value)
            return value;
        return default;
    }

    public static List<string> ExtractJsonObjects(this string input)
    {
        var results = new List<string>();
        var stack = new Stack<char>();
        var current = new StringBuilder();

        bool inJson = false;

        foreach (char c in input)
        {
            if (c == '{' || c == '[')
            {
                stack.Push(c);
                current.Append(c);
                inJson = true;
            }
            else if (c == '}' || c == ']')
            {
                if (stack.Count > 0)
                {
                    char open = stack.Pop();

                    // sanity check
                    if ((c == '}' && open != '{') || (c == ']' && open != '['))
                        throw new Exception($"Mismatched brackets at: {c}");

                    current.Append(c);

                    // if stack is empty, we’ve closed a full JSON block
                    if (stack.Count == 0)
                    {
                        results.Add(current.ToString());
                        current.Clear();
                        inJson = false;
                    }
                }
            }
            else
            {
                if (inJson)
                    current.Append(c);
            }
        }

        return results;
    }
}
