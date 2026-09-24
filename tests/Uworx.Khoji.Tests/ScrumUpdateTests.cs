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
class ScrumUpdateTests
{
    NUnitLogger<ScrumUpdateTests> logger = new();
    string logNumber = "0001";

    [Test]
    public void Test_extract_date_from_timestamp_Valid()
    {
        var timestamp = "2025-09-20T14:23:45.123+0000";
        var (date, time) = ScrumUpdate.ExtractDateFromTimestamp(timestamp);

        Assert.That(date, Is.EqualTo(new DateTime(2025, 9, 20).Date));
        Assert.That(time.Hours, Is.EqualTo(14)); // 14 + 5
        Assert.That(time.Minutes, Is.EqualTo(23));
    }

    [Test]
    public void Test_extract_date_from_timestamp_ValidFormat()
    {
        var (date, time) = ScrumUpdate.ExtractDateFromTimestamp("2025-09-23T14:32:45.123+0000");

        Assert.That(date.Year, Is.EqualTo(2025));
        Assert.That(time.Hours, Is.EqualTo(14)); // 14 + 5
    }

    [Test]
    public void Test_extract_date_from_timestamp_Invalid_Throws()
    {
        Assert.Throws<FormatException>(() =>
        {
            ScrumUpdate.ExtractDateFromTimestamp("invalid-timestamp");
        });
    }

    [Test]
    public void Test_extract_date_from_timestamp_InvalidFormat_Throws()
    {
        Assert.Throws<FormatException>(() =>
            ScrumUpdate.ExtractDateFromTimestamp("bad-date-format"));
    }

    [Test]
    public void Test_user_exists_WhenUserInChangeLog_ReturnsTrue()
    {
        var logs = new List<ActivityLog>
        {
            new()
            {
                ChangeLog = new ActivityChangeLog
                {
                    History =
                    [
                        new ActivityHistoryEntry { Username = "khurram", CreatedAt = "2025-09-20T10:00:00.000+0000" }
                    ]
                }
            }
        };

        Assert.That(ScrumUpdate.UserExists("khurram", logs), Is.True);
    }

    [Test]
    public void Test_user_exists_WhenUserNotFound_ReturnsFalse()
    {
        var logs = new List<ActivityLog>();
        Assert.That(ScrumUpdate.UserExists("khurram", logs), Is.False);
    }

    [Test]
    public void Test_user_exists_AfterMasking_UsesMaskedNameAgainstMaskedLogs()
    {
        // Regression: name masking (ba63444bc + d369d24bd) rewrites UserName and
        // ActivityLog usernames in place before the LLM call. Matching user activity
        // must use the masked name, otherwise the user is never found in the logs
        // and the pipeline short-circuits to a "No activity" response.
        var data = new ScrumUpdateRequest
        {
            UserName = "khurram",
            ActivityLogs =
            [
                new ActivityLog
                {
                    Key = "SU-1",
                    Fields = new ActivityFields { Summary = "Fix masking" },
                    ChangeLog = new ActivityChangeLog
                    {
                        History =
                        [
                            new ActivityHistoryEntry { Username = "khurram", CreatedAt = "2025-09-21T12:00:00.000+0000" }
                        ]
                    }
                }
            ]
        };

        var masker = WorklogGenerator.MaskNames(logger, data);

        Assert.Multiple(() =>
        {
            Assert.That(data.UserName, Is.Not.EqualTo("khurram"), "UserName should be masked in place");
            Assert.That(data.ActivityLogs[0].ChangeLog.History[0].Username, Is.EqualTo(data.UserName),
                "Activity log usernames should be masked consistently with UserName");
            Assert.That(ScrumUpdate.UserExists(data.UserName, data.ActivityLogs), Is.True,
                "UserExists must match using the masked name against masked logs");
        });
    }

    [Test]
    public void Test_format_comments_SimpleText()
    {
        var comments = new List<Dictionary<string, object?>>
        {
            new Dictionary<string, object?>
            {
                ["content"] = new List<Dictionary<string, object?>>
                {
                    new Dictionary<string, object?> { ["type"] = "text", ["text"] = "Hello" }
                }
            }
        };

        var formatted = ScrumUpdate.FormatComments(comments);
        Assert.That(formatted, Is.EqualTo("Hello"));
    }

    [Test]
    public void Test_get_worklog_summary_HasSummary()
    {
        var rawData = new Dictionary<string, object?> { ["summary"] = "Worked on issue" };
        var result = ScrumUpdate.GetWorklogSummary(rawData);

        Assert.That(result, Is.EqualTo("Worked on issue"));
    }

