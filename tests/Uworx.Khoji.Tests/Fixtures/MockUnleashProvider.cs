// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Moq;
using Unleash;

namespace Uworx.Khoji.Tests.Fixtures;

class MockUnleashProvider
{
    public Mock<IUnleash> Mock { get; }

    public MockUnleashProvider()
    {
        Mock = new Mock<IUnleash>();
        // Default: all flags disabled
        Mock.Setup(u => u.IsEnabled(It.IsAny<string>()))
            .Returns(false);
    }

    public MockUnleashProvider WithFlagEnabled(string flagName, bool enabled = true)
    {
        Mock.Setup(u => u.IsEnabled(flagName))
            .Returns(enabled);
        return this;
    }

    public MockUnleashProvider WithActiveFlagsKhojiV2_2()
    {
        WithFlagEnabled("kgs-llm", true)
            .WithFlagEnabled("kgs-posthog", true)
            .WithFlagEnabled("sprint-watch", true)
            .WithFlagEnabled("standup-board", true)
            .WithFlagEnabled("worklog-insights", true)
            .WithFlagEnabled("cheat-codes", false)
            .WithFlagEnabled("scrum-assistant", false);
        return this;
    }

    public IUnleash Build() => Mock.Object;
}
