// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using OpenTelemetry;
using OpenTelemetry.Metrics;
using System.Collections.Concurrent;

namespace Uworx.Khoji.Infrastructure;

public sealed record MetricPointSnapshot(
    IReadOnlyDictionary<string, object> Attributes,
    double? Value,
    double? Sum,
    long? Count,
    IReadOnlyList<HistogramBucketSnapshot> Buckets);

public sealed record HistogramBucketSnapshot(
    double UpperBound,
    long Count);

public sealed record MetricSnapshot(
    DateTimeOffset Timestamp,
    string Name,
    string Description,
    string Unit,
    string MetricType,
    IReadOnlyList<MetricPointSnapshot> Points);

public sealed class RingBufferMetricExporter : BaseExporter<Metric>
{
    readonly ConcurrentQueue<MetricSnapshot> buffer = [];
    readonly int maxSize;

    public RingBufferMetricExporter(int maxSize = 100)
        => this.maxSize = maxSize;

    static MetricSnapshot snapshotMetric(Metric metric, DateTimeOffset timestamp)
    {
        var points = new List<MetricPointSnapshot>();

        foreach (ref readonly var point in metric.GetMetricPoints())
        {
            // build attributes manually
            var attrs = new Dictionary<string, object>();

            foreach (var tag in point.Tags)
                attrs[tag.Key] = tag.Value;

            // extract values based on metric type
            double? value = null;
            double? sum = null;
            long? count = null;
            List<HistogramBucketSnapshot> buckets = null;

            switch (metric.MetricType)
            {
                case MetricType.DoubleGauge:
                case MetricType.LongGauge:
                    value = point.GetGaugeLastValueDouble();
                    break;

                case MetricType.DoubleSum:
                case MetricType.LongSum:
                    value = point.GetSumDouble();
                    break;

                case MetricType.Histogram:
                    sum = point.GetHistogramSum();
                    count = point.GetHistogramCount();
                    buckets = snapshotBuckets(point);
                    break;

                default:
                    // future-proof: ignore unknown types
                    break;
            }

            points.Add(new MetricPointSnapshot(
                Attributes: attrs,
                Value: value,
                Sum: sum,
                Count: count,
                Buckets: buckets));
        }

        return new MetricSnapshot(
            Timestamp: timestamp,
            Name: metric.Name,
            Description: metric.Description ?? "",
            Unit: metric.Unit ?? "",
            MetricType: metric.MetricType.ToString(),
            Points: points);
    }

    static List<HistogramBucketSnapshot> snapshotBuckets(in MetricPoint point)
    {
        var list = new List<HistogramBucketSnapshot>();

        foreach (var bucket in point.GetHistogramBuckets())
            list.Add(new HistogramBucketSnapshot(
                UpperBound: bucket.ExplicitBound,
                Count: bucket.BucketCount));

        return list;
    }

    public override ExportResult Export(in Batch<Metric> batch)
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var metric in batch)
        {
            var snapshot = snapshotMetric(metric, now);
            buffer.Enqueue(snapshot);

            while (buffer.Count > maxSize)
                buffer.TryDequeue(out _);
        }

        return ExportResult.Success;
    }

    public IReadOnlyList<MetricSnapshot> Snapshot()
        => [.. buffer];
}
