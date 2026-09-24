// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Features.Kia.Models;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace KhojiGenAIServer.Features.Kia;

// public because of tests
public class WeeklyRetro
{
    public record WeeklyRetroResponse
    {
        [property: JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [property: JsonPropertyName("summary")]
        public string Summary { get; set; } = string.Empty;

        [property: JsonPropertyName("showFeedback")]
        public bool ShowFeedback { get; set; } = true;
    }

    // public because of tests
    public static Dictionary<string, object> ParseApiSummaryResponse(ILogger logger, string logNumber, object apiResponse)
    {
        if (apiResponse is Dictionary<string, object> dict)
        {
            // Case: dict with "summary" key
            if (dict.ContainsKey("summary") && dict["summary"] is string)
                return dict;
            else if (dict.ContainsKey("summary"))
                return dict;
        }
        else if (apiResponse is string strResponse)
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, object>>(strResponse);
                if (parsed is not null)
                    return ParseApiSummaryResponse(logger, logNumber, parsed);
            }
            catch (JsonException)
            {
                logger.LogError($"[{logNumber}] Failed to parse API response as JSON: {strResponse}");
            }
        }

        logger.LogError($"[{logNumber}] Unexpected API response format: {apiResponse.GetType().Name}");
        throw new ArgumentException($"[{logNumber}] Unexpected API response format: {apiResponse}");
    }

    // public because of tests
    public static async Task<WeeklyRetroResponse> SummarizeCurrentWorklogs(IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
        string logNumber, WeeklyRetroRequest data)
    {
        try
        {
            var userRole = data.UserRole;
            var worklogs = data.FormattedIssues;

            if (worklogs.Count == 0)
            {
                logger.LogWarning($"[{logNumber}] No worklogs provided");
                return new WeeklyRetroResponse
                {
                    Message = "No worklogs provided",
                    Summary = "No work logged this week. Please log your work to see insights.",
                    ShowFeedback = false
                };
            }

            var promptName = "kia_weekly-retro";
            var summaryMessage = await LlmLayer.PrepareWeeklyRetroChatMessages(environment, logger, logNumber, promptName, userRole, worklogs);
            object apiResponse = await LlmLayer.WeeklyRetroChatCompletition(services, environment, logger, logNumber, promptName, summaryMessage);

            if (apiResponse is null)
            {
                logger.LogWarning($"[{logNumber}] No summary generated");
                return new WeeklyRetroResponse
                {
                    Message = "No summary generated",
                    Summary = "Unable to generate summary 😓. Please try again later."
                };
            }
            else if (apiResponse is Dictionary<string, object> dict && dict.ContainsKey("error"))
            {
                logger.LogError($"[{logNumber}] Error in API response: {dict["error"]}");
                throw new BadHttpRequestException("Error in API response");
            }

            var parsedResponse = ParseApiSummaryResponse(logger, logNumber, apiResponse);
            return new WeeklyRetroResponse
            {
                Message = "Summary generated successfully",
                Summary = parsedResponse["summary"].ToString() ?? string.Empty
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{logNumber}] An error occurred while preparing the summarization message: {ex.Message}");
            throw new BadHttpRequestException("An error occurred while preparing the summarization message");
        }
    }

    public static WeeklyRetroRequest ConvertToWeeklyRetroFormat(ILogger logger, string logNumber, Dictionary<string, object> rawData, out string userName)
    {
        userName = rawData.GetStringOrEmpty("userName");
        if (string.IsNullOrEmpty(userName))
        {
            logger.LogWarning($"[{logNumber}] User name not found in the raw data");
            return new WeeklyRetroRequest();
        }

        var userRole = rawData.GetStringOrEmpty("userRole");
        if (string.IsNullOrEmpty(userRole))
            logger.LogWarning($"[{logNumber}] No role provided for user: {userName}");

        var issues = rawData.GetListOfDictionaryOrEmpty("issues");
        if (issues.Count() == 0)
        {
            logger.LogWarning($"[{logNumber}] No issues found in the raw data");
            return new WeeklyRetroRequest();
        }

        var excessWorklogs = rawData.GetDictionaryOrEmpty("excessWorklogs");
        foreach (var kvp in excessWorklogs)
        {
            var key = kvp.Key;
            var worklogs = (kvp.Value as List<Dictionary<string, object>>)
                ?? ((kvp.Value as List<object>)?.OfType<Dictionary<string, object>>().ToList()
                ?? new List<Dictionary<string, object>>());

            foreach (var issue in issues)
            {
                if (issue.GetStringOrEmpty("key") == key)
                {
                    var fields = issue.GetOrCreateDictionary("fields");
                    var worklogDict = fields.GetOrCreateDictionary("worklog");
                    worklogDict["worklogs"] = worklogs;
                }
            }
        }

        var dateRange = rawData.GetListOrEmpty("dateRange");
        if (dateRange.Count < 2)
        {
            logger.LogWarning($"[{logNumber}] Date range not provided correctly: {dateRange}");
            return new WeeklyRetroRequest();
        }

        var sortedDates = dateRange.Select(d => d.ToString()).OrderBy(d => d).ToList();
        if (!DateTime.TryParseExact(sortedDates[0], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var startDate) ||
            !DateTime.TryParseExact(sortedDates[1], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var endDate))
        {
            logger.LogError($"[{logNumber}] Error parsing date range: {sortedDates}");
            return new WeeklyRetroRequest();
        }

        var formattedIssues = new List<FormattedIssue>();

        foreach (var issue in issues)
        {
            var key = issue.GetStringOrEmpty("key");
            var fields = issue.GetOrCreateDictionary("fields");
            var summary = fields.GetStringOrEmpty("summary");
            var worklogDict = fields.GetOrCreateDictionary("worklog");
            var worklogs = worklogDict.GetListOfDictionaryOrEmpty("worklogs");
            var filteredWorklogs = new List<Dictionary<string, object>>();

            foreach (var worklog in worklogs)
            {
                var authorName = worklog.GetDictionaryOrEmpty("author").GetStringOrEmpty("displayName");
                if (authorName != userName) continue;

                var startedStr = worklog.GetStringOrEmpty("started");
                if (string.IsNullOrEmpty(startedStr)) continue;

                var worklogDate = worklog.GetDateOrNull("started");
                if (worklogDate is null) continue;

                if (worklogDate >= startDate && worklogDate <= endDate)
                    filteredWorklogs.Add(worklog);
            }

            var worklogsStr = string.Join(" | ",
                filteredWorklogs.Select(w =>
                    $"{(w.TryGetValue("timeSpent", out var ts) ? ts?.ToString()?.Trim() ?? string.Empty : string.Empty)} " +
                    $"({(w.TryGetValue("comment", out var c) ? c?.ToString()?.Trim() ?? string.Empty : string.Empty)})"
                )
            );

            formattedIssues.Add(new FormattedIssue
            {
                Key = key,
                Summary = summary,
                Worklogs = worklogsStr
            });
        }

        if (formattedIssues.Count == 0)
        {
            logger.LogWarning($"[{logNumber}] No formatted issues");
            return new WeeklyRetroRequest();
        }

        return new WeeklyRetroRequest
        {
            UserRole = userRole,
            FormattedIssues = formattedIssues
        };
    }

    public static async Task<WeeklyRetroResponse> GenerateWeeklyRetro(IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
        string logNumber, WeeklyRetroRequest data)
    {
        return await SummarizeCurrentWorklogs(services, environment, logger, logNumber, data);
    }
}
