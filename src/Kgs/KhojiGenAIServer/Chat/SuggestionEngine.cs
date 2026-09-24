// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Chat;

static class SuggestionEngine
{
    public static string GetSuggestions(QuestionCategory category, Dictionary<string, string> currentData)
    {
        var suggestions = new List<string>();

        // Add category-specific suggestions based on data patterns
        switch (category)
        {
            case QuestionCategory.WorkloadAndCapacity:
                if (currentData.ContainsKey("unassigned") && !string.IsNullOrEmpty(currentData["unassigned"]))
                    suggestions.Add("💡 Consider checking available team members for unassigned work");
                break;
            case QuestionCategory.SprintProgress:
                suggestions.Add("💡 You might also want to check for blocked issues that could impact progress");
                break;
        }

        return suggestions.Any()
            ? $"\n**Suggestions**:\n{string.Join("\n", suggestions)}"
            : "";
    }
}
