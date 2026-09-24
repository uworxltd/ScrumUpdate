// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Infrastructure;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using static KhojiGenAIServer.Features.OpenAIEndpoint;
using AIExtensions = Microsoft.Extensions.AI;

namespace KhojiGenAIServer.Features;

// public because of tests
public static class ConversionExtensions
{
    static void applyToolsToOptions(Tool[] tools, AIExtensions.ChatOptions options)
    {
        if (tools == null || tools.Length == 0)
            return;

        var toolsList = new List<AIExtensions.AITool>();
        foreach (var tool in tools)
        {
            if (tool.Type == "function" && tool.Function != null)
            {
                // Convert the parameters object to JsonElement
                var parametersJson = tool.Function.Parameters != null
                    ? JsonSerializer.SerializeToElement(tool.Function.Parameters)
                    : JsonDocument.Parse("{}").RootElement;

                var declaration = AIExtensions.AIFunctionFactory.CreateDeclaration(
                    tool.Function.Name,
                    tool.Function.Description ?? "",
                    parametersJson);

                toolsList.Add(declaration);
            }
        }

        options.Tools = toolsList;
    }

    static IDictionary<string, object?> jsonElementToDictionary(JsonElement element)
    {
        var dict = new Dictionary<string, object?>();

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in element.EnumerateObject())
            {
                dict[prop.Name] = jsonElementToObject(prop.Value);
            }
        }

        return dict;
    }

    static object? jsonElementToObject(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => jsonElementToDictionary(element),
            JsonValueKind.Array => element.EnumerateArray().Select(jsonElementToObject).ToList(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var intValue)
                ? intValue
                : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.GetRawText()
        };
    }

    static JsonElement objectToElement(object value) =>
        value is JsonElement jsonElement
            ? jsonElement
            : JsonSerializer.SerializeToElement(value);

    static string? getStringProperty(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return null;

        if (!element.TryGetProperty(name, out var property))
            return null;

        return property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : null;
    }

    static void applyToolChoiceToOptions(object? toolChoice, AIExtensions.ChatOptions options)
    {
        if (toolChoice is null)
            return;

        var element = objectToElement(toolChoice);
        if (element.ValueKind == JsonValueKind.String)
        {
            var value = element.GetString()?.ToLowerInvariant();
            options.ToolMode = value switch
            {
                "none" => AIExtensions.ChatToolMode.None,
                "auto" => AIExtensions.ChatToolMode.Auto,
                "required" => AIExtensions.ChatToolMode.RequireAny,
                _ => throw new ArgumentException($"Unsupported tool_choice value '{value}'")
            };
            return;
        }

        if (element.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("tool_choice must be a string or object");

        var type = getStringProperty(element, "type")?.ToLowerInvariant();
        if (type != "function")
            throw new ArgumentException("tool_choice object currently supports only type='function'");

        if (!element.TryGetProperty("function", out var function) || function.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("tool_choice.function must be an object");

        var functionName = getStringProperty(function, "name");
        if (string.IsNullOrWhiteSpace(functionName))
            throw new ArgumentException("tool_choice.function.name must be provided");

        options.ToolMode = AIExtensions.ChatToolMode.RequireSpecific(functionName);
    }

    static void applyResponseFormatToOptions(object? responseFormat, AIExtensions.ChatOptions options)
    {
        if (responseFormat is null)
            return;

        var element = objectToElement(responseFormat);

        if (element.ValueKind == JsonValueKind.String)
        {
            var typeValue = element.GetString()?.ToLowerInvariant();
            options.ResponseFormat = typeValue switch
            {
                "text" => AIExtensions.ChatResponseFormat.Text,
                "json_object" => AIExtensions.ChatResponseFormat.Json,
                _ => throw new ArgumentException($"Unsupported response_format value '{typeValue}'")
            };
            return;
        }

        if (element.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("response_format must be a string or object");

        var type = getStringProperty(element, "type")?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(type))
            throw new ArgumentException("response_format.type must be provided");

        switch (type)
        {
            case "text":
                options.ResponseFormat = AIExtensions.ChatResponseFormat.Text;
                return;
            case "json_object":
                options.ResponseFormat = AIExtensions.ChatResponseFormat.Json;
                return;
            case "json_schema":
                if (!element.TryGetProperty("json_schema", out var jsonSchema) ||
                    jsonSchema.ValueKind != JsonValueKind.Object)
                {
                    throw new ArgumentException("response_format.json_schema must be provided for type='json_schema'");
                }

                if (!jsonSchema.TryGetProperty("schema", out var schema) ||
                    (schema.ValueKind != JsonValueKind.Object && schema.ValueKind != JsonValueKind.Array))
                {
                    throw new ArgumentException("response_format.json_schema.schema must be a JSON object or array");
                }

                var schemaName = getStringProperty(jsonSchema, "name");
                var schemaDescription = getStringProperty(jsonSchema, "description");
                options.ResponseFormat = AIExtensions.ChatResponseFormat.ForJsonSchema(schema, schemaName, schemaDescription);

                if (jsonSchema.TryGetProperty("strict", out var strictElement))
                {
                    if (strictElement.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                        throw new ArgumentException("response_format.json_schema.strict must be a boolean");

                    options.AdditionalProperties ??= [];
                    options.AdditionalProperties["strict"] = strictElement.GetBoolean();
                }

                return;
            default:
                throw new ArgumentException($"Unsupported response_format.type '{type}'");
        }
    }

    public static AIExtensions.ChatOptions ToAIChatOptions(this ChatCompletionRequest request)
    {
        var options = new AIExtensions.ChatOptions();

        if (request.Temperature.HasValue)
            options.Temperature = request.Temperature.Value;

        if (request.MaxTokens.HasValue)
            options.MaxOutputTokens = request.MaxTokens.Value;

        if (request.TopP.HasValue)
            options.TopP = request.TopP.Value;

        if (request.FrequencyPenalty.HasValue)
            options.FrequencyPenalty = request.FrequencyPenalty.Value;

        if (request.PresencePenalty.HasValue)
            options.PresencePenalty = request.PresencePenalty.Value;

        if (request.Stop?.Length > 0)
            options.StopSequences = request.Stop.ToList();

        if (request.Tools?.Length > 0)
            applyToolsToOptions(request.Tools, options);

        applyToolChoiceToOptions(request.ToolChoice, options);
        applyResponseFormatToOptions(request.ResponseFormat, options);

        return options;
    }

    public static AIExtensions.ChatMessage ToAIChatMessage(this ChatMessage message)
    {
        var role = message.Role.ToLowerInvariant() switch
        {
            "system" => AIExtensions.ChatRole.System,
            "user" => AIExtensions.ChatRole.User,
            "assistant" => AIExtensions.ChatRole.Assistant,
            "tool" => AIExtensions.ChatRole.Tool,
            _ => AIExtensions.ChatRole.User
        };

        var aiMessage = new AIExtensions.ChatMessage(role, message.Content ?? string.Empty);

        // Handle tool calls
        if (message.ToolCalls?.Length > 0)
        {
            aiMessage.Contents.Clear();

            foreach (var tc in message.ToolCalls)
            {
                // Parse the JSON arguments string into a dictionary
                IDictionary<string, object?>? parsedArgs = null;
                if (!string.IsNullOrEmpty(tc.Function.Arguments))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(tc.Function.Arguments);
                        parsedArgs = jsonElementToDictionary(doc.RootElement);
                    }
                    catch
                    {
                        // If parsing fails, store as string in a dictionary
                        parsedArgs = new Dictionary<string, object?> { ["arguments"] = tc.Function.Arguments };
                    }
                }

                aiMessage.Contents.Add(new AIExtensions.FunctionCallContent(tc.Id, tc.Function.Name, parsedArgs));
            }

            return aiMessage;
        }

        // Handle tool call responses
        if (!string.IsNullOrEmpty(message.ToolCallId))
        {
            aiMessage.Contents.Clear();
            aiMessage.Contents.Add(new AIExtensions.FunctionResultContent(
                message.ToolCallId,
                message.Content ?? string.Empty
            ));
            return aiMessage;
        }

        return aiMessage;
    }

    public static ChatMessage FromAIChatMessage(this AIExtensions.ChatMessage aiMessage)
    {
        var role = aiMessage.Role.Value.ToLowerInvariant();

        // Handle function calls
        var functionCalls = aiMessage.Contents.OfType<AIExtensions.FunctionCallContent>().ToArray();
        if (functionCalls.Length > 0)
        {
            var toolCalls = functionCalls.Select(fc => new ToolCall(
                fc.CallId,
                "function",
                new FunctionCall(fc.Name, fc.Arguments is not null ? JsonSerializer.Serialize(fc.Arguments) : "{}")
            )).ToArray();

            var contentWithToolCalls = extractTextOrJsonContent(aiMessage);
            return new ChatMessage(role,
                string.IsNullOrWhiteSpace(contentWithToolCalls) ? null : contentWithToolCalls,
                null, toolCalls);
        }

        // Handle function results
        var functionResult = aiMessage.Contents.OfType<AIExtensions.FunctionResultContent>().FirstOrDefault();
        if (functionResult != null)
        {
            return new ChatMessage(role, functionResult.Result?.ToString(), null, null, functionResult.CallId);
        }

        var content = extractTextOrJsonContent(aiMessage);
        return new ChatMessage(role, content);
    }

    static string extractTextOrJsonContent(AIExtensions.ChatMessage aiMessage)
    {
        var textParts = aiMessage.Contents
            .OfType<AIExtensions.TextContent>()
            .Select(t => t.Text)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .ToList();
        if (textParts.Count > 0)
            return string.Concat(textParts);

        // Some connectors surface structured output as DataContent instead of TextContent.
        var jsonData = aiMessage.Contents
            .OfType<AIExtensions.DataContent>()
            .FirstOrDefault(dc => !string.IsNullOrWhiteSpace(dc.MediaType) &&
                                  dc.MediaType.Contains("json", StringComparison.OrdinalIgnoreCase));
        if (jsonData is not null)
        {
            var bytes = jsonData.Data;
            if (!bytes.IsEmpty)
                return Encoding.UTF8.GetString(bytes.Span);
        }

        return aiMessage.Text ?? string.Empty;
    }
}

