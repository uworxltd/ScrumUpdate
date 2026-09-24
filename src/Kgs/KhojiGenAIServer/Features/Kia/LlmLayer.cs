// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Features.Kia.Models;
using KhojiGenAIServer.Infrastructure;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace KhojiGenAIServer.Features.Kia;

// public because of tests
public static class LlmLayer
{
    static string? extractJson(string text, char open, char close)
    {
        var start = text.IndexOf(open);
        var end = text.LastIndexOf(close) + 1;
        return (start != -1 && end > start) ? text.Substring(start, end - start) : null;
    }

    static bool tryGetJsonEnd(string input, int startPosition, out int endPosition)
    {
        int braceCount = 0;
        bool inString = false;
        bool escaped = false;

        for (int i = startPosition; i < input.Length; i++)
        {
            char c = input[i];

            if (!inString)
            {
                if (c == '{') braceCount++;
                else if (c == '[') braceCount++;
                else if (c == ']') braceCount--;
                else if (c == '}') braceCount--;
                else if (c == '"') inString = true;
            }
            else
            {
                if (escaped)
                    escaped = false;
                else if (c == '\\')
                    escaped = true;
                else if (c == '"')
                    inString = false;
            }

            if (braceCount == 0 && i > startPosition)
            {
                endPosition = i;
                return true; // Complete object found
            }
        }

        endPosition = -1;
        return false;
    }

    static string extractLastJsonBlock(string input) // Brace counting
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        int lastValidStart = -1;
        for (int i = input.Length - 1; i >= 0; i--) // Scanning backwards to find the last complete JSON object
        {
            if (input[i] == '{' && !input.Substring(0, i).Contains('{'))
                if (tryGetJsonEnd(input, i, out int end))
                {
                    //lastValidStart = i;
                    //break;
                    return input.Substring(i, end - i + 1).Trim();
                }
        }

