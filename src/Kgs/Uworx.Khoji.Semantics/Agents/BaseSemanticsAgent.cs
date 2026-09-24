// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace Uworx.Khoji.Semantics.Agents;

public abstract class BaseSemanticsAgent
{
    protected IntentDetector Intents;

    public BaseSemanticsAgent()
    {
        this.Intents = IntentDetector.LoadIntentsFrom(Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "Intents"));
    }

    protected virtual bool MatchesIntent(string userMessage, IntentDetector.SupportedIntents intent) =>
        !string.IsNullOrEmpty(userMessage) &&
        this.Intents.MatchesIntent(userMessage, intent.ToString());
}
