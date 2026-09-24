// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Serilog;

namespace KhojiGenAIServer.Infrastructure;

internal class WebChatLogger<T> : ILogger<T>, IDisposable
{
    readonly ILogger<T> diLogger;
    readonly ILogger<T> serilogLogger;

    public WebChatLogger(ILogger<T> diLogger, string logPath)
    {
        this.diLogger = diLogger;

        var serilogLogger = new LoggerConfiguration()
            //.Enrich.WithProperty("ConversationId", conversationId)
            .WriteTo.File(logPath) //, rollingInterval: RollingInterval.Day)
            .CreateLogger();

        using var loggerFactory = LoggerFactory.Create(builder => builder.AddSerilog(serilogLogger)); //,, dispose: true));
        this.serilogLogger = loggerFactory.CreateLogger<T>();
    }

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception exception, Func<TState, Exception, string> formatter)
    {
        this.diLogger.Log(logLevel, eventId, state, exception, formatter);
        this.serilogLogger.Log(logLevel, eventId, state, exception, formatter);
    }

    public bool IsEnabled(LogLevel logLevel) =>
        this.diLogger.IsEnabled(logLevel);

    public IDisposable BeginScope<TState>(TState state) => this;

    public void Dispose() { }
}