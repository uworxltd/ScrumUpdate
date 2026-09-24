// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Extensions;
using Microsoft.Agents.Builder;
using System.ComponentModel;
using Uworx.Khoji.Agile.AI;

namespace KhojiGenAIServer.Chat.Plugins;

class ScrumPlugin(
    ILogger logger,
    ITurnContext turnContext, // we need to get rid of this before moving this to Chat.Plugins
    PluginPayload payload)
{
    public const string PluginStopKeyword = "x-khojix-stop";

    [ToolFunction("get_scrumupdate"), Description("Sends the scrum update to the user")]
    public async Task<string> GetScrumUpdateAsync()
    {
        logger.LogInformation($"KhojiCloudPlugin::GetScrumUpdateAsync with payload {payload}");
        await turnContext.SendScrumUpdateAsync(payload.Token, logger, payload.Member, payload.Email, payload.InstanceId);

        return PluginStopKeyword;
    }

    [ToolFunction("get_weeklyretro"), Description("Sends the weekly retrospective")]
    public async Task<string> GetWeeklyRetroAsync()
    {
        logger.LogInformation($"KhojiCloudPlugin::GetWeeklyRetroAsync with payload {payload}");
        await turnContext.SendWeeklyRetroAsync(payload.Token, logger, payload.Member, payload.Email, payload.InstanceId);

        return PluginStopKeyword;
    }
}
