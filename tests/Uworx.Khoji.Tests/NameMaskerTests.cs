// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using KhojiGenAIServer.Features.Kia;
using KhojiGenAIServer.Features.Kia.Models;
using System.Text.Json;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Unit)]
class NameMaskerTests
{
    NUnitLogger<NameMaskerTests> logger = new();

    [Test]
    public void Test_MaskNames_ReplacesNamesInDataBeforeLLM()
    {
        const string userName = "khurram";
        const string assignee = "jane.doe";

        var data = new WorklogRequest
        {
            UserName = userName,
            Date = "2025-09-20",
            ActivityLogs =
            [
                new ActivityLog
                {
                    Key = "SU-1",
                    Fields = new ActivityFields
                    {
                        Summary = "Fix masking",
                        Reporter = userName,
                        Assignee = assignee
                    }
                }
            ]
        };

        var masker = WorklogGenerator.MaskNames(logger, data);

        var serialized = JsonSerializer.Serialize(data);

        Assert.Multiple(() =>
        {
            Assert.That(data.UserName, Is.Not.EqualTo(userName));
            Assert.That(masker.TryGetMasked(userName, out var maskedUserName), Is.True);
            Assert.That(data.UserName, Is.EqualTo(maskedUserName));
            Assert.That(serialized, Does.Not.Contain(userName));
            Assert.That(serialized, Does.Not.Contain(assignee));

            // Masked name resolves back to the original via the unmask direction
            Assert.That(masker.TryGetValue(data.UserName, out var original), Is.True);
            Assert.That(original, Is.EqualTo(userName));
        });
    }

    [Test]
    public void Test_MaskNames_GetReplacements_RoundTrips()
    {
        var data = new ScrumUpdateRequest
        {
            UserName = "khurram",
            ActivityLogs =
            [
                new ActivityLog
                {
                    Fields = new ActivityFields { Reporter = "khurram" }
                }
            ]
        };

        var masker = WorklogGenerator.MaskNames(logger, data);

        foreach (var (masked, original) in masker.GetReplacements())
        {
            Assert.That(original, Is.EqualTo("khurram"));
            Assert.That(data.UserName, Is.EqualTo(masked));
        }
    }
}