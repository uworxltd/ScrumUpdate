// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Teams.Plugins;
using Microsoft.Agents.Builder;

namespace KhojiGenAIServer.Chat.Agents;

class KhojiSubscriptionAgent : BaseFrameworkAgent
{

    public KhojiSubscriptionAgent(IServiceProvider service)
        : base(service.GetRequiredService<ILogger>(),
            nameof(KhojiSubscriptionAgent),
            llm: "claude-haiku",
            tools: CreateAITools(
                new KhojiSubscriptionPlugin(service.GetRequiredService<ITurnContext>(),
                    service.GetRequiredService<KhojiSubscriptionPluginPayload>())))
    { }
}
