// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Anthropic;
using Google.GenAI;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Infrastructure;
using KhojiGenAIServer.Services;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Caching.Distributed;
using OpenAI;
using System.ClientModel;
using System.ClientModel.Primitives;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Unleash;

namespace KhojiGenAIServer.Features;

static class LlmIntegration
{
    public record LlmRequest(
        [property: JsonPropertyName("instance")] int Instance,
        [property: JsonPropertyName("prompt")] string Prompt,
        [property: JsonPropertyName("input")] string? Input,
        [property: JsonPropertyName("data")] JsonElement? Data,
        [property: JsonPropertyName("llm")] string Llm = null);

    public static bool LlmAvailable = false;
    public static string LlmModel = null;

    static async Task logHttpFailureAsync(ILogger logger, Stopwatch stopWatch,
        string llm, string prompt, Exception ex,
        string logNumber = null, int? tenantId = null,
        int? status = null,
        string? errorCode = null)
    {
        stopWatch.Stop();

        string message = $"LLM call {{llm: {llm}, prompt: {prompt}}} failed, took {stopWatch.Elapsed}";

        if (status != null)
            message = $"LLM call {{llm: {llm}, prompt: {prompt}}} failed, HTTP failure ({status}, {errorCode}), took {stopWatch.Elapsed}";

        if (!string.IsNullOrWhiteSpace(logNumber))
            message = $"[{logNumber}] {message}";

        logger.LogError(ex, message);

        // Log LLM failure to database
        try
        {
            using var dbContext = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
            var llmCallFailure = new LlmCallFailure
            {
                LlmName = llm,
                PromptName = prompt ?? "unknown",
                StatusCode = status,
                ErrorCode = errorCode.Left(500),
                TenantId = tenantId,
                ExceptionType = ex.GetType().ToString().Left(100),
                ExceptionMessage = ex.Message.Left(500),
                Exception = ex.ToString()
            };

            dbContext.LlmCallFailures.Add(llmCallFailure);
            await dbContext.SaveChangesAsync();
        }
        catch (Exception logEx)
        {
            if (string.IsNullOrWhiteSpace(logNumber))
                logger.LogError(logEx, $"[{logNumber}] Failed to log LLM failure to database");
            else
                logger.LogError(logEx, $"[{logNumber}] Failed to log LLM failure to database");
        }
    }

    static async Task<T> tryCatchAiCallAsync<T>(ILogger logger, Stopwatch stopWatch,
        Func<Task<T>> aiCall,
        string llm, string prompt, string logNumber, int? tenantId)
    {
        try
        {
            return await aiCall();
        }
        catch (Azure.RequestFailedException ex)
        {
            await logHttpFailureAsync(logger, stopWatch, llm, prompt, ex,
                logNumber, tenantId,
                ex.Status, ex.ErrorCode);
            throw;
        }
        catch (HttpRequestException ex) when (ex.StatusCode.HasValue)
        {
            await logHttpFailureAsync(logger, stopWatch, llm, prompt, ex,
                logNumber, tenantId,
                status: (int)ex.StatusCode.Value);
            throw;
        }
        catch (Exception ex) //TaskCanceledException, SocketException
        {
            await logHttpFailureAsync(logger, stopWatch, llm, prompt, ex,
                logNumber, tenantId);
            throw;
        }
    }

    static string? getModelId(IChatClient client)
    {
        if (client == null) return null;
        return client.GetService<ChatClientMetadata>()?.DefaultModelId;
    }

