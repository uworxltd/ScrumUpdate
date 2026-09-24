// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer;

static class Globals
{
    static readonly bool isDebugging = false;

    static Globals()
    {
        isDebugging = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DEBUGGING"));
    }

    public static bool IsDebugging => isDebugging;

    public static string RequestsFolderAbsolutePath { get; set; } = null;
}
