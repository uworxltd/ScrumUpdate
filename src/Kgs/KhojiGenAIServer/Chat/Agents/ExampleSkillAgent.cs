// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.Extensions.AI;

namespace KhojiGenAIServer.Chat.Agents;

// this is an example agent
class ExampleSkillAgent : BaseFrameworkAgent
{
    public ExampleSkillAgent(IServiceProvider service)
        : base(service.GetRequiredService<ILogger>(),
            agentName: "ExampleSkillAgent",
            llm: "claude-haiku",
            skillId: "code-explainer")
    { }
}