    [Test]
    public void Test_get_worklog_summary_NoSummary()
    {
        var rawData = new Dictionary<string, object?>();
        var result = ScrumUpdate.GetWorklogSummary(rawData);

        Assert.That(result, Is.EqualTo("No summary provided for this user."));
    }

    [Test]
    public void Test_get_date_Found()
    {
        var rawData = new Dictionary<string, object?> { ["date"] = "2025-09-21" };

        var result = ScrumUpdate.GetDate(logger, logNumber, rawData);

        Assert.That(result, Is.EqualTo("2025-09-21"));
    }

    [Test]
    public void Test_get_date_NotFound_Throws()
    {
        var rawData = new Dictionary<string, object?>();

        Assert.Throws<InvalidOperationException>(() =>
        {
            ScrumUpdate.GetDate(logger, logNumber, rawData);
        });
    }

    [Test]
    public void Test_user_exists_FindsUserInChangeLog()
    {
        var logs = new List<ActivityLog>
        {
            new()
            {
                ChangeLog = new ActivityChangeLog
                {
                    History =
                    [
                        new ActivityHistoryEntry { Username = "khurram", CreatedAt = "2025-09-21T12:00:00.000+0000" }
                    ]
                }
            }
        };

        Assert.That(ScrumUpdate.UserExists("khurram", logs), Is.True);
        Assert.That(ScrumUpdate.UserExists("ahmad", logs), Is.False);
    }

    [Test]
    public void Test_format_comments_TextAndMentions()
    {
        var comments = new List<Dictionary<string, object?>>
        {
            new()
            {
                ["content"] = new List<Dictionary<string, object?>>
                {
                    new() { ["type"] = "text", ["text"] = "Hello" },
                    new() { ["type"] = "mention", ["attrs"] = new Dictionary<string, object?> { ["text"] = "@khurram" } }
                }
            }
        };

        var result = ScrumUpdate.FormatComments(comments);
        Assert.That(result, Is.EqualTo("Hello @khurram"));
    }

    [Test]
    public void Test_get_user_activity_on_date_FindsActivities()
    {
        var logs = new List<ActivityLog>
        {
            new()
            {
                Key = "TASK-1",
                ChangeLog = new ActivityChangeLog
                {
                    History =
                    [
                        new ActivityHistoryEntry
                        {
                            CreatedAt = "2025-09-22T09:00:00.000+0000",
                            Username = "khurram",
                            ChangeLog = []
                        }
                    ]
                },
                Fields = new ActivityFields { Summary = "Fix bug" }
            }
        };

        var (keys, activities) = ScrumUpdate.GetUserActivityOnDate(logger, logNumber,
            "scrum update", logs, "khurram", "2025-09-22");

        Assert.That(keys, Does.Contain("TASK-1"));
        Assert.That(activities.Count, Is.EqualTo(1));
    }

    [Test]
    public void Test_get_calendar_tickets_MergesJiraAndCalendar()
    {
        // Arrange: Jira ticket + calendar event
        var rawData = new Dictionary<string, object?>
        {
            ["sourceData"] = new List<Dictionary<string, object?>>
            {
                new()
                {
                    ["sourceName"] = "Jira",
                    ["data"] = new List<Dictionary<string, object?>>
                    {
                        new()
                        {
                            ["key"] = "TASK-1",
                            ["fields"] = new Dictionary<string, object?>
                            {
                                ["summary"] = "Fix bug"
                            }
                        }
                    }
                },
                new()
                {
                    ["sourceName"] = "MS-Calendar-View",
                    ["data"] = new List<Dictionary<string, object?>>
                    {
                        new()
                        {
                            ["subject"] = "Team Meeting",
                            ["start"] = new Dictionary<string, object?> { ["dateTime"] = "2025-09-23T10:00:00.000+0000" },
                            ["end"] = new Dictionary<string, object?> { ["dateTime"] = "2025-09-23T11:00:00.000+0000" },
                            ["isCancelled"] = false
                        }
                    }
                }
            }
        };

        // Act
        var tickets = ScrumUpdate.GetCalendarTickets(logger, logNumber, rawData);

        // Assert
        Assert.That(tickets.Count, Is.EqualTo(1));

        //var jira = tickets.FirstOrDefault(t => (string?)t["key"] == "TASK-1");
        //Assert.That(jira, Is.Not.Null);
        //Assert.That(((Dictionary<string, object?>)jira["fields"])["summary"], Is.EqualTo("Fix bug"));

        //var meeting = tickets.FirstOrDefault(t => (string?)t["subject"] == "Team Meeting");
        //Assert.That(meeting, Is.Not.Null);
        //Assert.That(meeting["isCancelled"], Is.EqualTo(false));
    }

