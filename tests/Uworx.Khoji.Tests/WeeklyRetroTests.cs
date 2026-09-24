// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Features.Kia;
using KhojiGenAIServer.Features.Kia.Models;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using static Uworx.Khoji.Tests.NUnitConstants;


namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Unit)]
class WeeklyRetroTests
{
    [Test]
    public void ReturnsEmpty_WhenUserNameMissing()
    {
        var raw = new Dictionary<string, object>();
        var result = WeeklyRetro.ConvertToWeeklyRetroFormat(NullLogger.Instance, "0001", raw, out string user);

        Assert.That(result.FormattedIssues, Is.Empty);
    }

    [Test]
    public void ReturnsFormattedIssues_WhenValidInput()
    {
        var raw = new Dictionary<string, object>
        {
            ["userName"] = "Khurram",
            ["userRole"] = "Engineer",
            ["issues"] = new List<Dictionary<string, object>>
            {
                new()
                {
                    ["key"] = "ISSUE-1",
                    ["fields"] = new Dictionary<string, object>
                    {
                        ["summary"] = "Fix bug",
                        ["worklog"] = new Dictionary<string, object>
                        {
                            ["worklogs"] = new List<Dictionary<string, object>>
                            {
                                new()
                                {
                                    ["author"] = new Dictionary<string, object>{{"displayName", "Khurram" } },
                                    ["started"] = "2025-09-10T10:00:00.000+0000",
                                    ["timeSpent"] = "2h",
                                    ["comment"] = "Bug fix work"
                                }
                            }
                        }
                    }
                }
            },
            ["dateRange"] = new List<object> { "2025-09-09", "2025-09-13" }
        };

        var result = WeeklyRetro.ConvertToWeeklyRetroFormat(NullLogger.Instance, "0001", raw, out string user);

        Assert.That(user, Is.Not.Null.And.Not.Empty);
        Assert.That(result.FormattedIssues, Is.Not.Null.And.Not.Empty);
        Assert.That(result.FormattedIssues[0].Worklogs, Does.Contain("2h"));
    }

    [Test]
    public void ParsesDictionaryWithSummary()
    {
        var dict = new Dictionary<string, object> { ["summary"] = "Done!" };

        var result = WeeklyRetro.ParseApiSummaryResponse(NullLogger.Instance, "0001", dict);

        Assert.That(result["summary"], Is.EqualTo("Done!"));
    }

    [Test]
    public void ParsesJsonStringResponse()
    {
        var json = "{\"summary\":\"Worked on tests\"}";

        var result = WeeklyRetro.ParseApiSummaryResponse(NullLogger.Instance, "0001", json);

        Assert.That(result["summary"]?.ToString(), Is.EqualTo("Worked on tests"));
    }

    [Test]
    public void Throws_WhenUnexpectedFormat()
    {
        Assert.Throws<ArgumentException>(() =>
            WeeklyRetro.ParseApiSummaryResponse(NullLogger.Instance, "0001", 42));
    }

    [Test]
    public async Task CreatesChatHistoryWithSystemAndUserMessages()
    {
        var worklogs = new List<FormattedIssue>
        {
            new() { Key = "ISSUE-1", Summary = "Some work", Worklogs = "2h (test)" }
        };

        File.WriteAllText("Prompts/kia_weekly-retro.xml", "SYSTEM PROMPT");

        var history = await LlmLayer.PrepareWeeklyRetroChatMessages(environment: null, NullLogger.Instance, logNumber: "0001",
            promptName: "kia_weekly-retro", "Engineer", worklogs);

        Assert.That(history, Is.Not.Null);
        Assert.That(history.Count, Is.EqualTo(2));
        Assert.That(history[0].Text, Does.Contain("SYSTEM PROMPT"));
        Assert.That(history[1].Text, Does.Contain("Engineer"));
    }

