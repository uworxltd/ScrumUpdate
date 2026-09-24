// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Uworx.Khoji.Semantics;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Unit)]
class IntentDetectorTests
{
    IntentDetector detector = null;

    [SetUp]
    public void Setup()
    {
        var intentsFolder = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "Kgs", "KhojiGenAIServer", "Intents"));
        detector = IntentDetector.LoadIntentsFrom(intentsFolder);
    }

    [Test]
    public void Intent_ScrumUpdate_ShouldBeTrue()
    {
        bool result = detector.MatchesIntent("What's my scrum update?",
            IntentDetector.SupportedIntents.ScrumUpdate.ToString());
        Assert.That(result, Is.True);
    }

    [Test]
    public void Intent_ScrumUpdate_ShouldBeFalse()
    {
        bool result = detector.MatchesIntent("Why sky is blue?",
            IntentDetector.SupportedIntents.ScrumUpdate.ToString());
        Assert.That(result, Is.False);
    }

    [Test]
    public void Intent_WeeklyRetro_ShouldBeTrue()
    {
        bool result = detector.MatchesIntent("How is my week going?",
            IntentDetector.SupportedIntents.WeeklyRetro.ToString());
        Assert.That(result, Is.True);
    }

    [Test]
    public void Intent_WeeklyRetro_ShouldBeFalse()
    {
        bool result = detector.MatchesIntent("What's the first day of week?",
            IntentDetector.SupportedIntents.WeeklyRetro.ToString());
        Assert.That(result, Is.False);
    }
}
