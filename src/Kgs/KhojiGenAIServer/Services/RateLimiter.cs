// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using System.Collections.Concurrent;

namespace KhojiGenAIServer.Services;

/// <summary>
/// Usage:
/// var limiter = new RateLimiter(TimeSpan.FromMinutes(1), maxRequests: 5); // 5 requests per minute
/// if (limiter.IsAllowed("user123"))
///     // Proceed with the action
/// else
///     // Deny due to rate limiting
/// </summary>
class RateLimiter
{
    readonly TimeSpan timeWindow;
    readonly int maxRequests;
    static readonly ConcurrentDictionary<string, ConcurrentQueue<DateTime>> requestLog = new();

    public RateLimiter(TimeSpan timeWindow, int maxRequests)
    {
        this.timeWindow = timeWindow;
        this.maxRequests = maxRequests;
    }

    public bool IsAllowed(string key)
    {
        var now = DateTime.UtcNow;
        var timestamps = requestLog.GetOrAdd(key, _ => new ConcurrentQueue<DateTime>());

        while (timestamps.TryPeek(out var oldest) && now - oldest > timeWindow)
            timestamps.TryDequeue(out _);

        if (timestamps.Count < maxRequests)
        {
            timestamps.Enqueue(now);
            return true;
        }

        return false;
    }
}