        return lastValidStart >= 0 ? input.Substring(lastValidStart).Trim() : string.Empty;
    }

    static string cleanLlmResponseForWeeklyRetro(string content)
    {
        var arrayJson = extractJson(content, '[', ']');
        if (arrayJson is null) return content; // we dont have [] problem

        var afterArray = content.IndexOf(']', content.IndexOf('[')) + 1;
        var remainder = (afterArray > 0 && afterArray < content.Length)
            ? content.Substring(afterArray).Trim()
            : string.Empty;

        return !string.IsNullOrEmpty(remainder) ? remainder : content;
    }

    static bool isCompleteScrumUpdateJsonObject(string input, int startPosition)
    {
        int braceCount = 0;
        bool inString = false;
        bool escaped = false;

        for (int i = startPosition; i < input.Length; i++)
        {
            char c = input[i];

            if (!inString)
            {
                if (c == '{') braceCount++;
                else if (c == '}') braceCount--;
                else if (c == '"') inString = true;
            }
            else
            {
                if (escaped)
                    escaped = false;
                else if (c == '\\')
                    escaped = true;
                else if (c == '"')
                    inString = false;
            }

            if (braceCount == 0 && i > startPosition)
                return true; // Complete object found
        }

        return false;
    }

    static string extractJsonScrumUpdate(string input)
    { // Brace counting
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        int lastValidStart = -1;
        for (int i = input.Length - 1; i >= 0; i--) // Scanning backwards to find the last complete JSON object
        {
            if (input[i] == '{')
                if (isCompleteScrumUpdateJsonObject(input, i))
                {
                    lastValidStart = i;
                    break;
                }
        }

        return lastValidStart >= 0 ? input.Substring(lastValidStart).Trim() : string.Empty;
    }

    static async Task<Dictionary<string, object>?> executeChatCompletionAsync(
        IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
        List<ChatMessage> messages, string promptName, ChatOptions options,
        Func<IServiceProvider, IChatClient?> chatClientFactory = null,
        Func<string, string>? postProcessResponse = null,
        Func<string, Dictionary<string, object>?>? deserialize = null,
        Func<Dictionary<string, object>?>? fallbackFactory = null,
        string? logNumber = null)
    {
        int? tenantId = null; // Parse tenant from header if available
        var httpContext = services.GetService<IHttpContextAccessor>()?.HttpContext;
        if (httpContext?.Request.Headers.TryGetValue("x-tenant", out var tenantHeader) == true &&
            int.TryParse(tenantHeader.FirstOrDefault(), out var parsedTenant))
        {
            tenantId = parsedTenant;
        }

        IChatClient chatClient = null != chatClientFactory
            ? chatClientFactory(services)
            : services.GetService<IChatClient>();

        if (chatClient == null)
        {
            logger.LogWarning("[{LogNumber}] LLM not available", logNumber);
            return fallbackFactory?.Invoke();
        }

        ChatResponse response = await LlmIntegration.MakeAICallAsync(logger, chatClient,
            promptName, messages, options,
            logNumber, tenantId);

        if (response is null)
            throw new OperationCanceledException("LLM call returned null response");

        var content = response.Text ?? string.Empty;

        if (null != environment)
        {
            var logFile = await environment.LogLlmResponseAsync(logNumber, content);
            if (!string.IsNullOrEmpty(logFile))
                logger.LogInformation("[{LogNumber}] LLM response file created: {File}",
                    logNumber, logFile);
        }

        if (postProcessResponse != null)
            content = postProcessResponse(content);

        if (null != environment && content != null)
        {
            var logFile = await environment.LogExtractedJsonAsync(logNumber, content);
            if (!string.IsNullOrEmpty(logFile))
                logger.LogInformation("[{LogNumber}] Extracted JSON saved in {File}",
                    logNumber, logFile);
        }

        try
        {
            if (deserialize != null)
            {
                var parsed = deserialize(content);
                if (parsed != null) return parsed;
            }
            else
            {
                var start = content.IndexOf('{');
                var end = content.LastIndexOf('}') + 1;
                if (start < 0 || end <= start) return fallbackFactory?.Invoke();

                var jsonContent = content.Substring(start, end - start);
                try
                {
                    var parsed = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonContent);
                    if (parsed is not null) return parsed;
                }
                catch (JsonException ex)
                {
                    logger.LogError(ex, $"[{logNumber}] Failed to deserialize to JSON");
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{LogNumber}] Deserializing error", logNumber);
        }

        logger.LogError("[{LogNumber}] No valid JSON object found", logNumber);
        return fallbackFactory?.Invoke();
    }

    public static async Task<List<ChatMessage>> PrepareWeeklyRetroChatMessages(
        IWebHostEnvironment environment, ILogger logger, string logNumber, string promptName,
        string userRole, List<FormattedIssue> worklogs)
    {
        var additionalProperties = new AdditionalPropertiesDictionary();
        additionalProperties.Add("cache_control", new Dictionary<string, object>
        {
            ["type"] = "ephemeral"
        });
        var prompt = LlmIntegration.GetPromptContent(promptName);
        List<ChatMessage> list = [new ChatMessage(ChatRole.System, prompt) { AdditionalProperties = additionalProperties }];

        var userMessage = $"""
            ### User Role
            {userRole}

            ### Combined Worklogs
            {JsonSerializer.Serialize(worklogs)}
            """;

        var logFile = await environment.LogLlmRequestAsync(logNumber, userMessage);
        if (!string.IsNullOrEmpty(logFile)) logger.LogInformation($"[{logNumber}] LLM request file created: {logFile}");
        list.Add(new ChatMessage(ChatRole.User, userMessage));

        return list;
    }

    public static async Task<List<ChatMessage>> PrepareCategorizationChatMessages(
        IWebHostEnvironment environment, ILogger logger, string logNumber, string promptName,
        IEnumerable<IssueTypeEntry> issueTypes)
    {
        var prompt = LlmIntegration.GetPromptContent(promptName);
        var list = new List<ChatMessage>
        {
            new(ChatRole.System, prompt)
        };

        var userMessage = $"""
            ## Issue Types
            {JsonSerializer.Serialize(issueTypes)}
         """;

        var logFile = await environment.LogLlmRequestAsync(logNumber, userMessage);
        if (!string.IsNullOrEmpty(logFile)) logger.LogInformation($"[{logNumber}] LLM request file created: {logFile}");
        list.Add(new ChatMessage(ChatRole.User, userMessage));

        return list;
    }

    public static async Task<List<ChatMessage>> PrepareScrumUpdateChatMessages(
        IWebHostEnvironment environment, ILogger logger, string logNumber, string promptName,
        string yesterday, string today, string userName, string userRole,
        List<CalendarEvent> calendarEvents = null,
        List<ActivityLog> activityLogs = null,
        string summary = null)
    {
        var additionalProperties = new AdditionalPropertiesDictionary();
        additionalProperties.Add("cache_control", new Dictionary<string, object>
        {
            ["type"] = "ephemeral"
        });
        var prompt = LlmIntegration.GetPromptContent(promptName);
        List<ChatMessage> list = [new ChatMessage(ChatRole.System, prompt) { AdditionalProperties = additionalProperties }];

        var userMessage = $"""
        ### Date
        Last Working Date (Yesterday): {yesterday}
        Today's Date: {today}

        ### Resource name for whom update needs to be generated:
        {userName}

        ### Resource role for which update needs to be generated:
        {userRole}

        ### User summary for the last week's worklog:
        {summary}

        ### Any meetings or events the user attended:
        {JsonSerializer.Serialize(calendarEvents)}

        ### User Activity logs from Jira
        {JsonSerializer.Serialize(activityLogs)}
        """;

        var logFile = await environment.LogLlmRequestAsync(logNumber, userMessage);
        if (!string.IsNullOrEmpty(logFile)) logger.LogInformation($"[{logNumber}] LLM request file created: {logFile}");
        list.Add(new ChatMessage(ChatRole.User, userMessage));

        return list;
    }

    public static async Task<List<ChatMessage>> PrepareWorklogGenerationChatMessages(
        IWebHostEnvironment environment, ILogger logger, string logNumber, string promptName,
        string date, string userName, string userRole, int remainingHours,
        List<CalendarEvent> calendarEvents = null,
        List<CalendarTicket> calendarTickets = null,
        List<ActivityLog> activityLogs = null,
        string summary = null,
        Dictionary<string, object> external_references = null)
    {
        var additionalProperties = new AdditionalPropertiesDictionary();
        additionalProperties.Add("cache_control", new Dictionary<string, object>
        {
            ["type"] = "ephemeral"
        });
        var prompt = LlmIntegration.GetPromptContent(promptName);
        List<ChatMessage> list = [new ChatMessage(ChatRole.System, prompt) { AdditionalProperties = additionalProperties }];

        var userMessage = $"""
        ## Remaining Hours
        {remainingHours}

        ## Resource name for whom logs needs to be generated:
        {userName}

        ## Resource role for which logs needs to be generated:
        {userRole}
        
        ## Date to generate worklog:
        {date}

        ## User summary for the last week's worklog:
        {summary}

        ## User Activity Logs
        {JsonSerializer.Serialize(activityLogs)}

        ## External References
        {JsonSerializer.Serialize(external_references)}

        ## Calendar Events
        {JsonSerializer.Serialize(calendarEvents)}

        ## Calendar Tickets
        {JsonSerializer.Serialize(calendarTickets)}
        """;

        var logFile = await environment.LogLlmRequestAsync(logNumber, userMessage);
        if (!string.IsNullOrEmpty(logFile)) logger.LogInformation($"[{logNumber}] LLM request file created: {logFile}");
        list.Add(new ChatMessage(ChatRole.User, userMessage));

        return list;
    }

    public static async Task<Dictionary<string, object>> WeeklyRetroChatCompletition(
        IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
        string logNumber, string promptName, List<ChatMessage> messages,
        float temperature = 0,
        int maxTokens = 8192)
    {
        messages.Add(new ChatMessage(ChatRole.Assistant, "Here is the JSON array of combined worklogs:"));

        var options = new ChatOptions
        {
            Temperature = temperature,
            MaxOutputTokens = maxTokens
        };

        try
        {
            return await executeChatCompletionAsync(services, environment, logger,
                messages, promptName, options,
                chatClientFactory: sp =>
                {
                    var chatClient = services.GetService<IChatClient>();
                    if (chatClient == null)
                    {
                        logger.LogWarning($"[{logNumber}] LLM not available");
                        return null;
                    }

                    return new ChatClientBuilder(chatClient)
                        .UseDistributedCache(new MemoryDistributedCache(
                            Options.Create(new MemoryDistributedCacheOptions())))
                        .Build();
                },
                postProcessResponse: cleanLlmResponseForWeeklyRetro,
                fallbackFactory: () => new Dictionary<string, object>
                {
                    ["message"] = "No Summary generated",
                    ["summary"] = "Unable to generate summary at the moment 😓. Please try again later."
                },
                logNumber: logNumber
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{logNumber}] Unexpected error");
            throw;
        }
    }

    public static async Task<Dictionary<string, object>> CategorizationChatCompletion(
        IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
        string logNumber, string promptName, List<ChatMessage> messages,
        string model = null,
        float temperature = 0,
        int maxTokens = 8192)
    {
        messages.Add(new ChatMessage(ChatRole.Assistant, "Here is the array of issue types:"));

        var options = new ChatOptions
        {
            Temperature = temperature,
            MaxOutputTokens = maxTokens
        };

        try
        {
            return await executeChatCompletionAsync(services, environment, logger,
                messages, promptName, options,
                chatClientFactory: _ =>
                {
                    if (!string.IsNullOrEmpty(model))
                        return new LlmConfigs().CreateChatClient(model, maxTokens);

                    return services.GetService<IChatClient>();
                },
                deserialize: c =>
                {
                    var jsonObjects = c.ExtractJsonObjects();
                    if (jsonObjects.Count == 0) return null;

                    var content = jsonObjects[^1];

                    // Try to extract JSON object from response text but we already know its a json
                    var start = content.IndexOf('{');
                    var end = content.LastIndexOf('}') + 1;

                    if (start != -1 && end != -1 && end > start)
                    {
                        var jsonContent = content.Substring(start, end - start);
                        return jsonContent.ReadFromJsonNewtonSoft();
                    }

                    return null;
                },
                logNumber: logNumber
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{logNumber}] Unexpected error");
            throw;
        }
    }

    public static async Task<Dictionary<string, object>> ScrumUpdateChatCompletion(
        IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
        string logNumber, string promptName, List<ChatMessage> messages,
        float temperature = 0,
        int maxTokens = 8192)
    {
        messages.Add(new ChatMessage(
            ChatRole.Assistant,
            "Here is the JSON array of combined worklogs:"));

        var options = new ChatOptions
        {
            Temperature = temperature,
            MaxOutputTokens = maxTokens
        };

        try
        {
            return await executeChatCompletionAsync(services, environment, logger,
                messages, promptName, options,
                postProcessResponse: extractJsonScrumUpdate,
                fallbackFactory: () => new Dictionary<string, object>
                {
                    ["error"] = "No valid JSON object found in the response"
                },
                logNumber: logNumber
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{logNumber}] Unexpected error");
            throw;
        }
    }

    public static async Task<Dictionary<string, object>> WorklogGenerationChatCompletion(
        IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
        string logNumber, string promptName, List<ChatMessage> messages,
        float temperature = 0,
        int maxTokens = 8192)
    {
        messages.Add(new ChatMessage(ChatRole.Assistant, "Here is the JSON array of combined worklogs:"));

        var options = new ChatOptions
        {
            Temperature = temperature,
            MaxOutputTokens = maxTokens
        };

        try
        {
            return await executeChatCompletionAsync(services, environment, logger,
                messages, promptName, options,
                postProcessResponse: extractLastJsonBlock,
                fallbackFactory: () => new Dictionary<string, object>
                {
                    ["error"] = "No valid JSON object found in the response"
                },
                logNumber: logNumber
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{logNumber}] Unexpected error");
            throw;
        }
    }
}