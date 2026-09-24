// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.App;
using Microsoft.Agents.Builder.State;
using Microsoft.Agents.Core.Models;

namespace KhojiGenAIServer.Chat.Teams;

class OpsBot : AgentApplication
{
    readonly IServiceProvider service;
    readonly ILogger<OpsBot> logger;

    public OpsBot(IServiceProvider service, AgentApplicationOptions options, ILogger<OpsBot> logger)
        : base(options)
    {
        this.service = service ?? throw new ArgumentNullException(nameof(service));
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));

        OnConversationUpdate(ConversationUpdateEvents.MembersAdded, WelcomeMessageAsync);

        // Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
        OnActivity(ActivityTypes.Message, OnMessageAsync);
    }

    protected async Task WelcomeMessageAsync(ITurnContext turnContext, ITurnState turnState, CancellationToken cancellationToken)
    {
        foreach (ChannelAccount member in turnContext.Activity.MembersAdded)
        {
            if (member.Id != turnContext.Activity.Recipient.Id)
                await turnContext.SendActivityAsync(MessageFactory.Text($"Hello and Welcome! {member.Name} to OpsX, type Hi to get started"),
                    cancellationToken);
        }
    }

    protected async Task OnMessageAsync(ITurnContext turnContext, ITurnState turnState, CancellationToken cancellationToken)
    {
        logger.LogInformation($"Received user activity");
        await turnContext.SendActivityAsync(Activity.CreateTypingActivity(), cancellationToken);
        logger.LogInformation($"[{turnContext.Activity.From.Name}] {turnContext.Activity.Text}");

        var cleanedMessage = turnContext.Activity.RemoveRecipientMention(); // turnContext.Activity.Text;

        await turnContext.SendActivityAsync(MessageFactory.Text($"You typed {cleanedMessage}"),
            cancellationToken);
    }
}