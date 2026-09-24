// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.TeamsFx.Conversation;

#nullable enable

namespace KhojiGenAIServer.Extensions;

static class ConversationBotExtentions
{
    public static async Task<List<TeamsBotInstallation>> GetAllInstallationsAsync(this ConversationBot conversationBot,
        CancellationToken cancellationToken = default)
    {
        var pageSize = 100;
        string? continuationToken = null;

        List<TeamsBotInstallation> installations = [];

        do
        {
            var pagedInstallations = await conversationBot.Notification.GetPagedInstallationsAsync(
                pageSize,
                continuationToken,
                cancellationToken
            );

            if (pagedInstallations.Data != null && pagedInstallations.Data.Length != 0)
                installations.AddRange(pagedInstallations.Data);


            continuationToken = pagedInstallations.ContinuationToken;

        } while (!string.IsNullOrEmpty(continuationToken));

        return installations;
    }

    public static async Task SendMessageToAllInstallations(this ConversationBot conversationBot, Object message,
        CancellationToken cancellationToken = default)
    {
        var pageSize = 100;
        string? continuationToken = null;

        do
        {
            var pagedInstallations = await conversationBot.Notification.GetPagedInstallationsAsync(pageSize,
                continuationToken, cancellationToken);

            foreach (var installation in pagedInstallations.Data)
                if (message is string str)
                    await installation.SendMessage(str, cancellationToken);
                else
                    await installation.SendAdaptiveCard(message, cancellationToken);

            continuationToken = pagedInstallations.ContinuationToken;

        } while (!string.IsNullOrEmpty(continuationToken));
    }
}
