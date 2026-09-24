// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using OpenTelemetry;
using System.Collections.Concurrent;
using System.Diagnostics;

namespace Uworx.Khoji.Infrastructure;

public sealed record ActivityEventSnapshot(
    string Name,
    DateTimeOffset Timestamp,
    IReadOnlyDictionary<string, object> Attributes)
{
    public static ActivityEventSnapshot From(ActivityEvent e)
        => new(
            e.Name,
            e.Timestamp,
            e.Tags.ToDictionary(t => t.Key, t => t.Value)
        );
}

public sealed record ActivitySnapshot(
    string TraceId,
    string SpanId,
    string ParentSpanId,
    string Name,
    string Kind,
    DateTimeOffset StartTime,
    TimeSpan Duration,
    ActivityStatusCode Status,
    IReadOnlyDictionary<string, string> Tags,
    IReadOnlyList<ActivityEventSnapshot> Events)
{
    public static ActivitySnapshot From(Activity activity)
        => new(
            TraceId: activity.TraceId.ToString(),
            SpanId: activity.SpanId.ToString(),
            ParentSpanId: activity.ParentSpanId.ToString(),
            Name: activity.DisplayName,
            Kind: activity.Kind.ToString(),
            StartTime: activity.StartTimeUtc,
            Duration: activity.Duration,
            Status: activity.Status,
            Tags: activity.Tags.ToDictionary(t => t.Key, t => t.Value),
            Events: activity.Events.Select(ActivityEventSnapshot.From).ToArray()
        );
}

public sealed record ActivitySnapshotLite(
    string TraceId,
    string SpanId,
    string Name,
    TimeSpan Duration,
    ActivityStatusCode Status,
    string Error)
{
    public static ActivitySnapshotLite From(Activity a)
        => new(
            a.TraceId.ToString(),
            a.SpanId.ToString(),
            a.DisplayName,
            a.Duration,
            a.Status,
            a.Status == ActivityStatusCode.Error
                ? a.Tags.FirstOrDefault(t => t.Key == "exception.message").Value?.ToString()
                : null
        );
}

public sealed class RingBufferTraceExporter : BaseExporter<Activity>
{
    readonly ConcurrentQueue<ActivitySnapshot> buffer = [];
    readonly int maxSize;

    public RingBufferTraceExporter(int maxSize = 100)
        => this.maxSize = maxSize;

    public override ExportResult Export(in Batch<Activity> batch)
    {
        foreach (var activity in batch)
        {
            buffer.Enqueue(ActivitySnapshot.From(activity));

            while (buffer.Count > maxSize)
                buffer.TryDequeue(out _);
        }

        return ExportResult.Success;
    }

    public IReadOnlyList<ActivitySnapshot> Snapshot()
        => [.. buffer];
}
