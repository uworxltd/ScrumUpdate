// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace Uworx.Khoji.Agile.AI;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class ToolFunctionAttribute : Attribute
{
    public string Name { get; }
    public string? Description { get; }

    public ToolFunctionAttribute(string name)
    {
        Name = name;
    }

    public ToolFunctionAttribute(string name, string description)
    {
        Name = name;
        Description = description;
    }
}
