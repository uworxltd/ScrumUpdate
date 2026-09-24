// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Plugins;
using KhojiGenAIServer.Chat.Teams.Plugins;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Features;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.App;
using Microsoft.Agents.Builder.State;
using Microsoft.Agents.Core.Models;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PostHog;
using Unleash;

namespace KhojiGenAIServer.Chat.Teams;

class AgileBot : AgentApplication
{
    static bool unleashedLogged = false;
    readonly IServiceProvider service;
    readonly KhojiSubscription khojiSubscription;
    readonly ILogger<AgileBot> logger;
    readonly IPostHogClient postHogClient = null;

    public AgileBot(IServiceProvider service, AgentApplicationOptions options, KhojiSubscription khojiSubscription, ILogger<AgileBot> logger)
        : base(options)
    {
        this.service = service ?? throw new ArgumentNullException(nameof(service));
        this.khojiSubscription = khojiSubscription ?? throw new ArgumentNullException(nameof(khojiSubscription));
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));

        IConfiguration configuration = this.service.GetRequiredService<IConfiguration>();
        var posthogConfig = configuration.GetSection("PostHog").Get<PostHogOptions>();

        if (!string.IsNullOrWhiteSpace(posthogConfig?.ProjectApiKey) &&
            !string.IsNullOrWhiteSpace(posthogConfig?.HostUrl?.ToString()))
            this.postHogClient = this.service.GetRequiredService<IPostHogClient>();

        OnConversationUpdate(ConversationUpdateEvents.MembersAdded, WelcomeMessageAsync);

        // Register installationUpdate event (best for Teams channels)
        OnActivity("installationUpdate", WelcomeMessageOnInstallationAsync);

        // Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
        OnActivity(ActivityTypes.Message, OnMessageAsync);
    }

    void postHogCapture(bool kgsPosthogFeatureFlag, ITurnContext turnContext, string eventName, Dictionary<string, object> properties = null)
    {
        if (!kgsPosthogFeatureFlag) return;
        if (this.postHogClient == null)
        {
            this.logger.LogWarning("postHogClient is null, couldnt create it from service (IPostHogClient)");
            return;
        }

        properties = properties ?? new Dictionary<string, object>();
        properties["fromName"] = turnContext.Activity.From.Name;
        properties["channelId"] = turnContext.Activity.ChannelId;
        properties["conversationId"] = turnContext.Activity.Conversation.Id;
        properties["khojiUrl"] = KhojiConstants.KhojiXBaseUrl;

        this.postHogClient.Capture(
            distinctId: turnContext.Activity.From.AadObjectId,
            eventName: eventName,
            properties: properties);
    }

    protected async Task WelcomeMessageAsync(ITurnContext turnContext, ITurnState turnState, CancellationToken cancellationToken)
    {
        this.logger.LogInformation($"[MembersAdded] activityId: {turnContext.Activity.Id}, activityType: {turnContext.Activity.Type}, activityAction: {turnContext.Activity.Action}");

        foreach (ChannelAccount member in turnContext.Activity.MembersAdded)
        {
            if (member.Id != turnContext.Activity.Recipient.Id)
            {
                await turnContext.SendActivityAsync(
                    MessageFactory.Text($"Hello and Welcome {member.Name}! type Hi to get started"),
                    cancellationToken
                 );
            }
        }
    }

    protected async Task WelcomeMessageOnInstallationAsync(ITurnContext turnContext, ITurnState turnState, CancellationToken cancellationToken)
    {
        this.logger.LogInformation($"[installationUpdate] activityId: {turnContext.Activity.Id}, activityType: {turnContext.Activity.Type}, activityAction: {turnContext.Activity.Action}");

        var action = turnContext.Activity.Action;
        if (action == "add")
        {
            // Send welcome message to channel
            await turnContext.SendActivityAsync(
                MessageFactory.Text($"Hello and Welcome! type Hi to get started"),
                cancellationToken
            );
        }
    }

    protected async Task OnMessageAsync(ITurnContext turnContext, ITurnState turnState, CancellationToken cancellationToken)
    {
        await turnContext.SendActivityAsync(Activity.CreateTypingActivity(), cancellationToken);
        bool kgsPosthogFeatureFlag = false;

        try
        {
            bool scrumUpdatesFeatureFlag = false;
            bool worklogInsightsFeatureFlag = false;
            bool standupBoardFeatureFlag = false;
            bool scrumAssistantFeatureFlag = false;
            bool sprintWatchFeatureFlag = false;
            bool cheatCodesFeatureFlag = false;

            var cleanedMessage = turnContext.Activity.RemoveRecipientMention(); // turnContext.Activity.Text;
            if (string.IsNullOrWhiteSpace(cleanedMessage))
                this.logger.LogWarning($"[{turnContext.Activity.From.Name}] OnMessageAsync fired with null/blank message");

            var unleash = this.service.GetService<IUnleash>();

            if (unleash == null)
            {
                logger.LogInformation($"[{turnContext.Activity.From.Name}] Unleash not configured, Received Message: {turnContext.Activity.Text}");
                if (!unleashedLogged)
                {
                    unleashedLogged = true;
                    postHogCapture(kgsPosthogFeatureFlag: true, // there was no way to populate the flag, so sending to postHog (if it works) atleast once
                        turnContext, "message_received", new Dictionary<string, object>
                        {
                            ["unleash"] = "not_configured",
                            ["scrumUpdatesFeatureFlag"] = scrumUpdatesFeatureFlag,
                            ["worklogInsightsFeatureFlag"] = worklogInsightsFeatureFlag,
                            ["standupBoardFeatureFlag"] = standupBoardFeatureFlag,
                            ["scrumAssistantFeatureFlag"] = scrumAssistantFeatureFlag,
                            ["sprintWatchFeatureFlag"] = sprintWatchFeatureFlag,
                            ["cheatCodesFeatureFlag"] = cheatCodesFeatureFlag,
                            ["kgsPosthogFeatureFlag"] = kgsPosthogFeatureFlag
                        });
                }
            }
            else
            {
                scrumUpdatesFeatureFlag = unleash.IsEnabled("scrum-updates", false);
                worklogInsightsFeatureFlag = unleash.IsEnabled("worklog-insights", false);
                standupBoardFeatureFlag = unleash.IsEnabled("standup-board", false);
                scrumAssistantFeatureFlag = unleash.IsEnabled("scrum-assistant", false);
                sprintWatchFeatureFlag = unleash.IsEnabled("sprint-watch", false);
                cheatCodesFeatureFlag = unleash.IsEnabled("cheat-codes", false);
                kgsPosthogFeatureFlag = unleash.IsEnabled("kgs-posthog", false);

                if (!unleashedLogged)
                {
                    unleashedLogged = true;
                    logger.LogInformation($"[{turnContext.Activity.From.Name}] Unleash configured, scrumUpdatesFeatureFlag: {scrumUpdatesFeatureFlag}, " +
                        $"worklogInsightsFeatureFlag: {worklogInsightsFeatureFlag}, standupBoardFeatureFlag: {standupBoardFeatureFlag}, " +
                        $"scrumAssistantFeatureFlag: {scrumAssistantFeatureFlag}, sprintWatchFeatureFlag: {sprintWatchFeatureFlag}, " +
                        $"cheatCodesFeatureFlag: {cheatCodesFeatureFlag}, kgsPosthogFeatureFlag: {kgsPosthogFeatureFlag}, Received Message: {turnContext.Activity.Text}");
                }
                else
                    logger.LogInformation($"[{turnContext.Activity.From.Name}] Unleash configured, Received Message: {turnContext.Activity.Text}");

                postHogCapture(kgsPosthogFeatureFlag, turnContext, "message_received", new Dictionary<string, object>
                {
                    ["unleash"] = "configured",
                    ["scrumUpdatesFeatureFlag"] = scrumUpdatesFeatureFlag,
                    ["worklogInsightsFeatureFlag"] = worklogInsightsFeatureFlag,
                    ["standupBoardFeatureFlag"] = standupBoardFeatureFlag,
                    ["scrumAssistantFeatureFlag"] = scrumAssistantFeatureFlag,
                    ["sprintWatchFeatureFlag"] = sprintWatchFeatureFlag,
                    ["cheatCodesFeatureFlag"] = cheatCodesFeatureFlag,
                    ["kgsPosthogFeatureFlag"] = kgsPosthogFeatureFlag
                });
            }

            (var cleared, var email, var instanceId, var hasMultipleInstances) = await khojiSubscription.CheckSubscriptionAsync(logger, turnContext,
                scrumUpdatesFeatureFlag, worklogInsightsFeatureFlag, standupBoardFeatureFlag, sprintWatchFeatureFlag, cancellationToken);

            if (!cleared)
            {
                postHogCapture(kgsPosthogFeatureFlag, turnContext, "blocked_no_subscription");
                return;
            }

            var gateway = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
            bool isSupervisor = gateway.IsUserTeamSupervisorAndSchemaExists(email, instanceId);
            logger.LogInformation($"[{turnContext.Activity.From.Name}] email: {email}, instanceId: {instanceId}, isSupervisor: {isSupervisor}");

            if (await turnContext.HandleKhojiXValueAction(cancellationToken, logger, email, instanceId, isSupervisor, cleanedMessage,
                (context, eventName, properties) => postHogCapture(kgsPosthogFeatureFlag: true, context, eventName, properties)))
            {
                logger.LogInformation("Value action code was used");
                postHogCapture(kgsPosthogFeatureFlag, turnContext, "special_message_handled", new Dictionary<string, object>
                {
                    ["email"] = email,
                    ["instanceId"] = instanceId,
                    ["isSupervisor"] = isSupervisor,
                    ["kind"] = "valueAction"
                });
                return;
            }
            else if (await turnContext.HandleKhojiXBotCodeAsync(cancellationToken, logger,
                scrumUpdatesFeatureFlag, worklogInsightsFeatureFlag, standupBoardFeatureFlag, sprintWatchFeatureFlag,
                turnContext.Activity.From.Name,
                email, instanceId, isSupervisor, cleanedMessage))
            {
                logger.LogInformation("Bot code was used");
                postHogCapture(kgsPosthogFeatureFlag, turnContext, "special_message_handled", new Dictionary<string, object>
                {
                    ["email"] = email,
                    ["instanceId"] = instanceId,
                    ["isSupervisor"] = isSupervisor,
                    ["kind"] = "botCode",
                    ["message"] = cleanedMessage
                });
                return;
            }
            else if (cheatCodesFeatureFlag && await turnContext.HandleCheatCodeAsync(cancellationToken, logger, turnContext.Activity.From.Name,
                email, instanceId, isSupervisor, cleanedMessage))
            {
                logger.LogInformation("Cheat code was used");
                postHogCapture(kgsPosthogFeatureFlag, turnContext, "special_message_handled", new Dictionary<string, object>
                {
                    ["email"] = email,
                    ["instanceId"] = instanceId,
                    ["isSupervisor"] = isSupervisor,
                    ["kind"] = "cheatCode",
                    ["message"] = cleanedMessage
                });
                return;
            }

            if (!scrumAssistantFeatureFlag)
            {
                await turnContext.SendHelpCardAsync(cancellationToken, logger, turnContext.Activity.From.Name,
                    instanceId, isSupervisor,
                    scrumUpdatesFeatureFlag, worklogInsightsFeatureFlag, standupBoardFeatureFlag, sprintWatchFeatureFlag, hasMultipleInstances);
                return;
            }

            var payload = new PluginPayload(cancellationToken, turnContext.Activity.From.Name,
                email, instanceId, isSupervisor);
            var payload2 = new KhojiSubscriptionPluginPayload(instanceId);
            ServiceCollection serviceCollection = [
                new ServiceDescriptor(typeof(ILogger), logger),
                new ServiceDescriptor(typeof(ITurnContext), turnContext),
                new ServiceDescriptor(typeof(PluginPayload), payload),
                new ServiceDescriptor(typeof(KhojiSubscriptionPluginPayload), payload2)
            ];

            try
            {
                //bool attachSprintTools = false;
                //if (new KssGateway(UworxConstants.DatabaseConnectionString, instanceId)
                //    .GetSprint(out string errorOrMessage) is int sprintId)
                //    attachSprintTools = true; // we have an active sprint in KSS/Tenant

                var agent = serviceCollection.BuildServiceProvider().CreateTeamsChatAgent(logger, payload);
                //new Uworx.Khoji.Semantics.Agents.ExampleAgent();

                //Conversation.Id
                string agentResponse = await agent.Invoke(turnContext.Activity.From.AadObjectId, cleanedMessage);
                //agent.Invoke(cleanedMessage);

                if (!string.IsNullOrEmpty(agentResponse))
                    await turnContext.SendActivityAsync(MessageFactory.Text(agentResponse),
                        cancellationToken: cancellationToken);

                postHogCapture(kgsPosthogFeatureFlag, turnContext, "llm_response_generated", new Dictionary<string, object>
                {
                    ["email"] = email,
                    ["instanceId"] = instanceId,
                    ["isSupervisor"] = isSupervisor,
                    ["question"] = cleanedMessage
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Agent failed to process the message");

                await turnContext.SendHelpCardAsync(cancellationToken, logger, turnContext.Activity.From.Name,
                    instanceId, isSupervisor,
                    scrumUpdatesFeatureFlag, worklogInsightsFeatureFlag, standupBoardFeatureFlag, sprintWatchFeatureFlag,
                    hasMultipleInstances);

                postHogCapture(kgsPosthogFeatureFlag, turnContext, "exception_llm", new Dictionary<string, object>
                {
                    ["email"] = email,
                    ["instanceId"] = instanceId,
                    ["isSupervisor"] = isSupervisor,
                    ["type"] = ex.GetType().ToString(),
                    ["message"] = ex.Message
                });
            }

            //// stream message example code
            //var result = this.kernel.GetStreamingMessages(turnContext.Activity.Text);
            //var initActivity = await turnContext.SendActivityAsync("Generating response...", cancellationToken: cancellationToken);
            //string finalMessage = "";
            //await foreach (var message in result)
            //{
            //    finalMessage += message;
            //    var updatedActivity = new Activity
            //    {
            //        Id = initActivity.Id,
            //        Type = ActivityTypes.Message,
            //        Text = finalMessage,
            //        Conversation = turnContext.Activity.Conversation,
            //        Locale = turnContext.Activity.Locale,
            //        Attachments = new List<Attachment>()
            //    };

            //    await turnContext.UpdateActivityAsync(updatedActivity, cancellationToken);
            //}
        }
        catch (Exception ex)
        {
            var message = "Looks like I have hit a dead end...";
            logger.LogError(ex, "Failed to process the message");

            var result = await turnContext.SendProactiveMessagesAsync(this.service, ex, cancellationToken);
            if (result != null) message = result;
#if DEBUG
            message = ex.ToString();
#endif
            await turnContext.SendActivityAsync(message,
                cancellationToken: cancellationToken);
            postHogCapture(kgsPosthogFeatureFlag, turnContext, "exception", new Dictionary<string, object>
            {
                ["type"] = ex.GetType().ToString(),
                ["message"] = ex.Message
            });
        }

        //await postHog.FlushAsync(); it flushes its queue when there are 30sec elapsed or queued count becomes 20
    }
}
