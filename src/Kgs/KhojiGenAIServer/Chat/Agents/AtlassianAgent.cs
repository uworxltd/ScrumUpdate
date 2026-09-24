// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Plugins;
using KhojiGenAIServer.Services;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using ModelContextProtocol.Client;

namespace KhojiGenAIServer.Chat.Agents;

class AtlassianAgent : BaseFrameworkAgent
{
    const string AgentLlm = "claude-haiku";

    readonly PluginPayload payload;

    public AtlassianAgent(IServiceProvider service)
        : base(service.GetRequiredService<ILogger>(), llm: AgentLlm)
    {
        payload = service.GetService<PluginPayload>();
    }

    // TODO: this is not working, investigate how this can be fixed
    //public async Task AddAtlassianMcpAsPlugin(JiraCredentials jiraCredentials)
    //{ 
    //    // Configure the HTTP client for the MCP server
    //    HttpClient httpClient = new();
    //    httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jiraCredentials.Token);
    //    httpClient.DefaultRequestHeaders.Add("X-Atlassian-Cloud-Id", jiraCredentials.JiraCloudTenantId);

    //    // add tools from the jira mcp that you have yet to run
    //    await agent.Kernel.Plugins.AddMcpFunctionsFromSseServerAsync(
    //        "Atlassian MCP",
    //        new Uri("http://localhost:9000/sse"),
    //        httpClient: httpClient
    //     );
    //}

    public override async Task<string> InvokeAgentAsync(string input, Action<AgentSession> newSession, AgentSession session = null)
    {
        KbsClient.JiraCredentials jiraCredentials = new KbsClient(payload.Email)
            .InitializeToken()
            .GetJiraCredentials(payload.InstanceId);

        await using var mcpClient = await McpClient.CreateAsync(new HttpClientTransport(new()
        {
            Name = "JiraPlugin",
            Endpoint = new Uri(KhojiConstants.McpAtlassianUrl),
            AdditionalHeaders = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {jiraCredentials.Token}" },
                { "X-Atlassian-Cloud-Id", jiraCredentials.JiraCloudTenantId }
            }
        }),
        cancellationToken: CancellationToken.None);

        var mcpTools = await mcpClient.ListToolsAsync(cancellationToken: CancellationToken.None).ConfigureAwait(false);

        this.Agent = CreateAgent(base.ChatClient, nameof(AtlassianAgent), llm: AgentLlm,
            instructions: GetAgentInstructions(nameof(AtlassianAgent)),
            tools: mcpTools.Cast<AITool>());

        return await base.InvokeAgentAsync(input, newSession, session);
    }
}
