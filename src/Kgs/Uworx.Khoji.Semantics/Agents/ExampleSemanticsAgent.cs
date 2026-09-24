// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace Uworx.Khoji.Semantics.Agents;

public class ExampleSemanticsAgent : BaseSemanticsAgent
{
    public string Invoke(string input)
    {
        if (base.MatchesIntent(input, IntentDetector.SupportedIntents.ScrumUpdate))
            return "I should tell you about your scrum update, but I am just an Example agent";
        else if (base.MatchesIntent(input, IntentDetector.SupportedIntents.WeeklyRetro))
            return "I should tell you about your weekly retro, but I am just an Example agent";
        else if (base.MatchesIntent(input, IntentDetector.SupportedIntents.Greeting))
            return "I should greet you but I am just an Example agent";
        else
            return "I am sorry but I am just an Example agent";
    }
}
