// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using System.Text;

namespace KhojiGenAIServer.Analytics;

class InputParameter
{
    public string Type { get; set; }
    public object Default { get; set; }
}

class WorkflowStep
{
    public string Id { get; set; }
    public string Type { get; set; }

    // Common Step Properties
    public string Output { get; set; } // Output variable support

    // SQL Step Properties
    public string Query { get; set; }
    public string Returns { get; set; }

    // Function Step Properties
    public string Method { get; set; }

    // LLM Step Properties
    public int? Cache { get; set; }
    public string Llm { get; set; }
    public string Prompt { get; set; }

    // Workflow Step Properties
    public string Workflow { get; set; }
    public Dictionary<string, object> Inputs { get; set; } = new();
}

class WorkflowDefinition
{
    public string Name { get; set; }
    public string Version { get; set; }
    public Dictionary<string, InputParameter> Inputs { get; set; } = new();
    public List<WorkflowStep> Steps { get; set; } = new();
}

class StepResult
{
    public string StepId { get; set; }
    public object Data { get; set; }
    public bool Success { get; set; }
    public string Error { get; set; }
}

record FieldDef(string Name, Type Type);

record DynamicRow(IReadOnlyList<FieldDef> Schema, object?[] Values)
{
    public object? this[string name]
    {
        get
        {
            for (int i = 0; i < Schema.Count; i++)
                if (string.Equals(Schema[i].Name, name, StringComparison.Ordinal))
                    return Values[i];
            throw new KeyNotFoundException($"Field '{name}' not found in schema.");
        }
    }

    public object? this[int index] => Values[index];
}

record DynamicTable(IReadOnlyList<FieldDef> Schema, List<object?[]> Rows)
{
    public IEnumerable<DynamicRow> AsRows()
        => Rows.Select(values => new DynamicRow(Schema, values));

    public string ToCsv(string delimiter = ",")
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(delimiter, Schema.Select(f => f.Name)));
        foreach (var values in Rows)
            sb.AppendLine(string.Join(delimiter, values.Select(v => v?.ToString() ?? "")));

        return sb.ToString();
    }
}