    [Test]
    public void Test_get_calendar_tickets_NoSourceData_ReturnsEmpty()
    {
        var rawData = new Dictionary<string, object?>();

        var tickets = ScrumUpdate.GetCalendarTickets(logger, logNumber, rawData);

        Assert.That(tickets, Is.Empty);
    }

    [Test]
    public void Test_get_calendar_tickets_NoCalendarEvents_ReturnsOnlyJira()
    {
        var rawData = new Dictionary<string, object?>
        {
            ["sourceData"] = new List<Dictionary<string, object?>>
            {
                new()
                {
                    ["sourceName"] = "Jira",
                    ["data"] = new List<Dictionary<string, object?>>
                    {
                        new()
                        {
                            ["key"] = "TASK-99",
                            ["fields"] = new Dictionary<string, object?>
                            {
                                ["summary"] = "Only Jira"
                            }
                        }
                    }
                }
            }
        };

        var tickets = ScrumUpdate.GetCalendarTickets(logger, logNumber, rawData);

        Assert.That(tickets.Count, Is.EqualTo(1));
        Assert.That(tickets.First().Key, Is.EqualTo("TASK-99"));
    }

    [Test]
    public void Test_get_calendar_tickets_CancelledEvents_AreExcluded()
    {
        var rawData = new Dictionary<string, object?>
        {
            ["sourceData"] = new List<Dictionary<string, object?>>
            {
                new()
                {
                    ["sourceName"] = "MS-Calendar-View",
                    ["data"] = new List<Dictionary<string, object?>>
                    {
                        new()
                        {
                            ["subject"] = "Cancelled Standup",
                            ["start"] = new Dictionary<string, object?> { ["dateTime"] = "2025-09-23T09:00:00.000+0000" },
                            ["end"] = new Dictionary<string, object?> { ["dateTime"] = "2025-09-23T09:30:00.000+0000" },
                            ["isCancelled"] = true
                        }
                    }
                }
            }
        };

        var tickets = ScrumUpdate.GetCalendarTickets(logger, logNumber, rawData);

        Assert.That(tickets, Is.Empty);
    }

