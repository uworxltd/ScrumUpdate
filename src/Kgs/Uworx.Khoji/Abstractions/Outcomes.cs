// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace Uworx.Khoji.Abstractions;

// Result Pattern, names are deliberatly kept different to avoid clashes with "ASP.NET Results"

[Serializable]
public class OutcomeFailedException : Exception
{
    public OutcomeFailedException(IEnumerable<string> errors)
        : base(buildMessage(errors))
    { }

    public OutcomeFailedException(IEnumerable<string> errors, Exception? innerException)
        : base(buildMessage(errors), innerException)
    { }

    static string buildMessage(IEnumerable<string>? errors)
    {
        if (errors == null)
            return "Outcome failed with unknown errors";

        var list = errors.ToList();
        if (list.Count == 0)
            return "Outcome failed with no specified errors";

        return $"Outcome failed with {list.Count} error(s): {string.Join("; ", list)}";
    }
}

public interface IOutcome
{
    IReadOnlyCollection<string> Errors { get; }
    bool Succeeded { get; }
    IOutcome AddError(string error); // for fluent api
}

public interface IDataOutcome<T> : IOutcome
{
    T Data { get; }
}

public class Outcome : IOutcome
{
    readonly List<string> errors;

    public Outcome()
    {
        this.errors = new List<string>();
    }

    public IReadOnlyCollection<string> Errors => errors.AsReadOnly();

    public bool Succeeded => Errors.Count == 0;

    public IOutcome AddError(string error) // for fluent api
    {
        this.errors.Add(error);
        return this;
    }
}

public class DataOutcome<T> : Outcome, IDataOutcome<T>
{
    readonly T data;

    public DataOutcome(T data) : base()
    {
        this.data = data;
        if (data is null)
            base.AddError("data missing");
    }

    public T Data => this.data;

    public new IDataOutcome<T> AddError(string error)
    {
        base.AddError(error);
        return this;
    }
}

public static class Outcomes
{
    #region Factory Methods

    public static IOutcome Success() => new Outcome();
    public static IOutcome Failure(params string[] errors)
    {
        var r = new Outcome();
        foreach (var e in errors) r.AddError(e);
        return r;
    }

    public static IDataOutcome<T> Success<T>(T data) => new DataOutcome<T>(data);
    public static IDataOutcome<T> Failure<T>(params string[] errors)
    {
        var r = new DataOutcome<T>(default!);
        foreach (var e in errors) r.AddError(e);
        return r;
    }

    #endregion

    #region Callbacks / Continuations

    public static IOutcome OnSuccess(this IOutcome outcome, Action action)
    {
        if (outcome.Succeeded) action();

        return outcome;
    }
    public static IDataOutcome<T> OnSuccess<T>(this IDataOutcome<T> outcome, Action<T> action)
    {
        if (outcome.Succeeded) action(outcome.Data);

        return outcome;
    }

    public static IOutcome OnFailure(this IOutcome outcome, Action<IEnumerable<string>> action)
    {
        if (!outcome.Succeeded) action(outcome.Errors);

        return outcome;
    }

    public static IOutcome OnResult(this IOutcome outcome, Action onSuccess, Action<IEnumerable<string>> onFailure)
    {
        if (outcome.Succeeded)
            onSuccess();
        else
            onFailure(outcome.Errors);

        return outcome;
    }
    public static IDataOutcome<T> OnResult<T>(this IDataOutcome<T> outcome, Action<T> onSuccess, Action<IEnumerable<string>> onFailure)
    {
        if (outcome.Succeeded)
            onSuccess(outcome.Data);
        else
            onFailure(outcome.Errors);

        return outcome;
    }

    #endregion

    #region Recovery / Defaults

    public static T OrElse<T>(this IDataOutcome<T> outcome, T defaultValue) =>
        outcome.Succeeded ? outcome.Data : defaultValue;

    // Java inspiration
    public static IOutcome OrElse(this IOutcome outcome, Func<Exception> createException)
    {
        if (outcome.Succeeded) return outcome;

        if (createException is null) throw new ArgumentNullException(nameof(createException));

        throw createException() ?? new ApplicationException();
    }

    // Java inspiration
    public static T OrElse<T>(this IDataOutcome<T> outcome, Func<Exception> createException)
    {
        if (outcome.Succeeded) return outcome.Data;

        if (createException is null) throw new ArgumentNullException(nameof(createException));

        throw createException() ?? new ApplicationException();
    }

    // Choosing not to have overloads without createException, though they exists in Java (i think)
    // object.DoSomething().OrElse() looking tempting but becomes confusing
    // secondly C# favors not to use exceptions as return types
    // we can revisit

    #endregion

    #region Value Access

    public static T Unwrap<T>(this IDataOutcome<T> outcome) =>
        outcome switch
        {
            var o when o.Succeeded => o.Data,
            var o => throw new OutcomeFailedException(o.Errors)
        };

    // Dictionary inspiration
    public static bool Unwrap<T>(this IDataOutcome<T> outcome, out T value)
    {
        if (outcome.Succeeded)
        {
            value = outcome.Data;
            return true;
        }

        value = default!;
        return false;
    }

    #endregion

    #region Query

    // LINQ inspiration
    public static bool AllSucceeded(this IEnumerable<IOutcome> outcomes) =>
        outcomes.All(o => o.Succeeded);

    // LINQ inspiration
    public static bool AnyFailed(this IEnumerable<IOutcome> outcomes) =>
        outcomes.Any(o => !o.Succeeded);

    #endregion
}