    [Test]
    public async Task ReturnsParsedJson_WhenResponseContainsValidJson()
    {
        var mockClient = new Mock<IChatClient>();
        mockClient.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), default))
            .ReturnsAsync(new ChatResponse
            {
                Messages = [new ChatMessage(ChatRole.Assistant, "{ \"summary\": \"All good\" }")]
            });

        ServiceCollection serviceCollection = [
            new ServiceDescriptor(typeof(IChatClient), mockClient.Object)
        ];

        var result = await LlmLayer.WeeklyRetroChatCompletition(serviceCollection.BuildServiceProvider(),
            environment: null, NullLogger.Instance, "0001", promptName: "WeeklyRetro",
            [
                new ChatMessage(ChatRole.System, "system text"),
                new ChatMessage(ChatRole.User, "user text")
            ]);

        Assert.That(result["summary"]?.ToString(), Is.EqualTo("All good"));
    }

    [Test]
    public async Task ReturnsDefault_WhenResponseHasNoJson()
    {
        var mockClient = new Mock<IChatClient>();
        mockClient.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), default))
            .ReturnsAsync(new ChatResponse
            {
                Messages = [new ChatMessage(ChatRole.Assistant, "No JSON here!")]
            });

        ServiceCollection serviceCollection = [
            new ServiceDescriptor(typeof(IChatClient), mockClient.Object)
        ];

        var result = await LlmLayer.WeeklyRetroChatCompletition(serviceCollection.BuildServiceProvider(),
            environment: null, NullLogger.Instance, "0001", promptName: "kia_weekly-retro",
            [
                new ChatMessage(ChatRole.System, "system text"),
                new ChatMessage(ChatRole.User, "user text")
            ]);

        Assert.That(result["summary"].ToString(), Does.Contain("Unable to generate summary"));
    }

    [Test]
    public async Task ReturnsParsedSummary_WhenAiReturnsValidJson()
    {
        // Arrange
        var worklogs = new List<FormattedIssue>
        {
            new() { Key = "ISSUE-123", Summary = "Fixed login bug", Worklogs = "2h debugging" }
        };
        var mockClient = new Mock<IChatClient>();
        mockClient.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), default))
            .ReturnsAsync(new ChatResponse
            {
                Messages = [new ChatMessage(ChatRole.Assistant, "{ \"summary\": \"User fixed login bug\" }")]
            });
        ServiceCollection serviceCollection = [
            new ServiceDescriptor(typeof(IChatClient), mockClient.Object)
        ];

        // Act
        var result = await WeeklyRetro.SummarizeCurrentWorklogs(serviceCollection.BuildServiceProvider(),
            environment: null, NullLogger.Instance, "0001",
            new WeeklyRetroRequest
            {
                UserRole = "Engineer",
                FormattedIssues = worklogs
            });

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Summary, Is.EqualTo("User fixed login bug"));
    }

    [Test]
    public async Task ReturnsDefault_WhenAiReturnsGarbage()
    {
        var worklogs = new List<FormattedIssue>
        {
            new() { Key = "ISSUE-123", Summary = "Worked on feature", Worklogs = "1h review" }
        };

        var mockClient = new Mock<IChatClient>();
        mockClient.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), default))
            .ReturnsAsync(new ChatResponse
            {
                Messages = [new ChatMessage(ChatRole.Assistant, "blah blah not JSON")]
            });
        ServiceCollection serviceCollection = [
            new ServiceDescriptor(typeof(IChatClient), mockClient.Object)
        ];

        var result = await WeeklyRetro.SummarizeCurrentWorklogs(serviceCollection.BuildServiceProvider(),
            environment: null, NullLogger.Instance, "0001",
            new WeeklyRetroRequest
            {
                UserRole = "Engineer",
                FormattedIssues = worklogs
            });

        Assert.That(result, Is.Not.Null);
        Assert.That(result.Summary.StartsWith("Unable to generate summary"));
    }

    [Test]
    public void Throws_WhenAiClientFails()
    {
        var worklogs = new List<FormattedIssue>
        {
            new() { Key = "ISSUE-456", Summary = "Code cleanup", Worklogs = "3h refactor" }
        };

        var mockClient = new Mock<IChatClient>();
        mockClient.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), default))
            .ThrowsAsync(new Exception("AI service unavailable"));
        ServiceCollection serviceCollection = [
            new ServiceDescriptor(typeof(IChatClient), mockClient.Object)
        ];

        Assert.ThrowsAsync<Microsoft.AspNetCore.Http.BadHttpRequestException>(async () =>
            await WeeklyRetro.SummarizeCurrentWorklogs(serviceCollection.BuildServiceProvider(),
            environment: null, NullLogger.Instance, "0001",
            new WeeklyRetroRequest
            {
                UserRole = "Engineer",
                FormattedIssues = worklogs
            }));
    }
}
