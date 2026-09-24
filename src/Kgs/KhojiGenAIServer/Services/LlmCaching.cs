// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Features;
using Microsoft.Extensions.Caching.Distributed;
using System.Security.Cryptography;
using System.Text;

namespace KhojiGenAIServer.Services;

static class LlmCaching
{
    static string generateSha256Hash(string input, string prefix = "llm_cache")
    {
        using (var sha256 = SHA256.Create())
        {
            byte[] bytes = Encoding.UTF8.GetBytes(input);
            byte[] hashBytes = sha256.ComputeHash(bytes);
            //return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
            var hash = Convert.ToHexString(hashBytes); // Convert.ToBase64String(bytes)?
            return $"{prefix}:{hash}";
        }
    }

    static string flattenMessages<T>(List<T> messages, Func<T, string> getRole, Func<T, string> getText)
    {
        var sb = new StringBuilder();

        foreach (var msg in messages)
        {
            sb.Append(getRole(msg));
            sb.Append("::");
            sb.Append(getText(msg));
            sb.Append("||"); // separator
        }

        return sb.ToString();
    }

    public static string GenerateCacheKey(int tenantId, string llm, string prompt, string input)
    {
        var promptContent = LlmIntegration.GetPromptContent(prompt);
        if (promptContent is null) throw new ArgumentException($"Prompt file not found for {prompt}");

        string promptContentHash = generateSha256Hash(promptContent);
        string userInputHash = generateSha256Hash(input);
        return generateSha256Hash($"{tenantId}|{llm}|{promptContentHash}|{userInputHash}");
    }

    public static string GenerateCacheKey(string llm, string prompt, string input) =>
        GenerateCacheKey(tenantId: 0, llm, prompt, input);

    public static async Task<string> GetOrSetStringAsync(this IDistributedCache cache,
        Func<string> getCacheKey,
        Func<DistributedCacheEntryOptions, string> notFound)
    {
        var cachedResult = await cache.GetStringAsync(getCacheKey());
        if (!string.IsNullOrEmpty(cachedResult))
            return cachedResult;

        var cacheOptions = new DistributedCacheEntryOptions();
        var value = notFound(cacheOptions);
        if (value.HasText())
            await cache.SetStringAsync(getCacheKey(), value, cacheOptions);
        return value;
    }

    public static TimeSpan? ShouldCache(this HttpRequest request)
    {
        var cacheControl = request.Headers.CacheControl.ToString();
        TimeSpan? absoluteExpiration = null;

        if (cacheControl?.Contains("max-age") == true)
        {
            var parts = cacheControl.Split('=');
            if (parts.Length == 2 && int.TryParse(parts[1], out var seconds))
                absoluteExpiration = TimeSpan.FromSeconds(seconds);
        }

        return absoluteExpiration;
    }
}