// public because of tests
public class OpenAIEndpoint
{
    public record ChatCompletionRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("messages")] ChatMessage[] Messages,
        [property: JsonPropertyName("temperature")] float? Temperature = null,
        [property: JsonPropertyName("max_tokens")] int? MaxTokens = null,
        [property: JsonPropertyName("top_p")] float? TopP = null,
        [property: JsonPropertyName("frequency_penalty")] float? FrequencyPenalty = null,
        [property: JsonPropertyName("presence_penalty")] float? PresencePenalty = null,
        [property: JsonPropertyName("stop")] string[]? Stop = null,
        [property: JsonPropertyName("stream")] bool Stream = false,
        [property: JsonPropertyName("tools")] Tool[]? Tools = null,
        [property: JsonPropertyName("tool_choice")] object? ToolChoice = null,
        [property: JsonPropertyName("response_format")] object? ResponseFormat = null,
        [property: JsonPropertyName("user")] string? User = null);

    public record ChatMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string? Content = null,
        [property: JsonPropertyName("name")] string? Name = null,
        [property: JsonPropertyName("tool_calls")] ToolCall[]? ToolCalls = null,
        [property: JsonPropertyName("tool_call_id")] string? ToolCallId = null);

    public record Tool(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("function")] FunctionDefinition Function);

    public record FunctionDefinition(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("description")] string? Description = null,
        [property: JsonPropertyName("parameters")] object? Parameters = null);

    public record ToolCall(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("function")] FunctionCall Function);

    public record FunctionCall(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("arguments")] string Arguments);

    public record ChatCompletionResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("object")] string Object,
        [property: JsonPropertyName("created")] long Created,
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("choices")] Choice[] Choices,
        [property: JsonPropertyName("usage")] Usage? Usage = null);

    public record Choice(
        [property: JsonPropertyName("index")] int Index,
        [property: JsonPropertyName("message")] ChatMessage Message,
        [property: JsonPropertyName("finish_reason")] string? FinishReason = null);

    public record Usage(
        [property: JsonPropertyName("prompt_tokens")] long PromptTokens,
        [property: JsonPropertyName("completion_tokens")] long CompletionTokens,
        [property: JsonPropertyName("total_tokens")] long TotalTokens);

    public static async Task<IResult> HandleAsync(IServiceProvider services, HttpRequest request, ChatCompletionRequest chatRequest)
    {
        var logger = services.GetRequiredService<ILogger<OpenAIEndpoint>>();
        if (logger == null)
            return Results.BadRequest("logger is not configured");

        var llmConfig = new LlmConfigs();
        var chatClient = llmConfig.CreateChatClient(chatRequest.Model);
        if (chatClient == null)
            return Results.BadRequest("Chat service is not configured");

        try
        {
            // Convert OpenAI format to Microsoft.Extensions.AI format
            var aiMessages = chatRequest.Messages.Select(m => m.ToAIChatMessage()).ToList();
            var chatOptions = chatRequest.ToAIChatOptions();

            // Parse tenant from header if available
            int? tenantId = null;
            if (request.Headers.TryGetValue("x-tenant", out var tenantHeader))
            {
                if (int.TryParse(tenantHeader.FirstOrDefault(), out var parsedTenant))
                    tenantId = parsedTenant;
            }

            AIExtensions.ChatResponse response = await LlmIntegration.MakeAICallAsync(logger, chatClient,
                "openai-chat-completion", aiMessages, chatOptions,
                tenantId: tenantId);

            if (response == null)
                return Results.BadRequest("No completion generated");

            var usage = response.Usage != null ? new Usage(
                response.Usage.InputTokenCount ?? 0,
                response.Usage.OutputTokenCount ?? 0,
                response.Usage.TotalTokenCount ?? 0
            ) : null;

            var firstMessage = response.Messages.FirstOrDefault();
            if (firstMessage == null)
                return Results.BadRequest("No response message generated");

            var openAIMessage = firstMessage.FromAIChatMessage();

            if (isStructuredJsonRequested(chatRequest) &&
                !string.IsNullOrWhiteSpace(openAIMessage.Content))
            {
                if (!tryNormalizeJson(openAIMessage.Content, out var normalizedJson))
                {
                    return Results.Json(
                        new
                        {
                            error = new
                            {
                                message = "Model response is not valid JSON while response_format requested structured JSON.",
                                type = "invalid_response_error"
                            }
                        },
                        statusCode: StatusCodes.Status502BadGateway);
                }

                openAIMessage = openAIMessage with { Content = normalizedJson };
            }

            // Convert response back to OpenAI format
            var openAIResponse = new ChatCompletionResponse(
                Id: $"chatcmpl-{Guid.NewGuid():N}",
                Object: "chat.completion",
                Created: DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                Model: chatRequest.Model,
                Choices: new[]
                {
                    new Choice(
                        Index: 0,
                        Message: openAIMessage,
                        FinishReason: response.FinishReason?.ToString()?.ToLowerInvariant()
                    )
                },
                Usage: usage
            );

            return Results.Ok(openAIResponse);
        }
        catch (ArgumentException ex)
        {
            logger.LogWarning(ex, "Invalid OpenAI chat completion request");
            return Results.BadRequest(new { error = new { message = ex.Message, type = "invalid_request_error" } });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during chat completion");
            return Results.InternalServerError(new
            {
                error = new
                {
                    message = "The server encountered an error while processing the chat completion request.",
                    type = "internal_error"
                }
            });
        }
    }

    static bool isStructuredJsonRequested(ChatCompletionRequest request)
    {
        if (request.ResponseFormat is null)
            return false;

        JsonElement element = request.ResponseFormat is JsonElement je
            ? je
            : JsonSerializer.SerializeToElement(request.ResponseFormat);

        if (element.ValueKind == JsonValueKind.String)
        {
            var value = element.GetString();
            return string.Equals(value, "json_object", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(value, "json_schema", StringComparison.OrdinalIgnoreCase);
        }

        if (element.ValueKind == JsonValueKind.Object &&
            element.TryGetProperty("type", out var typeElement) &&
            typeElement.ValueKind == JsonValueKind.String)
        {
            var type = typeElement.GetString();
            return string.Equals(type, "json_object", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(type, "json_schema", StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    static bool tryNormalizeJson(string content, out string normalizedJson)
    {
        normalizedJson = null;
        var trimmed = content.Trim();
        if (trimmed.Length == 0)
            return false;

        if (tryParseJson(trimmed, out normalizedJson))
            return true;

        // Handle common fenced-json output from models that don't fully honor schema mode.
        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewline = trimmed.IndexOf('\n');
            if (firstNewline > 0)
            {
                var withoutHeader = trimmed[(firstNewline + 1)..];
                var fenceIndex = withoutHeader.LastIndexOf("```", StringComparison.Ordinal);
                if (fenceIndex >= 0)
                {
                    var inner = withoutHeader[..fenceIndex].Trim();
                    if (tryParseJson(inner, out normalizedJson))
                        return true;
                }
            }
        }

        return false;
    }

    static bool tryParseJson(string text, out string normalizedJson)
    {
        normalizedJson = null;
        try
        {
            using var doc = JsonDocument.Parse(text);
            normalizedJson = doc.RootElement.GetRawText();
            return true;
        }
        catch
        {
            return false;
        }
    }
}
