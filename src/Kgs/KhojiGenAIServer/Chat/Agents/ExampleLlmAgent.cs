// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Plugins;
using Microsoft.Extensions.AI;

namespace KhojiGenAIServer.Chat.Agents;

// this is an example agent
class ExampleLlmAgent : BaseFrameworkAgent
{
    public ExampleLlmAgent(IServiceProvider service)
        : base(service.GetRequiredService<ILogger>(),
            agentName: "WebChatAgent", // Instruction file
            llm: "claude-haiku",
            tools: CreateAITools(
                new DatabasePlugin(service.GetRequiredService<ILogger>(),
                    service.GetRequiredService<PluginPayload>())))
    { }
}
