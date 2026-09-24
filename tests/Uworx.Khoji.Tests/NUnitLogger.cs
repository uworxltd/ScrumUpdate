// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.Extensions.Logging;

namespace Uworx.Khoji.Tests;

internal class NUnitLogger<T> : ILogger<T>, IDisposable
{
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception exception, Func<TState, Exception, string> formatter)
    {
        if (logLevel != LogLevel.Information)
            TestContext.Out.WriteLine($"{logLevel}: {state}");
        else
            TestContext.Out.WriteLine(state);
    }

    public bool IsEnabled(LogLevel logLevel)
    {
        return true;
    }

    public IDisposable BeginScope<TState>(TState state)
    {
        return this;
    }

    public void Dispose()
    { }
}