// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

/*

using KhojiGenAIServer.Abstractions;
using KhojiGenAIServer.Chat.Agents;
using KhojiGenAIServer.Chat.Teams.Plugins;
using KhojiGenAIServer.Extensions;
using Microsoft.Agents.Builder;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace KhojiGenAIServer.Chat.Teams.Agents;

// this was the first agent and was primarily for experiments
// dont use this as reference, use ExampleAgent as example if needed 
class KhojiCloudAgent : BaseLlmAgent
{
    #if DEBUG
    const string ConfiguredLlm = "local";
    #else
    const string ConfiguredLlm = "ollama";
    #endif

    readonly ITurnContext turnContext;

    KhojiCloudAgent(IServiceProvider service)
        : base(nameof(KhojiCloudAgent), ConfiguredLlm, service.GetRequiredService<ILogger>(), useFunctionInvocation: true)
    {
        turnContext = service.GetRequiredService<ITurnContext>();
        ArgumentNullException.ThrowIfNull(turnContext);

        Agent.Kernel.Plugins.Add(KernelPluginFactory.CreateFromType<ScrumPlugin>(serviceProvider: service));
    }

    OrderedStrategyMap<IntentDetector.SupportedIntents, string> createPrimitveStrategy(
        IntentDetector detector,
        CancellationToken token,
        string member, string email, int instanceId, string cleanedMessage)
        => new OrderedStrategyMap<IntentDetector.SupportedIntents, string>()
            .Register(IntentDetector.SupportedIntents.ScrumUpdate,
            payload => detector.IsIntentMatch(payload, IntentDetector.SupportedIntents.ScrumUpdate.ToString()),
            async e =>
            {
                base.Logger.LogInformation("IntentDetector.SupportedIntents.ScrumUpdate matched");
                await turnContext.SendScrumUpdateAsync(token, base.Logger, member, email, instanceId);
            })
            .Register(IntentDetector.SupportedIntents.WeeklyRetro,
            payload => detector.IsIntentMatch(payload, IntentDetector.SupportedIntents.WeeklyRetro.ToString()),
            async e =>
            {
                base.Logger.LogInformation("IntentDetector.SupportedIntents.WeeklyRetro matched");
                await turnContext.SendWeeklyRetroAsync(token, base.Logger, member, email, instanceId);
            })
            .Register(IntentDetector.SupportedIntents.Greeting,
            payload => detector.IsIntentMatch(payload, IntentDetector.SupportedIntents.Greeting.ToString()),
            async e =>
            {
                base.Logger.LogInformation("IntentDetector.SupportedIntents.Greeting matched");
                await turnContext.SendActivityAsync("Welcome back, you can ask me for your scrum update and weekly retro for now!",
                    cancellationToken: token);
            });

    // if its matured, we will move it to base agent
    bool tryExtractToolCallJson(string input, out JsonObject toolCallJson)
    {
        toolCallJson = null;

        //try
        //{
        //    var jsonNode = JsonNode.Parse(input);
        //    if (jsonNode is JsonObject obj &&
        //        obj.TryGetPropertyValue("name", out var nameNode) &&
        //        obj.TryGetPropertyValue("arguments", out var argsNode))
        //    {
        //        bool nameIsValid = nameNode is JsonValue;
        //        bool argsIsValid = argsNode is JsonValue || argsNode is JsonObject;

        //        if (nameIsValid && argsIsValid)
        //        {
        //            toolCallJson = obj;
        //            return true;
        //        }
        //    }
        //}
        //catch
        //{
        //    // Ignore parse errors
        //}

        toolCallJson = null;

        for (int i = 0; i < input.Length; i++)
        {
            if (input[i] != '{') continue;

            string candidate = input[i..];

            try
            {
                var jsonNode = JsonNode.Parse(candidate);
                if (jsonNode is JsonObject obj &&
                    obj.TryGetPropertyValue("name", out var nameNode) &&
                    obj.TryGetPropertyValue("arguments", out var argsNode))
                {
                    bool nameIsValid = nameNode is JsonValue;
                    bool argsIsValid = argsNode is JsonValue || argsNode is JsonObject;

                    if (nameIsValid && argsIsValid)
                    {
                        toolCallJson = obj;
                        return true;
                    }
                }
            }
            catch
            {
                // Ignore parse errors, continue scanning
            }
        }

        return false;
    }

    async Task<bool> tryIntentsStrategyAsync(IntentDetector detector,
        CancellationToken token,
        string member, string email, int instanceId, string cleanedMessage)
    {
        //await turnContext.SendActivityAsync("You have ran out of your AI quota, falling back to primitive functionality",
        //    cancellationToken: token);

        var orderedMapTeamMember = createPrimitveStrategy(detector, token,
            member, email, instanceId, cleanedMessage);

        var result = await orderedMapTeamMember.Trigger(cleanedMessage);

        if (result.Success)
            return true;

        //if (null != result.Exception)
        //    throw result.Exception;
        //else if (!result.Found)
        //    throw new ApplicationException("No rule found"); // no rule matched
        //else if (!result.Success)
        //    throw new ApplicationException("Failed with handler"); // matched but handler threw (result.Exception has details)

        //if (!detector.IsIntentMatch(cleanedMessage))
        //{
        //    await turnContext.SendActivityAsync(
        //        "I am not trained to answer this question, please try asking something else",
        //        cancellationToken: token);

        //    return;
        //}
        //else
        //    throw new Exception("No rule matched, but intent was detected"); // this is a fallback, we should never reach here

        return false;
    }

    async Task<(bool, string)> invokeLlmAsync(
        ChatHistory chatHistory, CancellationToken token)
    {
        AgentThread thread = new ChatHistoryAgentThread();
        //https://learn.microsoft.com/en-us/semantic-kernel/concepts/ai-services/chat-completion/function-calling/function-invocation
        PromptExecutionSettings settings = new() { FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(autoInvoke: false) };
        FunctionCallContentBuilder fccBuilder = new();

        StringBuilder sb = new();
        AuthorRole? authorRole = null;
        //await foreach (ChatMessageContent response in this.agent.InvokeAsync(chatHistory,
        //    options: new AgentInvokeOptions() { KernelArguments = new KernelArguments(settings) },
        //    thread: thread))
        await foreach (var response in Agent.InvokeStreamingAsync(chatHistory,
            options: new AgentInvokeOptions() { KernelArguments = new KernelArguments(settings) },
            thread: thread))
        {
            if (response.Message is not null)
            {
                StreamingChatMessageContent streamingContent = response.Message;
                //chatHistory.Add(response);
                //sb.Append(response.Content);
                if (streamingContent.Content is not null)
                    sb.Append(streamingContent.Content);

                authorRole ??= streamingContent.Role;
                fccBuilder.Append(streamingContent);
            }

            //var toolResults = response.Items.OfType<FunctionResultContent>();
            //if (toolResults.Any())
            //    foreach (var result in toolResults)
            //        sb.Append(result.Result);

            //if (response.Items.Any(item => item is FunctionCallContent))
            //    toolWasCalled = true;
        }

        bool toolWasCalled = false;

        IReadOnlyList<FunctionCallContent> functionCalls = fccBuilder.Build();
        if (functionCalls.Any())
        {
            sb.Clear();
            toolWasCalled = true;

            ChatMessageContent fcContent = new ChatMessageContent(role: authorRole ?? default, content: null);
            chatHistory.Add(fcContent);

            var functionCall = functionCalls.FirstOrDefault(); // due to Any there will always be at least one function call
            {
                // Adding the original function call to the chat message content
                fcContent.Items.Add(functionCall);

                // Invoking the function
                FunctionResultContent functionResult = await functionCall.InvokeAsync(SemanticKernel);
                sb.Append(functionResult.Result);
                // Adding the function result to the chat history
                chatHistory.Add(functionResult.ToChatMessage());
            }

        }

        if (!toolWasCalled)
        {
            string responseText = sb.ToString();

            bool looksLikeToolCallJson = tryExtractToolCallJson(responseText, out JsonObject toolCallJson);

            if (looksLikeToolCallJson)
            {
                toolWasCalled = true;

                var functionName = toolCallJson["name"]?.ToString();
                var argumentsNode = toolCallJson["arguments"];
                var argumentDict = argumentsNode is JsonObject argObj
                    ? argObj.ToDictionary(kv => kv.Key, kv => kv.Value?.Deserialize<object>())
                    : new Dictionary<string, object>();
                var kernelArgs = new KernelArguments(argumentDict);

                var functionCall = new FunctionCallContent(functionName, arguments: kernelArgs);

                var fcContent = new ChatMessageContent(role: authorRole ?? default, content: null);
                fcContent.Items.Add(functionCall);
                chatHistory.Add(fcContent);

                var functionResult = await functionCall.InvokeAsync(SemanticKernel);
                sb.Clear();
                sb.Append(functionResult.Result);

                chatHistory.Add(functionResult.ToChatMessage());
            }
        }

        if (!toolWasCalled)
            await chatHistory.ReduceInPlaceAsync(new ChatHistoryTruncationReducer(5), token);

        return (toolWasCalled, sb.ToString());
    }

    public async Task<(bool, string)> InvokeAgentAsync(bool isSupervisor,
        bool scrumUpdatesFeatureFlag, bool worklogInsightsFeatureFlag, bool standupBoardFeatureFlag, bool sprintWatchFeatureFlag,
        bool hasMultipleInstances,
        string member, string email, int instanceId, string cleanedMessage,
        ChatHistory chatHistory, CancellationToken token)
    {
        try
        {
            ArgumentNullException.ThrowIfNull(chatHistory);

            if (base.IsIntentMatch(cleanedMessage, IntentDetector.SupportedIntents.Greeting))
            {
                await turnContext.SendHelpCardAsync(token, base.Logger, turnContext.Activity.From.Name,
                    instanceId, isSupervisor, scrumUpdatesFeatureFlag, worklogInsightsFeatureFlag, standupBoardFeatureFlag, sprintWatchFeatureFlag, hasMultipleInstances);
                return (true, null); // so we dont trigger next agent
            }
            else
                return (false, null);

            // Uncomment Once Below

            ////var llmLimiter = new RateLimiter(TimeSpan.FromHours(1), maxRequests: 5); // 5 llm requests per hour
            // //if (LlmIntegration.LlmAvailable && llmLimiter.IsAllowed($"{turnContext.Activity.From.AadObjectId}_llmLimiter"))

            //ChatMessageContent message = new(AuthorRole.User, cleanedMessage);
            //chatHistory.Add(message);
            //(var toolWasCalled, var response) = await invokeLlmAsync(chatHistory, token);

            ////else
            ////{
            ////    logger.LogInformation("LLM rate limit exceeded, sending message to user");
            ////    await turnContext.HandlePrimitiveAsync(cancellationToken, logger, userEmail, instanceId, userMessage);
            ////}

            //return (toolWasCalled, response);
        }
        catch (Exception ex)
        {
            base.Logger.LogError(ex, $"Failed with LLM {ConfiguredLlm}");
            //if (await tryIntentsStrategyAsync(token, member, email, instanceId, cleanedMessage))
            //    return (true, null); // will clear chat history
            //else
            throw;
        }
    }
}

*/