// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Features.Kia;
using KhojiGenAIServer.Features.Kia.Models;
using Microsoft.Extensions.Logging;
using Moq;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Unit)]
class CategorizerTests
{
    Mock<ILogger<Categorizer>> loggerMock = null;

    [SetUp]
    public void SetUp()
    {
        loggerMock = new Mock<ILogger<Categorizer>>();
    }

    [Test]
    public void ExtractIssueTypes_ReturnsEmpty_WhenNoIssuesData()
    {
        var rawData = new Dictionary<string, object>
        {
            { "Data", new List<object>() }
        };

        var result = Categorizer.ExtractIssueTypes(loggerMock.Object, rawData);

        Assert.That(result, Is.Empty);
    }

    [Test]
    public void ExtractIssueTypes_ReturnsIssueTypes_WhenValidData()
    {
        var rawData = new Dictionary<string, object>
        {
            { "Data", new List<object>
                {
                    new Dictionary<string, object>
                    {
                        { "type", "issueTypes" },
                        { "data", new List<object>
                            {
                                new Dictionary<string, object>
                                {
                                    { "name", "Bug" },
                                    { "id", "1" },
                                    { "description", "A bug" },
                                    { "subtask", false },
                                    { "heirarchyLevel", 0 }
                                },
                                new Dictionary<string, object>
                                {
                                    { "name", "Task" },
                                    { "id", "2" },
                                    { "description", "A task" },
                                    { "subtask", true },
                                    { "heirarchyLevel", 1 }
                                }
                            }
                        }
                    }
                }
            }
        };

        var result = Categorizer.ExtractIssueTypes(loggerMock.Object, rawData);

        Assert.That(result, Has.Count.EqualTo(2));
        Assert.That(result.Any(x => x.Name == "Bug" && x.Id == "1"));
        Assert.That(result.Any(x => x.Name == "Task" && x.Id == "2"));
    }

    [Test]
    public void ExtractIssueTypes_DeduplicatesByName()
    {
        var rawData = new Dictionary<string, object>
        {
            { "Data", new List<object>
                {
                    new Dictionary<string, object>
                    {
                        { "type", "issueTypes" },
                        { "data", new List<object>
                            {
                                new Dictionary<string, object>
                                {
                                    { "name", "Bug" },
                                    { "id", "1" },
                                    { "description", "A bug" },
                                    { "subtask", false },
                                    { "heirarchyLevel", 0 }
                                },
                                new Dictionary<string, object>
                                {
                                    { "name", "Bug" },
                                    { "id", "1" },
                                    { "description", "A bug duplicate" },
                                    { "subtask", false },
                                    { "heirarchyLevel", 0 }
                                }
                            }
                        }
                    }
                }
            }
        };

        var result = Categorizer.ExtractIssueTypes(loggerMock.Object, rawData);

        Assert.That(result, Has.Count.EqualTo(1));
        Assert.That(result[0].Name, Is.EqualTo("Bug"));
    }

    [Test]
    public void ParseApiResponseCategorizer_ReturnsExpectedStructure()
    {
        var aiResponse = new Dictionary<string, object>
        {
            { "data", new List<Dictionary<string, object>>
                {
                    new()
                    {
                        { "title", "QA" },
                        { "issueTypes", new List<Dictionary<string, object>>
                            {
                                new() { { "issueTypeId", "1" }, { "issueTypeName", "Bug" } },
                                new() { { "issueTypeId", "2" }, { "issueTypeName", "Task" } }
                            }
                        }
                    }
                }
            }
        };

        var result = Categorizer.ParseApiResponseCategorizer(aiResponse);

        Assert.That(result.Message, Is.EqualTo("Issues categorized successfully"));
        Assert.That(result.Data, Is.Not.Null);
        Assert.That(result.Data, Has.Count.EqualTo(1));
        Assert.That(result.Data[0].Title, Is.EqualTo("QA"));
        var issueTypes = result.Data[0].IssueTypes;
        Assert.That(issueTypes, Has.Count.EqualTo(2));
        Assert.That(issueTypes[0].IssueTypeId, Is.EqualTo("1"));
        Assert.That(issueTypes[0].IssueTypeName, Is.EqualTo("Bug"));
        Assert.That(issueTypes[1].IssueTypeId, Is.EqualTo("2"));
        Assert.That(issueTypes[1].IssueTypeName, Is.EqualTo("Task"));
    }

    [Test]
    public async Task Categorize_ReturnsNoIssueTypesMessage_WhenEmptyInput()
    {
        var result = await Categorizer.Categorize(
            new Mock<IServiceProvider>().Object, environment: null,
            loggerMock.Object, logNumber: "0001",
            Enumerable.Empty<IssueTypeEntry>());

        Assert.That(result.Message, Is.EqualTo("No issue types provided"));
        Assert.That(result.Data, Is.Empty);
    }

    [Test]
    public async Task CallAiIssueCategorizer_ReturnsNoIssueTypes_WhenEmpty()
    {
        var result = await Categorizer.CallAiIssueCategorizer(
            new Mock<IServiceProvider>().Object, environment: null,
            loggerMock.Object, logNumber: "0001",
            Enumerable.Empty<IssueTypeEntry>()
        );


        Assert.That(result.Message, Is.EqualTo("No issue types provided"));
    }

    [Test]
    public void ReadyForCategorize_ReturnsIssueTypesKey()
    {
        var rawData = new Dictionary<string, object>
        {
            { "Data", new List<object>
                {
                    new Dictionary<string, object>
                    {
                        { "type", "issueTypes" },
                        { "data", new List<object>
                            {
                                new Dictionary<string, object>
                                {
                                    { "name", "Bug" },
                                    { "id", "1" },
                                    { "description", "A bug" },
                                    { "subtask", false },
                                    { "heirarchyLevel", 0 }
                                }
                            }
                        }
                    }
                }
            }
        };

        var result = Categorizer.ReadyForCategorize(loggerMock.Object, rawData);

        Assert.That(result, Has.Count.EqualTo(1));
        Assert.That(result[0].Name, Is.EqualTo("Bug"));
    }
}