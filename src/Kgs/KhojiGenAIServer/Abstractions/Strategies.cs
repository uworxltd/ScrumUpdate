// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Abstractions;

class HandlerResult
{
    public bool Found { get; }
    public bool Success { get; }
    public Exception Exception { get; }

    private HandlerResult(bool found, bool success, Exception exception = null)
    {
        Found = found;
        Success = success;
        Exception = exception;
    }

    public static HandlerResult NotFound() => new(false, false);
    public static HandlerResult SuccessResult() => new(true, true);
    public static HandlerResult Failure(Exception ex) => new(true, false, ex);
}

record StrategyEvent<TIntent, TPayload>(TIntent intent, TPayload payload);

class StrategyMap<TIntent, TPayload> where TIntent : Enum
{
    private readonly Dictionary<TIntent, Func<StrategyEvent<TIntent, TPayload>, Task>> handlers = new();

    public StrategyMap<TIntent, TPayload> Register(TIntent intent, Func<StrategyEvent<TIntent, TPayload>, Task> handler)
    {
        if (handler is null)
            throw new ArgumentNullException(nameof(handler));

        handlers[intent] = handler;
        return this;
    }

    public async Task<HandlerResult> Trigger(TIntent intent, TPayload payload)
    {
        if (!handlers.TryGetValue(intent, out var handler))
            return HandlerResult.NotFound();

        try
        {
            var evt = new StrategyEvent<TIntent, TPayload>(intent, payload);
            await handler(evt);
            return HandlerResult.SuccessResult();
        }
        catch (Exception ex)
        {
            return HandlerResult.Failure(ex);
        }
    }
}

class OrderedStrategyMap<TIntent, TPayload> where TIntent : Enum
{
    private readonly List<
        (TIntent Intent,
         Func<TPayload, Task<bool>> MatchPredicate,
         Func<StrategyEvent<TIntent, TPayload>, Task> Handler)
    > _rules = new();

    public OrderedStrategyMap<TIntent, TPayload> Register(
        TIntent intent,
        Func<TPayload, bool> matchPredicate,
        Func<StrategyEvent<TIntent, TPayload>, Task> handler)
    {
        if (matchPredicate is null) throw new ArgumentNullException(nameof(matchPredicate));
        if (handler is null) throw new ArgumentNullException(nameof(handler));

        return Register(intent, payload => Task.FromResult(matchPredicate(payload)), handler);
    }

    public OrderedStrategyMap<TIntent, TPayload> Register(
        TIntent intent,
        Func<TPayload, Task<bool>> matchPredicate,
        Func<StrategyEvent<TIntent, TPayload>, Task> handler)
    {
        if (matchPredicate is null) throw new ArgumentNullException(nameof(matchPredicate));
        if (handler is null) throw new ArgumentNullException(nameof(handler));

        _rules.Add((intent, matchPredicate, handler));
        return this;
    }

    public async Task<HandlerResult> Trigger(TPayload payload)
    {
        foreach (var (intent, matchPredicate, handler) in _rules)
        {
            bool isMatch;
            try
            {
                isMatch = await matchPredicate(payload).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                // If match predicate throws, treat as a non-match but surface the exception as a failure for traceability.
                return HandlerResult.Failure(ex);
            }

            if (!isMatch) continue;

            try
            {
                var evt = new StrategyEvent<TIntent, TPayload>(intent, payload);
                await handler(evt).ConfigureAwait(false);
                return HandlerResult.SuccessResult();
            }
            catch (Exception ex)
            {
                return HandlerResult.Failure(ex);
            }
        }

        return HandlerResult.NotFound();
    }
}