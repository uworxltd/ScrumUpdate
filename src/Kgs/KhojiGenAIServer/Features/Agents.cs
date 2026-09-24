// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Agents;
using KhojiGenAIServer.Chat.Plugins;
using KhojiGenAIServer.Chat.Web;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Infrastructure;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Hosting.AGUI.AspNetCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.ComponentModel;

namespace KhojiGenAIServer.Features;

static class Agents
{
    static Dictionary<string, ChatClientAgentSession> Sessions = new();

    static AIAgent createAIAgent()
    {
        IChatClient chatClient = new LlmConfigs().CreateChatClient("ollama");
        ArgumentNullException.ThrowIfNull(chatClient);

        // https://learn.microsoft.com/en-us/agent-framework/integrations/ag-ui/getting-started
        //[JsonSerializable(typeof(ServerWeatherForecastRequest))]
        //[JsonSerializable(typeof(ServerWeatherForecastResponse))]
        //sealed partial class AGUIServerSerializerContext : JsonSerializerContext;
        //var agent = new ChatClientAgent(chatClient,
        //    name: "AGUIAssistant",
        //    tools: [
        //        AIFunctionFactory.Create(
        //            () => DateTimeOffset.UtcNow,
        //            name: "get_current_time",
        //            description: "Get the current UTC time."
        //        ),
        //        AIFunctionFactory.Create(
        //            ([Description("The weather forecast request")]ServerWeatherForecastRequest request) => {
        //                return new ServerWeatherForecastResponse()
        //                {
        //                    Summary = "Sunny",
        //                    TemperatureC = 25,
        //                    Date = request.Date
        //                };
        //            },
        //            name: "get_server_weather_forecast",
        //            description: "Gets the forecast for a specific location and date",
        //            AGUIServerSerializerContext.Default.Options)
        //    ]);

        var jiraAgent = new ChatClientAgent(chatClient,
            name: "JiraAgent",
            instructions: """
                You are a Jira specialist. You help users:
                - Suggest worklogs based on activity patterns
                - Log work to specific tickets
        
                Always confirm ticket numbers before logging work.
                Be concise and action-oriented.
            """,
            tools: [
                AIFunctionFactory.Create(
                    () => new List<(string ticket, string time)>
                    {
                        ("KFX-100", "4 hours"),
                        ("KFX-101", "4 hours"),
                    },
                    name: "get_work_logs",
                    description: "Gets the worklogs from Jira"),
                AIFunctionFactory.Create(
                    (string ticket, [Description("Time in minutes for the worklog")]int time) => $"{time} is logged ",
                    name: "add_work_log",
                    description: "Adds the worklog into the Jira")])
            .AsBuilder()
            .UseOpenTelemetry(sourceName: "agents-telemetry-source")
            .Build();

        var orchestrator = new ChatClientAgent(chatClient,
            name: "Orchestrator",
            instructions: """
                You are a coordination agent. Your job is to:
                1. Understand the user's intent
                2. Delegate to the appropriate specialized agent:
                    - JiraAgent: For Jira-related tasks (worklogs, scrum updates, ticket info)
                3. Return results to the user
                
                Always explain which agent you're delegating to and why.
            """,
            tools: [
                jiraAgent.AsAIFunction()])
            .AsBuilder()
            .UseOpenTelemetry(sourceName: "agents-telemetry-source")
            .Build();

        return orchestrator;
    }

    static BaseChatClientAgent createAgent(ILogger logger, PluginPayload payload)
    {
        ServiceCollection serviceCollection = [
            new ServiceDescriptor(typeof(ILogger), logger),
            new ServiceDescriptor(typeof(PluginPayload), payload)
        ];
        //var webAgent = new WebChatAgent(serviceCollection.BuildServiceProvider());
        return new ExampleLlmAgent(serviceCollection.BuildServiceProvider());
    }

    public static BaseChatClientAgent CreateWebChatAgent(this IServiceProvider service,
        WebConversation conversation, string userEmail)
    {
        var conversationId = conversation.ConversationId.ToString();
        var logPath = Path.Combine("WebChats", conversation.InstanceId.ToString(), conversation.UserId.ToString(), $"{conversationId}.txt");

        //var logger = new WebChatLogger<WebChatAgent>(service.GetService<ILogger<WebChatAgent>>(), logPath);
        var logger = new WebChatLogger<ExampleLlmAgent>(service.GetService<ILogger<ExampleLlmAgent>>(), logPath);
        var payload = new PluginPayload(CancellationToken.None, conversation.UserId.ToString(), userEmail, conversation.InstanceId, IsSupervisor: true);

        return createAgent(logger, payload);
    }

    public static AIAgent CreateTeamsChatAgent(this IServiceProvider service, ILogger logger,
        PluginPayload payload)
        => createAIAgent();

    public static void ClearChatHistory(string key)
    {
        if (Sessions.ContainsKey(key))
            Sessions.Remove(key);
    }

    public static async Task<string> Invoke(this AIAgent agent,
        string conversationId, string text)
    {
        ChatClientAgentSession session = null;
        if (Sessions.ContainsKey(conversationId))
            session = Sessions[conversationId];
        else
        {
            var t = await agent.CreateSessionAsync();
            if (t is ChatClientAgentSession at)
                Sessions[conversationId] = at;
        }

        var response = await agent.RunAsync(session);
        return response?.Text;
    }

    public static async Task<string> Invoke(this BaseFrameworkAgent agent,
        string conversationId, string text)
    {
        ChatClientAgentSession session = null;
        if (Sessions.ContainsKey(conversationId)) session = Sessions[conversationId];
        var response = await agent.InvokeAgentAsync(text, t =>
        {
            if (t is ChatClientAgentSession at)
                Sessions[conversationId] = at;
        }, session);

        return response;
    }

    public static void AddAgentsIntegration(this WebApplication app) =>
        app.MapAGUI("/agent", createAIAgent());
}
