// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Plugins;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using Microsoft.Agents.Builder;
using System.ComponentModel;

namespace KhojiGenAIServer.Chat.Teams.Plugins;

class AnalyticsPlugin(ILogger logger, ITurnContext turnContext, PluginPayload payload)
{
    [Description("Analyze the active sprint")]
    public async Task<string> AnalyzeSprintAsync()
    {
        logger.LogInformation($"AnalyticsPlugin::AnalyzeSprintAsync with payload {payload}");

        var g = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
        if (g.GetConfiguredSprintId(payload.InstanceId) is int sprintId)
            await turnContext.AnalyzeSprintAsync(payload.Token, logger, payload.Email, turnContext.Activity.From.Name,
                payload.InstanceId, sprintId);
        else
            await turnContext.SendActivityAsync("No active sprint found.");

        return ScrumPlugin.PluginStopKeyword;
    }

    [Description("Analyze the given sprint")]
    public async Task<string> AnalyzeGivenSprintAsync(
        [Description("The sprint name")] string sprintName)
    {
        logger.LogInformation($"AnalyticsPlugin::AnalyzeGivenSprintAsync({sprintName}) with payload {payload}");

        bool r = await turnContext.AnalyzeSprintAsync(payload.Token, logger, payload.Email, turnContext.Activity.From.Name,
            payload.InstanceId, sprintName);

        return ScrumPlugin.PluginStopKeyword;
    }
}
