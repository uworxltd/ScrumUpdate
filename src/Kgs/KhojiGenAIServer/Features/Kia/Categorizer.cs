// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Features.Kia.Models;

namespace KhojiGenAIServer.Features.Kia;

// public because of tests
public class Categorizer
{
    // public because of tests
    public static List<IssueTypeEntry> ExtractIssueTypes(
        ILogger<Categorizer> logger, Dictionary<string, object> rawData)
    {
        logger.LogDebug("Extracting issue types");

        var dataList = rawData.GetListOfDictionaryOrEmpty("Data");

        // Find first entry with type = "issueTypes"
        var issuetypes = dataList.FirstOrDefault(d =>
            d.GetValueOrDefault<string>("type") == "issueTypes"
        ) ?? [];

        var issuesData = issuetypes.GetListOfDictionaryOrEmpty("data");

        if (issuesData.Count == 0)
        {
            logger.LogWarning("No issues data found");
            return [];
        }

        var issueTypes = new List<IssueTypeEntry>();
        var existingNames = new HashSet<string>();

        foreach (var issue in issuesData)
        {
            var issueType = issue.GetValueOrDefault<string>("name");
            if (existingNames.Contains(issueType)) continue;

            existingNames.Add(issueType);
            issueTypes.Add(new IssueTypeEntry
            {
                Name = issueType,
                Id = issue.GetValueOrDefault<string>("id") ?? "",
                Description = issue.GetValueOrDefault<string>("description") ?? "",
                Subtask = issue.GetValueOrDefault("subtask") is bool subtask && subtask,
                HierarchyLevel = issue.GetValueOrDefault("heirarchyLevel") is long hl
                    ? (int)hl
                    : issue.GetValueOrDefault("heirarchyLevel") is int hi ? hi : 0
            });
        }

        logger.LogDebug("Issue types extracted: {Count}", issueTypes.Count);

        return issueTypes;
    }

    // public because of tests
    public static async Task<CategorizationResult> Categorize(
        IServiceProvider services, IWebHostEnvironment environment, ILogger<Categorizer> logger,
        string logNumber, IEnumerable<IssueTypeEntry> issueTypes)
    {
        if (!issueTypes.Any())
        {
            logger.LogWarning("No issue types provided for categorization");
            return new CategorizationResult
            {
                Message = "No issue types provided"
            };
        }

        var promptName = "kia_role_categorization";
        var messages = await LlmLayer.PrepareCategorizationChatMessages(environment, logger, logNumber, promptName, issueTypes);
        var response = await LlmLayer.CategorizationChatCompletion(services, environment, logger, logNumber, promptName, messages,
            model: "claude-haiku");

        if (response == null || response.ContainsKey("error"))
        {
            logger.LogError("Failed to get response from LLM for categorization");
            return new CategorizationResult
            {
                Message = "No categories generated"
            };
        }

        return ParseApiResponseCategorizer(response);
    }

    // public because of tests
    public static CategorizationResult ParseApiResponseCategorizer(Dictionary<string, object> aiResponse)
    {
        var result = new CategorizationResult { Message = "Issues categorized successfully" };
        var categoriesList = aiResponse.GetListOfDictionaryOrEmpty("data");

        foreach (var entry in categoriesList)
        {
            var parsedEntry = new IssueCategory
            {
                Title = entry.GetValueOrDefault<string>("title") ?? ""
            };

            foreach (var issueType in entry.GetListOfDictionaryOrEmpty("issueTypes"))
            {
                parsedEntry.IssueTypes.Add(new IssueTypeRef
                {
                    IssueTypeId = issueType.GetValueOrDefault<string>("issueTypeId") ?? "",
                    IssueTypeName = issueType.GetValueOrDefault<string>("issueTypeName") ?? ""
                });
            }

            result.Data.Add(parsedEntry);
        }

        return result;
    }

    // public because of tests
    public static List<IssueTypeEntry> ReadyForCategorize(
        ILogger<Categorizer> logger, Dictionary<string, object> rawData)
    {
        return ExtractIssueTypes(logger, rawData);
    }

    public static Task<CategorizationResult> CallAiIssueCategorizer(
        IServiceProvider services, IWebHostEnvironment environment, ILogger<Categorizer> logger,
        string logNumber, IEnumerable<IssueTypeEntry> issueTypes)
    {
        return Categorize(services, environment, logger, logNumber, issueTypes);
    }
}