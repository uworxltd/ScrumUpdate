// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Plugins;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using System.Text;

namespace KhojiGenAIServer.Chat.Agents;

// it will fail because BaseLlmAgent demands existance of Instruction file
// this is experimental code, dont use this as reference, use ExampleAgent as example if needed 
class SprintAgent : BaseFrameworkAgent
{
    const string AgentLlm = "claude-haiku";
    static string getScrumMasterSystemPrompt()
    {
        return """
            You are an experienced Scrum Master assistant. You help Scrum Masters during the sprints by:

            1. Identifying potential issues before they become blockers
            2. Suggesting workload redistributions
            3. Highlighting priority misalignments
            4. Recommending immediate actions

            Keep responses concise, actionable, and focused on the current sprint context. 
            Always suggest specific next steps when possible.
            """;
    }

    static string createContextualPrompt(string userQuery, QuestionCategory category, Dictionary<string, string> data)
    {
        var dataContext = string.Join("\n", data.Select(kvp => $"{kvp.Key}: {kvp.Value}"));

        return $"""
            User Question: {userQuery}
            Question Category: {category}

            Current Sprint Data:
            {dataContext}

            Please provide a focused answer to the user's question based on the available data. 
            Be specific and actionable in your response.
            """;
    }

    readonly SprintPlugin plugin;

    public SprintAgent(IServiceProvider service)
        : base(service.GetRequiredService<ILogger>(), llm: AgentLlm)
    {
        //it will throe exception; ensure we have active sprint when using this plugin/agent
        this.plugin = new SprintPlugin(this.Logger,
            service.GetRequiredService<PluginPayload>(), KhojiConstants.DatabaseConnectionString);

        //if (enableSupervisor)
        //{
        //    var clientTransport = new StreamClientTransport(PgMcpHelper.ClientOutput, PgMcpHelper.ClientInput);
        //    var mcpClient = McpClientFactory.CreateAsync(clientTransport).Result;
        //    var toolsList = new List<McpClientTool>();

        //    foreach (var tool in mcpClient.EnumerateToolsAsync().ToArrayAsync().Result)
        //    {
        //        logger.LogDebug($"{tool.Name}: {tool.Description}");
        //        toolsList.Add(tool);
        //    }
        //    kernel.Plugins.AddFromFunctions("sql", toolsList.Select(
        //        aiFunction => aiFunction.AsKernelFunction()));
        //}
    }

    Dictionary<string, string> gatherRelevantData(QuestionCategory category)
    {
        var data = new Dictionary<string, string>();

        switch (category)
        {
            case QuestionCategory.WorkloadAndCapacity:
                //data["workload"] = this.plugin.GetTeamWorkloadAnalysis();
                //data["available"] = this.plugin.GetAvailableTeamMembers();
                data["unassigned"] = plugin.GetUnassignedIssuesAsString();
                break;

            case QuestionCategory.SprintProgress:
                //data["progress"] = this.plugin.GetSprintProgressSummary();
                data["notStartedHighPriority"] = plugin.GetUnstartedHighPriorityIssuesAsString();
                data["blocked"] = plugin.GetBlockedIssuesAsString();
                break;

            case QuestionCategory.CarryOverAndDebt:
                data["carryOver"] = plugin.GetCarryOverWorkStatus();
                //data["previousSprint"] = this._plugin.GetPreviousSprintCarryOver();
                //data["stagnant"] = this._plugin.GetStagnantCarryOverWork();
                break;

            case QuestionCategory.PriorityAndBlocks:
                data["highPriority"] = plugin.GetUnstartedHighPriorityIssuesAsString();
                data["blocked"] = plugin.GetBlockedIssuesAsString();
                break;

            default:
                // Get a general overview
                //data["progress"] = this.plugin.GetSprintProgressSummary();
                data["blocked"] = plugin.GetBlockedIssuesAsString();
                break;
        }

        return data;
    }

    public override async Task<string> InvokeAgentAsync(string input, Action<AgentSession> newSession, AgentSession session = null)
    {
        this.Agent = CreateAgent(base.ChatClient, nameof(SprintAgent), llm: AgentLlm,
            instructions: getScrumMasterSystemPrompt(),
            CreateAITools(this.plugin));

        session = await this.Agent.CreateSessionAsync();
        newSession(session);

        var questionCategory = await new QuestionClassifier().ClassifyQuestion(input, base.ChatClient);
        var relevantData = gatherRelevantData(questionCategory);
        var prompt = createContextualPrompt(input, questionCategory, relevantData);

        IEnumerable<ChatMessage> messages = [new ChatMessage(ChatRole.User, prompt)];
        var response = await this.Agent.RunAsync(messages, session);

        var sb = new StringBuilder();
        foreach (var message in response?.Messages)
            sb.Append(message.Text);

        var suggestions = SuggestionEngine.GetSuggestions(questionCategory, relevantData);
        if (!string.IsNullOrWhiteSpace(suggestions))
        {
            sb.Append(Environment.NewLine);
            sb.Append(suggestions);
        }

        return sb.ToString();
    }
}
