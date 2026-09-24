// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Plugins;
using KhojiGenAIServer.Chat.Web;
using KhojiGenAIServer.Services;
using Microsoft.Extensions.AI;
using System.Text;

namespace KhojiGenAIServer.Chat.Agents;

class WebChatAgent : BaseFrameworkAgent
{
    const string AgentLlm = "claude-haiku";

    readonly DatabasePlugin plugin;

    public WebChatAgent(IServiceProvider service)
        : base(service.GetRequiredService<ILogger>(), llm: AgentLlm)
    {
        this.plugin = new DatabasePlugin(this.Logger, service.GetRequiredService<PluginPayload>());
    }

    async Task<string> invokeAgentAsync(int instanceId, string email,
        string input, IList<ChatMessage> messages, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(messages);

        //try
        //{
        //    var g = new KssGateway(UworxConstants.DatabaseConnectionString, instanceId);
        //    if (g.KasAvailable(out string jsonKey, out string jsonValue))
        //    {
        //        var plugin = new KasPlugin(this.logger, instanceId, jsonKey, jsonValue);
        //        var sprintDetail = plugin.GetSprintDetail();

        //        if (!string.IsNullOrWhiteSpace(sprintDetail))
        //        {
        //            chatHistory.Add(new(AuthorRole.System, sprintDetail));
        //            this.logger.LogInformation($"[WebChat: {email} ({instanceId})]  ✅ Chat history has {chatHistory.Count} messages, sprint detail added");
        //        }
        //        else
        //            this.logger.LogInformation($"[WebChat: {email} ({instanceId})] ⚠️ Chat history has {chatHistory.Count} messages");

        //        base.Agent.Kernel.Plugins.Add(KernelPluginFactory.CreateFromObject(plugin));
        //        this.logger.LogInformation($"[WebChat: {email} ({instanceId})] ✅ KasPlugin attached");

        //        kasPluginAttached = true;
        //    }
        //}
        //catch (Exception ex)
        //{
        //    this.logger.LogError(ex, $"[WebChat: {email} ({instanceId})] ❌ Failed to determine if we can attach the KasPlugin");
        //}

        //JiraCredentials jiraCredentials = new KbsClient(email)
        //    .InitializeToken()
        //    .GetJiraCredentials(instanceId);

        //await using IMcpClient mcpClient = await McpClientFactory.CreateAsync(
        //    new SseClientTransport(new()
        //    {
        //        Name = "JiraPlugin",
        //        Endpoint = new Uri(UworxConstants.McpAtlassianUrl),
        //        AdditionalHeaders = new Dictionary<string, string>
        //        {
        //        { "Authorization", $"Bearer {jiraCredentials.Token}" },
        //        { "X-Atlassian-Cloud-Id", jiraCredentials.JiraCloudTenantId }
        //        }
        //    }),
        //    cancellationToken: cancellationToken);

        //var tools = await mcpClient.ListToolsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
        //base.Agent.Kernel.Plugins.AddFromFunctions("JiraPlugin", tools.Select(tool => tool.AsKernelFunction()));
        //this.logger.LogInformation($"[WebChat: {email} ({instanceId})] ✅ JiraPlugin/MCP attached");

        base.Logger.LogInformation($"[WebChat: {email} ({instanceId})] {input}");

        this.Agent = CreateAgent(base.ChatClient, nameof(WebChatAgent), llm: AgentLlm,
            instructions: GetAgentInstructions(nameof(WebChatAgent)),
            CreateAITools(this.plugin));

        messages.Add(new(ChatRole.User, input));

        var session = await this.Agent.CreateSessionAsync();
        var response = await this.Agent.RunAsync(messages, session);
        base.Logger.LogInformation($"[WebChat: {email} ({instanceId})] {response?.Messages.Count} messages generated as a reply");

        var sb = new StringBuilder();
        foreach (var message in response?.Messages)
            sb.Append(message.Text);

        return sb.ToString();
    }

    public WebChatMessage InvokeAgent(string userEmail, WebConversation conversation, WebChatMessage userMessage)
    {
        WebChatMessage botResponse = null;

        if (userMessage.Text == "x-khojicloud-scrumupdate")
        {
            var scrumUpdate = new KbsClient(userEmail)
                .InitializeToken()
                .GetUserScrumUpdate(conversation.InstanceId);
            botResponse = new WebChatDataMessage(scrumUpdate);
        }
        else if (userMessage.Text == "x-khojicloud-weeklyretro")
        {
            var weeklyRetro = new KbsClient(userEmail)
                .InitializeToken()
                .GetUserWeeklyRetro(conversation.InstanceId);
            botResponse = new WebChatDataMessage(weeklyRetro);
        }

        if (botResponse is null)
            botResponse = new WebChatCardMessage
            {
                Sender = "bot",
                Text = "What would you like help with?",
                Actions =
                [
                    new WebChatAction
                    {
                        Label = "Scrum Update",
                        Value = "x-khojicloud-scrumupdate"
                    },
                    new WebChatAction
                    {
                        Label = "Weekly Retrospective",
                        Value = "x-khojicloud-weeklyretro"
                    }
                ]
            };

        if (botResponse is null)
        {
            var messages = new List<ChatMessage>();

            foreach (var message in conversation.Messages)
                messages.Add(new(ChatRole.User, message.Text));

            botResponse = new WebChatMessage
            {
                Sender = "bot",
                Text = this.invokeAgentAsync(conversation.InstanceId, userEmail,
                    userMessage.Text, messages, CancellationToken.None).Result
            };
        }

        conversation.Messages.Add(botResponse);

        return botResponse;
    }
}
