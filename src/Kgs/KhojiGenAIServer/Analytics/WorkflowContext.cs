// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Analytics;

class WorkflowContext
{
    readonly Dictionary<string, object> variables = new();
    readonly Dictionary<string, object> inputs;

    public IReadOnlyDictionary<string, object> Variables => variables;
    public IReadOnlyDictionary<string, object> Inputs => inputs;

    public WorkflowContext(Dictionary<string, object> inputs)
    {
        this.inputs = inputs ?? new Dictionary<string, object>();
    }

    public void SetVariable(string name, object value)
    {
        ArgumentNullException.ThrowIfNull(name);
        variables[name] = value;
    }

    public T GetVariable<T>(string name)
    {
        ArgumentNullException.ThrowIfNull(name);

        if (variables.TryGetValue(name, out var value))
        {
            if (value is T typedValue)
                return typedValue;

            throw new InvalidCastException($"Variable '{name}' is not of type {typeof(T).Name}");
        }

        throw new KeyNotFoundException($"Variable '{name}' not found in workflow context");
    }

    public bool TryGetVariable<T>(string name, out T value)
    {
        value = default;
        if (variables.TryGetValue(name, out var obj) && obj is T typedValue)
        {
            value = typedValue;
            return true;
        }
        return false;
    }

    public object GetInput(string name)
    {
        ArgumentNullException.ThrowIfNull(name);
        return inputs.TryGetValue(name, out var value) ? value : null;
    }
}