    [Test]
    public void Test_get_activity_logs_jira_ExtractsUserActivity()
    {
        // Arrange
        var rawData = new Dictionary<string, object?>
        {
            ["sourceData"] = new List<Dictionary<string, object?>>
            {
                new()
                {
                    ["sourceName"] = "Jira",
                    ["sourceUserDisplayName"] = "Khurram",
                    ["data"] = new List<Dictionary<string, object?>>
                    {
                        new()
                        {
                            ["key"] = "TASK-1",
                            ["fields"] = new Dictionary<string, object?>
                            {
                                ["summary"] = "Fix login bug",
                                ["issuetype"] = new Dictionary<string, object?> { ["name"] = "Bug" },
                                ["status"] = new Dictionary<string, object?> { ["name"] = "In Progress" },
                                ["created"] = "2025-09-21T10:00:00.000+0000"
                            },
                            ["changelog"] = new Dictionary<string, object?>
                            {
                                ["histories"] = new List<Dictionary<string, object?>>
                                {
                                    new()
                                    {
                                        ["created"] = "2025-09-22T12:00:00.000+0000",
                                        ["author"] = new Dictionary<string, object?>
                                        {
                                            ["displayName"] = "Khurram"
                                        },
                                        ["items"] = new List<Dictionary<string, object?>>
                                        {
                                            new() { ["field"] = "status", ["fromString"] = "To Do", ["toString"] = "In Progress" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var logs = ScrumUpdate.GetActivityLogsJira(logger, logNumber, rawData);

        // Assert
        Assert.That(logs.Count, Is.EqualTo(1));
        var log = logs.First();

        Assert.That(log.Key, Is.EqualTo("TASK-1"));

        Assert.That(log.Fields.Summary, Is.EqualTo("Fix login bug"));
        Assert.That(log.Fields.IssueType, Is.EqualTo("Bug"));
        Assert.That(log.Fields.Status, Is.EqualTo("In Progress"));

        Assert.That(log.ChangeLog.History.Count, Is.EqualTo(1));
        Assert.That(log.ChangeLog.History[0].Username, Is.EqualTo("Khurram"));
    }

    [Test]
    public void Test_get_activity_logs_jira_SkipsOtherUsers()
    {
        var rawData = new Dictionary<string, object?>
        {
            ["sourceData"] = new List<Dictionary<string, object?>>
            {
                new()
                {
                    ["sourceName"] = "Jira",
                    ["sourceUserDisplayName"] = "Khurram",
                    ["data"] = new List<Dictionary<string, object?>>
                    {
                        new()
                        {
                            ["key"] = "TASK-2",
                            ["changelog"] = new Dictionary<string, object?>
                            {
                                ["histories"] = new List<Dictionary<string, object?>>
                                {
                                    new()
                                    {
                                        ["created"] = "2025-09-22T14:00:00.000+0000",
                                        ["author"] = new Dictionary<string, object?>
                                        {
                                            ["displayName"] = "Ahmad"
                                        },
                                        ["items"] = new List<Dictionary<string, object?>>()
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        var logs = ScrumUpdate.GetActivityLogsJira(logger, logNumber, rawData);

        Assert.That(logs, Is.Empty);
    }

    [Test]
    public void Test_get_activity_logs_jira_NoSourceData_ReturnsEmpty()
    {
        var rawData = new Dictionary<string, object?>();

        var logs = ScrumUpdate.GetActivityLogsJira(logger, logNumber, rawData);

        Assert.That(logs, Is.Empty);
    }

    [Test]
    public void Test_get_activity_logs_jira_TrimsLongStrings()
    {
        var longString = new string('x', 5000);

        var rawData = new Dictionary<string, object?>
        {
            ["sourceData"] = new List<Dictionary<string, object?>>
            {
                new()
                {
                    ["sourceName"] = "Jira",
                    ["sourceUserDisplayName"] = "Khurram",
                    ["data"] = new List<Dictionary<string, object?>>
                    {
                        new()
                        {
                            ["key"] = "TASK-3",
                            ["changelog"] = new Dictionary<string, object?>
                            {
                                ["histories"] = new List<Dictionary<string, object?>>
                                {
                                    new()
                                    {
                                        ["created"] = "2025-09-22T15:00:00.000+0000",
                                        ["author"] = new Dictionary<string, object?>
                                        {
                                            ["displayName"] = "Khurram"
                                        },
                                        ["items"] = new List<Dictionary<string, object?>>
                                        {
                                            new() { ["fromString"] = longString, ["toString"] = longString }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        var logs = ScrumUpdate.GetActivityLogsJira(logger, logNumber, rawData);

        Assert.That(logs.Count, Is.EqualTo(1));
        var items = logs[0].ChangeLog.History[0].ChangeLog;

        Assert.That(items[0].FromString.Length, Is.LessThanOrEqualTo(ScrumUpdate.MAX_STRING_LENGTH));
        Assert.That(items[0].ToStringValue.Length, Is.LessThanOrEqualTo(ScrumUpdate.MAX_STRING_LENGTH));
    }

    [Test]
    public void Test_activity_log_serializes_with_wire_keys()
    {
        var log = new ActivityLog
        {
            Key = "TASK-1",
            ChangeLog = new ActivityChangeLog
            {
                History =
                [
                    new ActivityHistoryEntry
                    {
                        CreatedAt = "2025-09-22T10:00:00.000+0000",
                        Username = "Khurram",
                        ChangeLog =
                        [
                            new ActivityChangeItem { Field = "status", FromString = "To Do", ToStringValue = "In Progress" }
                        ]
                    }
                ]
            },
            Fields = new ActivityFields { Summary = "Fix bug", Status = "In Progress" }
        };

        var json = JsonSerializer.Serialize(log);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.That(root.GetProperty("key").GetString(), Is.EqualTo("TASK-1"));
        Assert.That(root.GetProperty("fields").GetProperty("summary").GetString(), Is.EqualTo("Fix bug"));
        var history = root.GetProperty("changeLog").GetProperty("history");
        Assert.That(history.GetArrayLength(), Is.EqualTo(1));
        var changeItem = history[0].GetProperty("changeLog")[0];
        Assert.That(history[0].GetProperty("created-at").GetString(), Is.EqualTo("2025-09-22T10:00:00.000+0000"));
        Assert.That(history[0].GetProperty("username").GetString(), Is.EqualTo("Khurram"));
        Assert.That(changeItem.GetProperty("fromString").GetString(), Is.EqualTo("To Do"));
        Assert.That(changeItem.GetProperty("toString").GetString(), Is.EqualTo("In Progress"));
    }

    [Test]
    public void Test_get_value_by_key_resolves_json_property_name()
    {
        var item = new ActivityChangeItem { Field = "status", FromString = "To Do", ToStringValue = "In Progress" };

        Assert.That(WorklogGenerator.GetValueByKey(item, "field"), Is.EqualTo("status"));
        Assert.That(WorklogGenerator.GetValueByKey(item, "fromString"), Is.EqualTo("To Do"));
        Assert.That(WorklogGenerator.GetValueByKey(item, "toString"), Is.EqualTo("In Progress"));
    }
}
