// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.Extensions.AI;

namespace KhojiGenAIServer.Chat;

enum QuestionCategory
{
    WorkloadAndCapacity,
    SprintProgress,
    CarryOverAndDebt,
    PriorityAndBlocks,
    General
}

class QuestionClassifier
{
    private readonly Dictionary<QuestionCategory, string[]> categoryKeywords = new()
    {
        {
            QuestionCategory.WorkloadAndCapacity,
            [ "workload", "capacity", "team", "available", "busy", "overload", "assign", "who can" ]
        },
        {
            QuestionCategory.SprintProgress,
            [ "progress", "on track", "completion", "status", "how are we", "sprint goal" ]
        },
        {
            QuestionCategory.CarryOverAndDebt,
            [ "carry over", "previous sprint", "technical debt", "old issues", "carried" ]
        },
        {
            QuestionCategory.PriorityAndBlocks,
            [ "priority", "high priority", "blocked", "blocker", "critical", "urgent" ]
        }
    };

    public async Task<QuestionCategory> ClassifyQuestion(string question, IChatClient client)
    {
        var lowerQuestion = question.ToLower();

        foreach (var category in categoryKeywords)
            if (category.Value.Any(keyword => lowerQuestion.Contains(keyword)))
                return category.Key;

        // Fallback to LLM classification
        var prompt = $"""
            Classify this Scrum Master question into one of these categories:
            - WorkloadAndCapacity
            - SprintProgress  
            - CarryOverAndDebt
            - PriorityAndBlocks
            - General

            Question: {question}

            Category:
            """;

        var response = await client.GetResponseAsync(
        [
            new(ChatRole.User, prompt)
        ]);

        if (Enum.TryParse<QuestionCategory>(response.Text, out var finalCategory))
            return finalCategory;

        return QuestionCategory.General;
    }
}