// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

//for FileAgentSkillsProvider
#pragma warning disable MAAI001

using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Infrastructure;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using System.ComponentModel;
using System.Reflection;
using System.Text;
using Uworx.Khoji.Agile.AI;

namespace KhojiGenAIServer.Chat.Agents;

abstract class BaseChatClientAgent
{
    public static IEnumerable<AITool> CreateAITools(object pluginInstance)
    {
        var tools = new List<AITool>();
        var type = pluginInstance.GetType();
        var methods = type
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(m => m.GetCustomAttribute<ToolFunctionAttribute>() != null);

        foreach (var method in methods)
        {
            var attr = method.GetCustomAttribute<DescriptionAttribute>();
            var tool = AIFunctionFactory.Create(method, pluginInstance,
                name: method.Name,
                description: attr?.Description
            );

            tools.Add(tool);
        }

        return tools;
    }

    public static string GetAgentInstructions(string agentName)
    {
        var agentInstructionsFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory,
            "Instructions", $"{agentName}.txt");

        if (!File.Exists(agentInstructionsFile))
            throw new FileNotFoundException($"Agent instructions file not found: {agentInstructionsFile}");

        return File.ReadAllText(agentInstructionsFile);
    }

    public static AIAgent CreateAgent(IChatClient chatClient, string agentName, string llm,
        string instructions = null,
        IEnumerable<AITool> tools = null,
        IEnumerable<AIContextProvider> providers = null)
    {
        ChatOptions chatOptions = new();
        if (!string.IsNullOrWhiteSpace(instructions)) chatOptions.Instructions = instructions;
        if (tools != null && tools.Count() > 0) chatOptions.Tools = [.. tools];

        ChatClientAgentOptions agentOptions = new()
        {
            Name = agentName,
            ChatOptions = chatOptions
        };
        if (providers != null && providers.Count() > 0) agentOptions.AIContextProviders = [.. providers];

        return new ChatClientAgent(chatClient, agentOptions);
    }

    protected readonly ILogger Logger;
    protected readonly IChatClient ChatClient;

    public BaseChatClientAgent(ILogger logger, string llm)
    {
        ArgumentNullException.ThrowIfNull(logger);
        ArgumentNullException.ThrowIfNull(llm);

        this.Logger = logger;
        this.ChatClient = new LlmConfigs().CreateChatClient(llm);

        ArgumentNullException.ThrowIfNull(this.ChatClient);
    }
}

abstract class BaseFrameworkAgent : BaseChatClientAgent
{
    protected AIAgent Agent;

    public BaseFrameworkAgent(ILogger logger, string llm) : base(logger, llm)
    { }

    public BaseFrameworkAgent(ILogger logger, string agentName, string llm,
        IEnumerable<AITool> tools = null) : base(logger, llm)
    {
        ArgumentNullException.ThrowIfNull(agentName);

        this.Agent = CreateAgent(this.ChatClient, agentName, llm,
            instructions: GetAgentInstructions(agentName),
            tools);
    }

    public BaseFrameworkAgent(ILogger logger, string agentName, string llm, string skillId,
        IEnumerable<AITool> tools = null) : base(logger, llm)
    {
        ArgumentNullException.ThrowIfNull(agentName);
        ArgumentNullException.ThrowIfNull(skillId);

        var skillsProvider = new AgentSkillsProvider(
            skillPath: Path.Combine(AppContext.BaseDirectory, "Skills")); //AppDomain.CurrentDomain.BaseDirectory can be replaced with AppContext.BaseDirectory

        ArgumentNullException.ThrowIfNull(skillsProvider);

        this.Agent = CreateAgent(this.ChatClient, agentName, llm,
            tools: tools, providers: [skillsProvider]);
    }

    public virtual async Task<string> InvokeAgentAsync(string input, Action<AgentSession> newSession, AgentSession session = null)
    {
        if (session == null)
        {
            session = await this.Agent.CreateSessionAsync();
            newSession(session);
        }

        var response = await this.Agent.RunAsync(input, session);

        var sb = new StringBuilder();
        foreach (var message in response?.Messages)
            sb.Append(message.Text);

        return sb.ToString();
    }
}

/// <summary>
/// Adapter bridge from existing BaseChatClientAgent to new IAgentRuntime.
/// 
/// Enables migration from legacy agent pattern to bounded orchestration
/// while maintaining backward compatibility.
/// </summary>
class AgentRuntimeAdapter
{
    readonly IAgentRuntime runtime;
    readonly ILogger<AgentRuntimeAdapter> logger;

    public AgentRuntimeAdapter(
        IAgentRuntime runtime,
        ILogger<AgentRuntimeAdapter> logger)
    {
        ArgumentNullException.ThrowIfNull(runtime);
        ArgumentNullException.ThrowIfNull(logger);

        this.runtime = runtime;
        this.logger = logger;
    }

    /// <summary>
    /// Execute legacy agent using new runtime.
    /// </summary>
    public async Task<string> InvokeAgentAsync(
        string input,
        IChatClient chatClient,
        IToolRegistry toolRegistry,
        IAgentMemory memory,
        IEnumerable<ChatMessage> conversationHistory,
        int maxIterations = 5,
        IAgentObserver? observer = null,
        CancellationToken cancellationToken = default)
    {
        logger.LogDebug("AgentRuntimeAdapter.InvokeAgentAsync called");

        var context = new AgentContext
        {
            ConversationHistory = conversationHistory.ToList(),
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy
            {
                MaxIterations = maxIterations,
                AllowToolCalls = true,
                RequireStructuredOutput = false
            },
            Observer = observer
        };

        var request = new AgentRequest
        {
            Input = input,
            Context = context
        };

        var result = await runtime.RunAsync(request, cancellationToken);

        return result.FinalOutput;
    }
}
