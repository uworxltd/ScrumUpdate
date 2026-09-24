// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using Microsoft.Extensions.Logging;

namespace Uworx.Khoji.Agile;

public abstract class BaseAgileComponent
{
    readonly ILogger logger;

    public ILogger Logger => this.logger;

    public BaseAgileComponent(ILogger logger)
    {
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
}

public abstract class BaseAgileDatabaseComponent : BaseAgileComponent
{
    readonly string connectionString;

    public string ConnectionString => this.connectionString;

    public BaseAgileDatabaseComponent(ILogger logger, string connectionString) : base(logger)
    {
        this.connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }
}

public abstract class BaseAgileInstanceComponent : BaseAgileDatabaseComponent
{
    readonly int instanceId;

    public int InstanceId => this.instanceId;

    public BaseAgileInstanceComponent(ILogger logger, string connectionString, int instanceId) : base(logger, connectionString)
    {
        this.instanceId = instanceId > 0 ? instanceId : throw new ArgumentNullException(nameof(instanceId));
    }
}