    public static void AddLlmIntegration(this IServiceCollection services)
    {
        var llmApi = Environment.GetEnvironmentVariable("LLM_API")?.ToLowerInvariant() ?? "claude";

        if (llmApi == "gemini")
        {
            var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
            var model = Environment.GetEnvironmentVariable("GEMINI_MODEL");

            if (!string.IsNullOrWhiteSpace(model) && !string.IsNullOrWhiteSpace(apiKey))
            {
                var client = new Client(apiKey: apiKey);
                var chatClientBuilder = client.AsIChatClient(model).AsBuilder().ConfigureOptions(c =>
                {
                    c.MaxOutputTokens = 8192; //aligned with KIA
                    c.ModelId = model;
                });

                services.AddTransient(sp => chatClientBuilder.Build());
                LlmAvailable = true;
                LlmModel = llmApi;
            }
            else
                Console.WriteLine($"[WARNING] Gemini LLM not configured properly. Please set GEMINI_API_KEY and GEMINI_MODEL environment variables");
        }
        else if (llmApi == "openai")
        {
            var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            var apiUrl = Environment.GetEnvironmentVariable("OPENAI_API_URL");
            var model = Environment.GetEnvironmentVariable("OPENAI_MODEL");

            if (!string.IsNullOrWhiteSpace(model) && !string.IsNullOrWhiteSpace(apiUrl) && !string.IsNullOrWhiteSpace(apiKey))
            {
                var httpClient = services.BuildServiceProvider()
                    .GetRequiredService<System.Net.Http.IHttpClientFactory>()
                    .CreateClient("LlmClient"); // with 600s timeout

                var options = new OpenAIClientOptions
                {
                    Endpoint = new Uri(apiUrl),
                    Transport = new HttpClientPipelineTransport(httpClient)
                };

                var openAIClient = new OpenAIClient(new ApiKeyCredential(apiKey), options)
                    .GetChatClient(model)
                    .AsIChatClient();
                services.AddChatClient(openAIClient);
                //.UseFunctionInvocation()
                //.UseLogging()
                //.UseOpenTelemetry(configure: c =>
                //    c.EnableSensitiveData = builder.Environment.IsDevelopment());

                LlmAvailable = true;
                LlmModel = llmApi;
            }
            else
                Console.WriteLine($"[WARNING] OpenAI LLM not configured properly. Please set OPENAI_API_KEY, OPENAI_API_URL and OPENAI_MODEL environment variables");
        }
        else
        {
            var apiKey = Environment.GetEnvironmentVariable("CLAUDE_API_KEY");
            var model = Environment.GetEnvironmentVariable("CLAUDE_MODEL");

            if (!string.IsNullOrEmpty(model) && !string.IsNullOrWhiteSpace(apiKey))
            {
                services.AddTransient(sp =>
                {
                    var client = new AnthropicClient()
                    {
                        ApiKey = apiKey,
                        Timeout = TimeSpan.FromSeconds(600),
                        HttpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(600) }
                    };
                    var chatClientBuilder = client.AsIChatClient(model)
                        .AsBuilder()
                        .ConfigureOptions(options =>
                        {
                            options.MaxOutputTokens = 8192; //aligned with KIA
                        });
                    //.UseFunctionInvocation()

                    return chatClientBuilder.Build();
                });
                LlmAvailable = true;
                LlmModel = llmApi;
            }
            else
                Console.WriteLine($"[WARNING] Claude LLM not configured properly. Please set CLAUDE_API_KEY and CLAUDE_MODEL environment variables");
        }
    }

    public static bool AddPromptAndMessage(this List<ChatMessage> messages, string promptName, string message)
    {
        var xmlFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Prompts", $"{promptName}.xml");
        if (File.Exists(xmlFile))
        {
            var systemPrompt = File.ReadAllText(xmlFile);
            messages.Add(new ChatMessage(ChatRole.System, systemPrompt));
            messages.Add(new ChatMessage(ChatRole.User, message));
        }
        else
        {
            var file = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Prompts", $"{promptName}.txt");
            if (!File.Exists(file))
                return false;
            else
            {
                var prompt = File.ReadAllText(file);
                if (prompt.Contains("{input}"))
                    messages.Add(new ChatMessage(ChatRole.User, prompt.Replace("{input}", message)));
                else
                {
                    messages.Add(new ChatMessage(ChatRole.System, prompt));
                    messages.Add(new ChatMessage(ChatRole.User, message));
                }
            }
        }

        return true;
    }

    public static string GetPromptContent(string promptName)
    {
        var xmlFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Prompts", $"{promptName}.xml");
        if (File.Exists(xmlFile)) return File.ReadAllText(xmlFile);

        var file = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Prompts", $"{promptName}.txt");
        if (File.Exists(file)) return File.ReadAllText(file);

        return null;
    }

    public static async Task<IResult> HandleAsync(IServiceScope scope, IWebHostEnvironment environment,
        HttpContext context, HttpRequest request, HttpResponse response,
        string logNumber, LlmRequest llmRequest)
    {
        if (llmRequest.Instance <= 0)
            return Results.BadRequest(new { error = "'instance' must be provided" });

        if (string.IsNullOrWhiteSpace(llmRequest.Input) &&
            (!llmRequest.Data.HasValue || llmRequest.Data.Value.ValueKind == JsonValueKind.Undefined))
            return Results.BadRequest(new { error = "Either 'input' or 'data' must be provided" });

        bool kgsLlmFeatureFlag = false;

        var logger = scope.ServiceProvider.GetRequiredService<ILogger<LlmRequest>>();
        var unleash = scope.ServiceProvider.GetService<IUnleash>();

        if (unleash != null) kgsLlmFeatureFlag = unleash.IsEnabled("kgs-llm", false);
        if (Environment.GetEnvironmentVariable("KGS-LLM").HasText()) kgsLlmFeatureFlag = true;

        string message = llmRequest.Input;
        if (llmRequest.Data.HasValue)
            message = llmRequest.Data.Value.ToString();

        ChatResponse llmResponse = null;
        Func<Task<IResult>> invokeLlm = async () =>
        {
            if (!kgsLlmFeatureFlag)
            {
                var message = "kgs-llm feature flag is not enabled, KGS-LLM environment variable is also not set";

                var filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"llm-{llmRequest.Prompt}-response.json");
                if (File.Exists(filePath))
                {
                    logger.LogWarning($"[{logNumber}] {message}, Using hard coded response from {filePath}");
                    var reply = await File.ReadAllTextAsync(filePath);
                    return Results.Ok(new { hardCoded = filePath, reply });
                }
                else
                {
                    filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"llm-{llmRequest.Prompt}-response.txt");
                    if (File.Exists(filePath))
                    {
                        logger.LogWarning($"[{logNumber}] {message}, Using hard coded response from {filePath}");
                        var reply = await File.ReadAllTextAsync(filePath);
                        return Results.Ok(new { hardCoded = filePath, reply });
                    }
                }

                logger.LogWarning($"[{logNumber}] {message}, {filePath} not found");
                return Results.Problem("LLM feature is not available");
            }

            List<ChatMessage> messages = new();
            if (!messages.AddPromptAndMessage(llmRequest.Prompt, message))
                return Results.NotFound();

            IChatClient client = null;
            if (llmRequest.Llm.HasText())
                client = new LlmConfigs().CreateChatClient(llmRequest.Llm);
            else
                client = scope.ServiceProvider.GetService<IChatClient>();

            if (client is null)
                return Results.Problem();

            var sb = new StringBuilder();
            messages.ForEach(m =>
            {
                sb.AppendLine($"{m.Role}");
                sb.AppendLine(m.Text);
                sb.AppendLine();
            });

            await environment.LogLlmRequestAsync(logNumber, sb.ToString());

            try
            {
                llmResponse = await LlmIntegration.MakeAICallAsync(logger, client,
                    llmRequest.Prompt, messages,
                    logNumber: logNumber, tenantId: llmRequest.Instance);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"[{logNumber}] LLM call {{llm: {llmRequest.Llm}, prompt: {llmRequest.Prompt}}} failed");
                return Results.Problem(ex.Message);
            }

            if (llmResponse is null) return Results.Problem();
            logger.LogInformation($"[{logNumber}] LLM call {{llm: {llmRequest.Llm}, prompt: {llmRequest.Prompt}}}," +
                $" Tokens {{input: {llmResponse.Usage.InputTokenCount}, output: {llmResponse.Usage.OutputTokenCount}, total: {llmResponse.Usage.TotalTokenCount}}}");

            await environment.LogLlmResponseAsync(logNumber, llmResponse.Text);

            return Results.Ok(new
            {
                totalTokenCount = llmResponse.Usage.TotalTokenCount,
                outputTokenCount = llmResponse.Usage.OutputTokenCount,
                inputTokenCount = llmResponse.Usage.InputTokenCount,
                reply = llmResponse.Text
            });
        };

        if (llmRequest.Llm.HasText() && request.ShouldCache() is { } absoluteExpiration)
        {
            IResult result = null;
            IDistributedCache cache = new PostgresDistributedCache(KhojiConstants.DatabaseConnectionString);

            var cachedResponse = await cache.GetOrSetStringAsync(
                getCacheKey: () => LlmCaching.GenerateCacheKey(llmRequest.Llm, llmRequest.Prompt, message),
                notFound: options =>
                {
                    response.Headers["Cache-Control"] = $"max-age={absoluteExpiration.TotalSeconds}";
                    options.AbsoluteExpirationRelativeToNow = absoluteExpiration;
                    result = invokeLlm().Result;
                    if (null != llmResponse) // if llm request was ok, this will not be null
                        return llmResponse.Text;

                    return null; // we got not ok from invokeLlm and we dont want to cache anything
                });

            if (result is null) response.Headers["X-Cache-Hit"] = "true"; // we got the response from cache

            return result ?? Results.Ok(new { reply = cachedResponse });
        }
        else
            return await invokeLlm();
    }

    public static async Task<ChatResponse> MakeAICallAsync(ILogger logger, IChatClient client,
        string prompt, IEnumerable<ChatMessage> messages,
        ChatOptions options = null,
        string logNumber = null, int? tenantId = null)
    {
        var llm = getModelId(client) ?? "unknown";
        var stopWatch = Stopwatch.StartNew();
        ChatResponse llmResponse = await tryCatchAiCallAsync<ChatResponse>(logger, stopWatch,
            aiCall: async () =>
            {
                var response = options is null
                    ? await client.GetResponseAsync(messages)
                    : await client.GetResponseAsync(messages, options);
                stopWatch.Stop();

                if (response is null) throw new ArgumentException($"Failed to make LLM call to {llm}");
                return response;
            },
            llm, prompt, logNumber, tenantId);

        if (string.IsNullOrWhiteSpace(logNumber))
            logger.LogInformation($"[{logNumber}] LLM call {{llm: {llm}, prompt: {prompt}}} took {stopWatch.Elapsed}," +
                $" Tokens {{input: {llmResponse.Usage?.InputTokenCount}, output: {llmResponse.Usage?.OutputTokenCount}, total: {llmResponse.Usage?.TotalTokenCount}}}");
        else
            logger.LogInformation($"[{logNumber}] LLM call {{llm: {llm}, prompt: {prompt}}} took {stopWatch.Elapsed}," +
                $" Tokens {{input: {llmResponse.Usage?.InputTokenCount}, output: {llmResponse.Usage?.OutputTokenCount}, total: {llmResponse.Usage?.TotalTokenCount}}}");

        // Log successful LLM call to database
        try
        {
            using var dbContext = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
            var llmCallLog = new LlmCallLog
            {
                LlmName = llm,
                PromptName = prompt ?? "unknown",
                InputTokens = Convert.ToInt32(llmResponse.Usage?.InputTokenCount ?? 0),
                OutputTokens = Convert.ToInt32(llmResponse.Usage?.OutputTokenCount ?? 0),
                TenantId = tenantId,
                ResponseTime = stopWatch.Elapsed
            };

            dbContext.LlmCallLogs.Add(llmCallLog);
            await dbContext.SaveChangesAsync();
        }
        catch (Exception logEx)
        {
            if (string.IsNullOrWhiteSpace(logNumber))
                logger.LogError(logEx, $"[{logNumber}] Failed to log LLM call to database");
            else
                logger.LogError(logEx, $"[{logNumber}] Failed to log LLM call to database");
        }

        return llmResponse;
    }
}
