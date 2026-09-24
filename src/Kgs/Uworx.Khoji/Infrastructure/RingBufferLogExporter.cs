// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Logs;
using System.Collections.Concurrent;

namespace Uworx.Khoji.Infrastructure;

public sealed record LogSnapshot(
    DateTimeOffset Timestamp,
    LogLevel Level,
    string Category,
    string Message,
    IReadOnlyDictionary<string, object> Attributes,
    string TraceId,
    string SpanId,
    string Exception)
{
    public static LogSnapshot From(LogRecord r)
        => new(
            Timestamp: r.Timestamp,
            Level: r.LogLevel,
            Category: r.CategoryName ?? "unknown",
            Message: r.FormattedMessage ?? r.Body?.ToString() ?? "",
            Attributes: r.Attributes?.ToDictionary(a => a.Key, a => a.Value)
                        ?? new Dictionary<string, object>(),
            TraceId: r.TraceId.ToString(),
            SpanId: r.SpanId.ToString(),
            Exception: r.Exception?.ToString()
        );
}

public sealed class RingBufferLogExporter : BaseExporter<LogRecord>
{
    readonly ConcurrentQueue<LogSnapshot> buffer = [];
    readonly int maxSize;

    public RingBufferLogExporter(int maxSize = 100)
        => this.maxSize = maxSize;

    public override ExportResult Export(in Batch<LogRecord> batch)
    {
        foreach (var record in batch)
        {
            buffer.Enqueue(LogSnapshot.From(record));

            while (buffer.Count > maxSize)
                buffer.TryDequeue(out _);
        }

        return ExportResult.Success;
    }

    public IReadOnlyList<LogSnapshot> Snapshot()
        => [.. buffer];
}
