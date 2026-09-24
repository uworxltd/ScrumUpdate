// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using TickerQ.Utilities.Enums;
using TickerQ.Utilities.Interfaces;

namespace KhojiGenAIServer.Infrastructure;

class TickerExceptionHandler : ITickerExceptionHandler
{
    public Task HandleCanceledExceptionAsync(Exception exception, Guid tickerId, TickerType tickerType)
    {
        //throw new NotImplementedException();
        return Task.CompletedTask;
    }

    public Task HandleExceptionAsync(Exception exception, Guid tickerId, TickerType tickerType)
    {
        //throw new NotImplementedException();
        return Task.CompletedTask;
    }
}
