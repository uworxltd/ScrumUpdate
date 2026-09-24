// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using AdaptiveCards;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Services;
using Microsoft.Agents.Core.Models;
using System.Text;
using System.Text.Json;

namespace KhojiGenAIServer.Chat.Teams;

static class AdaptiveCardsHelper
{
    static string escapeAndConvertEmojisToUnicode(string text)
    {
        // Convert emojis to \uXXXX unicode using JSON encoding
        string escaped = Newtonsoft.Json.JsonConvert.ToString(text);
        return escaped.Substring(1, escaped.Length - 2);
    }

    static string getAdaptiveCardContents(string schemaFileName)
    {
        var f = $"Chat/AdaptiveCards/{schemaFileName}.json";
        if (!File.Exists(f)) return null;
        return File.ReadAllText(f);
    }

    static string generateInstanceSelectionCard(IEnumerable<(string Name, int Id)> instances)
    {
        if (instances == null) throw new ArgumentNullException(nameof(instances));

        //var instanceList = instances.ToList();
        var instanceList = instances
            .GroupBy(x => x.Name)
            .SelectMany(g =>
                g.Count() == 1
                ? g.Select(x => new { x.Id, x.Name, DisplayName = x.Name })
                : g.Select(x => new { x.Id, x.Name, DisplayName = $"{x.Name} ({x.Id})" }))
            .ToList();

        if (!instanceList.Any()) throw new ArgumentException("Instances collection cannot be empty", nameof(instances));

        var choices = new List<object>();
        foreach (var instance in instanceList.OrderBy(s => s.Name))
        {
            if (string.IsNullOrWhiteSpace(instance.Name)) continue;

            choices.Add(new Dictionary<string, object>
            {
                ["title"] = instance.Name,
                ["value"] = instance.Id.ToString()
            });
        }

        if (!choices.Any()) throw new InvalidOperationException("No valid instances found to create choices");

        var body = new List<object>
        {
            new Dictionary<string, object>
            {
                ["type"] = "TextBlock",
                ["text"] = "Please select an instance to proceed",
                ["wrap"] = true,
                ["weight"] = "Bolder",
                ["size"] = "Medium"
            },
            new Dictionary<string, object>
            {
                ["type"] = "Input.ChoiceSet",
                ["id"] = "selectedInstance",
                ["style"] = "compact",
                ["isMultiSelect"] = false,
                ["placeholder"] = "Select an instance",
                ["choices"] = choices
            }
        };

        var actions = new List<object>
        {
            new Dictionary<string, object>
            {
                ["type"] = "Action.Submit",
                ["title"] = "Continue",
                ["data"] = new Dictionary<string, object>
                {
                    ["action"] = "x-khojicloud-instance-select"
                }
            }
        };

        var card = new Dictionary<string, object>
        {
            ["type"] = "AdaptiveCard",
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["version"] = "1.5",
            ["body"] = body,
            ["actions"] = actions
        };

        return JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true });
    }

    // A lil broken on mobile UI // lets see how we can fix it later
    static string generateTeamMembersSelectionCard(bool standupBoardFeatureFlag, string teamName,
        IEnumerable<(string Name, string AccountId, string Image)> members, string kssLastSync)
    {
        // Input validation
        if (members == null)
            throw new ArgumentNullException(nameof(members));

        var membersList = members.ToList();
        if (!membersList.Any())
            throw new ArgumentException("members collection cannot be empty", nameof(members));

        var choices = new List<object>();
        foreach (var member in membersList.OrderBy(s => s.Name))
        {
            // Validate instance data
            if (string.IsNullOrWhiteSpace(member.Name))
                continue; // Skip invalid entries

            choices.Add(new Dictionary<string, object>
            {
                ["title"] = member.Name,
                ["value"] = member.AccountId
            });
        }

        if (!choices.Any())
            throw new InvalidOperationException("No valid members found to create choices");

        var body = new List<object>
        {
            new Dictionary<string, object>
            {
                ["type"] = "TextBlock",
                ["text"] = teamName,
                ["wrap"] = true,
                ["weight"] = "Bolder",
                ["size"] = "Medium"
            },
            new Dictionary<string, object>
            {
                ["type"] = "TextBlock",
                ["text"] = "Please select a member to proceed",
                ["wrap"] = true,
                ["weight"] = "Bolder",
                ["size"] = "Medium"
            }
        };

        foreach (var member in membersList.OrderBy(s => s.Name))
        {
            if (string.IsNullOrWhiteSpace(member.Name))
                continue;

            body.Add(new Dictionary<string, object>
            {
                ["type"] = "ColumnSet",
                ["columns"] = new List<object>
                {
                    new Dictionary<string, object>
                    {
                        ["type"] = "Column",
                        ["width"] = "auto",
                        ["verticalContentAlignment"] = "Center",
                        ["items"] = new List<object>
                        {
                            new Dictionary<string, object>
                            {
                                ["type"] = "Image",
                                ["url"] = member.Image,
                                ["size"] = "Small",
                                ["style"] = "Person"
                            }
                        }
                    },
                    new Dictionary<string, object>
                    {
                        ["type"] = "Column",
                        ["width"] = "stretch",
                        ["verticalContentAlignment"] = "Center",
                        ["items"] = new List<object>
                        {
                            new Dictionary<string, object>
                            {
                                ["type"] = "TextBlock",
                                ["text"] = member.Name,
                                ["weight"] = "Default",
                                ["wrap"] = true
                            }
                        }
                    }
                },
                ["selectAction"] = new Dictionary<string, object>
                {
                    ["type"] = "Action.Submit",
                    ["title"] = member.Name,
                    ["data"] = new Dictionary<string, object>
                    {
                        ["action"] = "x-khojicloud-teammember-select",
                        ["accountId"] = member.AccountId
                    }
                }
            });
        }

        if (standupBoardFeatureFlag)
        {
            if (!string.IsNullOrEmpty(kssLastSync))
                kssLastSync = $"Your instance synced {kssLastSync}";
            else
                kssLastSync = $"Your instance is never synced";

            body.Add(new
            {
                type = "TextBlock",
                text = kssLastSync,
                wrap = true,
                size = "small",
                isSubtle = true,
                spacing = "Medium"
            });
        }

        var card = new Dictionary<string, object>
        {
            ["type"] = "AdaptiveCard",
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["version"] = "1.5",
            ["body"] = body,
            ["actions"] = new List<Dictionary<string, object>>
            {
                new() {
                    { "type", "Action.Submit" },
                    { "title", "Trigger Sync" },
                    { "data",
                        new
                        {
                            msteams = new
                            {
                                type = "messageBack",
                                text = "x-supervisor-syncstart"
                            }
                        }
                    }
                }
            }
        };

        return JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true });
    }

    static string generateErrorCard(string message, string subTitle, bool includeAiWarning)
    {
        var body = new List<object>
        {
            new
            {
                type = "TextBlock",
                weight = "Bolder",
                size = "Medium",
                text = message
            },
            new
            {
                type = "TextBlock",
                text = subTitle,
                wrap = true
            }
        };

        if (includeAiWarning)
            body.Add(new
            {
                type = "Container",
                spacing = "Small",
                horizontalAlignment = "Right",
                items = new List<object>
                {
                    new
                    {
                        type = "TextBlock",
                        text = "AI-generated content, please verify important details",
                        wrap = true,
                        isSubtle = true,
                        size = "Small",
                        horizontalAlignment = "Right",
                        spacing = "Small"
                    },
                    new
                    {
                        type = "ActionSet",
                        horizontalAlignment = "Right",
                        spacing = "None",
                        actions = new List<object>
                        {
                            new
                            {
                                type = "Action.Submit",
                                title = "Report issue",
                                data = new
                                {
                                    msteams = new
                                    {
                                        type = "messageBack",
                                        text = "x-khojicloud-reportIssue scrumUpdate"
                                    }
                                }
                            }
                        }
                    }
                }
            });

        var card = new Dictionary<string, object>
        {
            ["type"] = "AdaptiveCard",
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["version"] = "1.5",
            ["body"] = body
        };

        return JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true });
    }

    static object createActionGroup(string header, IEnumerable<dynamic> groupActions)
    {
        var groupItems = new List<object>
            {
                new
                {
                    type = "TextBlock",
                    text = header,
                    weight = "Bolder",
                    spacing = "Medium",
                    wrap = true,
                    separator = true
                }
            };

        foreach (var a in groupActions)
        {
            groupItems.Add(new
            {
                type = "Container",
                spacing = "Small",
                items = new object[]
                {
                        new
                        {
                            type = "ActionSet",
                            actions = new object[]
                            {
                                new
                                {
                                    type = "Action.Submit",
                                    title = a.title,
                                    data = new
                                    {
                                        msteams = new { type = "messageBack", text = a.text }
                                    }
                                }
                            }
                        },
                        new
                        {
                            type = "TextBlock",
                            text = a.description,
                            wrap = true,
                            spacing = "Small",
                            isSubtle = true
                        }
                }
            });
        }

        return new { type = "Container", items = groupItems };
    }

    public static Attachment GenerateAdaptiveCardAttachment(string card) =>
        new Attachment()
        {
            ContentType = "application/vnd.microsoft.card.adaptive",
            Content = card
        };

    public static Attachment GenerateUnregisteredUserCard(string userAadObjectId, string teamsAppId, string url)
    {
        var moddedNavigationToFe = KhojiConstants.KhojiXFeUrlForBot
            .Replace("$1", userAadObjectId)
            .Replace("$2", teamsAppId)
            .Replace("$3", Convert.ToBase64String(Encoding.UTF8.GetBytes(url)));

        var heroCard = new HeroCard
        {
            Title = "Welcome",
            Subtitle = "Connect Microsoft Teams to unlock a powerful, unified experience.",
            Text = "Whether you're already using or just getting started, linking your account opens the door to seamless collaboration and smart insights—right inside Teams.<br><strong>Ready to explore what’s possible?</strong><br><small>🔗 Link opens in external site</small>",
            Buttons = new List<CardAction> { new CardAction(ActionTypes.OpenUrl, "🔗 Sign In", value: moddedNavigationToFe) } //"This will open ScrumUpdate for sign in"
        };

        return heroCard.ToAttachment();
    }

    public static Attachment GenerateHelpCard(bool isSupervisor,
        bool scrumUpdatesFeatureFlag, bool worklogInsightsFeatureFlag, bool standupBoardFeatureFlag, bool sprintWatchFeatureFlag,
        bool kssHasData, bool kssNeedsSync, string kssLastSync,
        bool insightsAvailable, bool canChangeInstance)
    {
        var insightActions = new[]
        {
            new { title = "Today's Updates", text = "x-supervisor-todaysupdates", description = "Get a quick summary of important updates for today" }
        };

        var sprintWatchActions = new[]
        {
            new { title = "Enable Sprint Watch", text = "x-sprintwatch", description = "Track sprint board updates as they happen" },
            new { title = "Disable Sprint Watch", text = "x-sprintwatch-disable", description = "Stop tracking sprint board updates" },
        };

        var supervisorKssActions = new[]
        {
            new { title = "Team Members Update", text = "x-supervisor-teammembers-update", description = "See the latest updates from your team members" },
            new { title = "Team Worklogs", text = "x-supervisor-teammworklogs", description = "View logged work entries for your team" },
            new { title = "Sprint Analysis", text = "x-supervisor-sprintanalyzer", description = "Get insights into your current sprint performance" },
        };

        var syncActions = new[]
        {
            new { title = "Trigger Sync", text = "x-supervisor-syncstart", description = "Initiate Jira Synchronization" },
            new { title = "Enable Daily Sync", text = "x-supervisor-syncauto", description = "Enable Daily Jira Synchronization" },
            new { title = "Disable Daily Sync", text = "x-supervisor-syncauto-disable", description = "Disable Daily Jira Synchronization" }
        };

        var scrumUpdateAction = new[]
        {
            new { title = "Scrum Update", text = "x-khojicloud-scrumupdate", description = "View your daily scrum updates" }
        };

        var weeklyRetroAction = new[]
        {
            new { title = "Weekly Retrospective", text = "x-khojicloud-weeklyretro", description = "Reflect on your past week" }
        };

        var khojiCloudActions = new[]
        {
            new { title = "Daily Work Log", text = "x-khojicloud-worklog", description = "Generate your today's Work Log" },
            new { title = "Work Log Reminders", text = "x-khojicloud-worklogreminder", description = "Setup a reminder to log your work" }
        };

        var changeInstanceActions = new[]
        {
            new { title = "Change Instance", text = "x-subscription-changeInstance", description = "Switch between different instances" }
        };

        var teamsActions = new[]
        {
            new { title = "Support", text = "x-khojicloud-support", description = "Get technical help" },
            new { title = "Sign Out", text = "x-subscription-signout", description = "Sign out of your ScrumUpdate account" },
        };

        if (worklogInsightsFeatureFlag)
            khojiCloudActions = weeklyRetroAction.Concat(khojiCloudActions).ToArray();

        if (scrumUpdatesFeatureFlag)
            khojiCloudActions = scrumUpdateAction.Concat(khojiCloudActions).ToArray();

        var actions = isSupervisor && !kssNeedsSync && standupBoardFeatureFlag
            ? supervisorKssActions.Concat(khojiCloudActions).ToArray()
            : khojiCloudActions;

        if (canChangeInstance)
            actions = actions.Concat(changeInstanceActions).ToArray();

        if (sprintWatchFeatureFlag)
            actions = sprintWatchActions.Concat(actions).ToArray();

        if (standupBoardFeatureFlag && kssHasData)
            actions = actions.Concat(syncActions).ToArray();

        if (standupBoardFeatureFlag && insightsAvailable)
            actions = insightActions.Concat(actions).ToArray();

        var cardBody = new List<object>
        {
            new
            {
                type = "TextBlock",
                text = "What would you like help with?",
                wrap = true,
                weight = "Bolder",
                size = "Medium"
            }
        };

        if (standupBoardFeatureFlag && insightsAvailable)
            cardBody.Add(createActionGroup("📊 Insights", insightActions));

        if (sprintWatchFeatureFlag)
            cardBody.Add(createActionGroup("⏱ Sprint Watch", sprintWatchActions));

        if (isSupervisor && !kssNeedsSync && standupBoardFeatureFlag)
            cardBody.Add(createActionGroup("🧭 Supervisor Tools", supervisorKssActions));

        if (khojiCloudActions.Any())
            cardBody.Add(createActionGroup("🚀 Scrum Update Tools", khojiCloudActions));

        if (standupBoardFeatureFlag && kssHasData)
            cardBody.Add(createActionGroup("⚙️ Sync Options", syncActions));

        if (canChangeInstance)
            cardBody.Add(createActionGroup("🌐 Account Management", changeInstanceActions.Concat(teamsActions).ToArray()));
        else
            cardBody.Add(createActionGroup("🌐 Account Management", teamsActions));

        if (standupBoardFeatureFlag && !string.IsNullOrEmpty(kssLastSync))
        {
            cardBody.Add(new
            {
                type = "TextBlock",
                text = $"Your instance synced {kssLastSync}",
                wrap = true,
                size = "Small",
                isSubtle = true,
                spacing = "Medium",
                separator = true
            });
        }

        var card = new Dictionary<string, object>
        {
            ["type"] = "AdaptiveCard",
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["version"] = "1.6",
            ["body"] = cardBody
        };

        return GenerateAdaptiveCardAttachment(JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static Attachment GeneratePokerCard(string prefix, string key)
    {
        var pokerValues = new[] { "0.5", "1", "2", "3", "5", "8" };

        var card = new AdaptiveCard("1.5");
        card.Body.Add(new AdaptiveTextBlock
        {
            Text = $"Select your {key} poker estimate:",
            Weight = AdaptiveTextWeight.Bolder,
            Size = AdaptiveTextSize.Medium,
            Wrap = true
        });

        foreach (var value in pokerValues)
        {
            card.Actions.Add(new AdaptiveSubmitAction
            {
                Title = value,
                Type = AdaptiveSubmitAction.TypeName,
                Data = new
                {
                    msteams = new
                    {
                        type = "messageBack",
                        text = $"{prefix} {key} {value}",
                        //displayText = $"You selected {value}" if specified, on selection this message is displayed
                        // as sender has typed it in, not sure if this gets displayed in the chat group or not
                    }
                }
            });
        }

        return GenerateAdaptiveCardAttachment(card.ToJson());
    }

    public static Attachment GenerateSupportCard(string email)
    {
        var card = new AdaptiveCard("1.5")
        {
            Body =
            {
                new AdaptiveTextBlock("Support / Contact Us")
                {
                    Weight = AdaptiveTextWeight.Bolder,
                    Size = AdaptiveTextSize.Large,
                    Separator = true
                },
                new AdaptiveChoiceSetInput
                {
                    Id = "issueType",
                    Style = AdaptiveChoiceInputStyle.Compact,
                    Value = "Support Request",
                    Label = "This is a",
                    Choices =
                    {
                        new AdaptiveChoice { Title = "AI Content Issue", Value = "AI Content Issue" },
                        new AdaptiveChoice { Title = "Bug Report", Value = "Bug Report" },
                        new AdaptiveChoice { Title = "Feature Request", Value = "Feature Request" },
                        new AdaptiveChoice { Title = "Support Request", Value = "Support Request" }
                    }
                },
                new AdaptiveTextInput
                {
                    Id = "title",
                    Label = "Title",
                    Placeholder = "Enter title...",
                    IsRequired = true
                },
                new AdaptiveTextInput
                {
                    Id = "description",
                    Label = "Description",
                    Placeholder = "Please describe...",
                    IsMultiline = true,
                    IsRequired = true
                }
            },
            Actions =
            {
                new AdaptiveSubmitAction
                {
                    Title = "Submit",
                    Style = "positive",
                    Data = new
                    {
                        action = "x-khojicloud-submit",
                        email = email,
                        kind = "support"
                    }
                }
            }
        };

        return GenerateAdaptiveCardAttachment(card.ToJson());
    }

    public static Attachment GenerateReportIssueCard(string email, string kind)
    {
        var card = new AdaptiveCard("1.5")
        {
            Body =
            {
                new AdaptiveTextBlock("Report Issue")
                {
                    Weight = AdaptiveTextWeight.Bolder,
                    Size = AdaptiveTextSize.Large,
                    Separator = true
                },
                new AdaptiveChoiceSetInput
                {
                    Id = "issueType",
                    Style = AdaptiveChoiceInputStyle.Compact,
                    Value = "AI Content Issue",
                    Label = "This is a",
                    Choices =
                    {
                        new AdaptiveChoice { Title = "AI Content Issue", Value = "AI Content Issue" },
                        new AdaptiveChoice { Title = "Bug Report", Value = "Bug Report" },
                        new AdaptiveChoice { Title = "Issue", Value = "Issue" }
                    }
                },
                new AdaptiveTextInput
                {
                    Id = "description",
                    Label = "Description",
                    Placeholder = "Please describe...",
                    IsMultiline = true,
                    IsRequired = true
                }
            },
            Actions =
            {
                new AdaptiveSubmitAction
                {
                    Title = "Submit",
                    Style = "positive",
                    Data = new
                    {
                        action = "x-khojicloud-submit",
                        email = email,
                        kind = $"reportIssue.{kind}"
                    }
                }
            }
        };

        return GenerateAdaptiveCardAttachment(card.ToJson());
    }

    public static Attachment GenerateReportIssueButtonCard(string postFix)
    {
        var card = new AdaptiveCard(new AdaptiveSchemaVersion(1, 5))
        {
            Body = new List<AdaptiveElement>
            {
                new AdaptiveColumnSet
                {
                    Columns = new List<AdaptiveColumn>
                    {
                        new AdaptiveColumn
                        {
                            Width = "stretch"
                        },
                        new AdaptiveColumn
                        {
                            Width = "auto",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveActionSet
                                {
                                    Actions = new List<AdaptiveAction>
                                    {
                                        new AdaptiveSubmitAction
                                        {
                                            Title = "Report issue",
                                            Style = "positive", // optional
                                            DataJson = JsonSerializer.Serialize(new
                                            {
                                                msteams = new
                                                {
                                                    type = "messageBack",
                                                    text = $"x-khojicloud-reportIssue {postFix}"
                                                }
                                            })
                                        }
                                    }
                                }
                            }
                        }
                    },
                    Spacing = AdaptiveSpacing.Small,
                    Separator = true
                }
            }
        };

        return GenerateAdaptiveCardAttachment(card.ToJson());
    }

    public static Attachment GenerateOptionsCard(string title, Dictionary<string, string> options)
    {
        var body = new List<object>
        {
            new
            {
                type = "TextBlock",
                text = title,
                weight = "Bolder",
                size = "Medium"
            }
        };

        foreach (var option in options)
        {
            body.Add(new
            {
                type = "ColumnSet",
                columns = new object[]
                {
                    new
                    {
                        type = "Column",
                        width = "stretch",
                        items = new object[]
                        {
                            new
                            {
                                type = "ActionSet",
                                actions = new object[]
                                {
                                    new
                                    {
                                        type = "Action.Submit",
                                        title = option.Key,
                                        data = new
                                        {
                                            msteams = new
                                            {
                                                type = "messageBack",
                                                text = option.Value
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }

        var card = new Dictionary<string, object>
        {
            ["type"] = "AdaptiveCard",
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["version"] = "1.5",
            ["body"] = body
        };

        return GenerateAdaptiveCardAttachment(JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static Attachment GenerateWorklogsFactCard(decimal hoursPerDay, bool observeWeekends,
        Dictionary<string, Dictionary<DateOnly, (int seconds, string friendly)>> lastWeek,
        Dictionary<string, Dictionary<DateOnly, (int seconds, string friendly)>> thisWeek)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var allLogs = lastWeek.Concat(thisWeek)
            .GroupBy(x => x.Key) // group by member
            .ToDictionary(
                g => g.Key,
                g => g.SelectMany(d => d.Value).ToDictionary(k => k.Key, v => v.Value)
            );

        int totalSeconds = 0;
        int overLoggedSeconds = 0;
        int weekendLoggedSeconds = 0;

        foreach (var member in allLogs)
        {
            foreach (var log in member.Value)
            {
                var date = log.Key;
                int secs = log.Value.seconds;
                totalSeconds += secs;

                if (secs > 28800) // 8hrs
                    overLoggedSeconds += secs - 28800;

                if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                    weekendLoggedSeconds += secs;
            }
        }

        int teamSize = allLogs.Keys.Count;
        int expectedSecondsLastWeek = Convert.ToInt32(teamSize * hoursPerDay * (observeWeekends ? 5 : 7) * 3600);
        var startOfThisWeek = cutoff.AddDays(-(int)((cutoff.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)cutoff.DayOfWeek) - (int)DayOfWeek.Monday));
        int workingDaysThisWeek = Enumerable.Range(0, cutoff.DayNumber - startOfThisWeek.DayNumber)
            .Select(offset => startOfThisWeek.AddDays(offset))
            .Count(d => observeWeekends
            ? d.DayOfWeek is >= DayOfWeek.Monday and <= DayOfWeek.Friday
            : true);
        int expectedSecondsThisWeek = Convert.ToInt32(teamSize * workingDaysThisWeek * hoursPerDay * 3600);
        int expectedSeconds = expectedSecondsLastWeek + expectedSecondsThisWeek;
        int missingSeconds = expectedSeconds - totalSeconds;

        List<object> facts =
        [
            new { title = "Logged Hours", value = TimeSpan.FromSeconds(totalSeconds).ToHoursAndMinutes() },
            new { title = "Missing Hours", value = TimeSpan.FromSeconds(missingSeconds).ToHoursAndMinutes() },
            new { title = "Over Logged", value = TimeSpan.FromSeconds(overLoggedSeconds).ToHoursAndMinutes() }
        ];

        if (observeWeekends) facts.Add(new { title = "Weekend Logged", value = TimeSpan.FromSeconds(weekendLoggedSeconds).ToHoursAndMinutes() });

        var card = new Dictionary<string, object>
        {
            ["type"] = "AdaptiveCard",
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["version"] = "1.5",
            ["body"] = new object[]
            {
                new
                {
                    type = "FactSet",
                    facts = facts.ToArray()
                },
                new // Disclaimer text at the bottom
                {
                    type = "TextBlock",
                    text = "Worklogs are generated based on available synced data. Results may be incomplete, depending on the configured synchronization settings.",
                    wrap = true,
                    size = "small",
                    isSubtle = true,
                    spacing = "Medium"
                }
            }
        };

        return GenerateAdaptiveCardAttachment(JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static Attachment GenerateWorklogsWeekCard(decimal hoursPerDay, bool observeWeekends,
        string title, DateTime startOfWeek, Dictionary<string, Dictionary<DateOnly, (int seconds, string friendly)>> data,
        bool addResponsiveDisclaimer,
        string disclaimer = null)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var anyDate = startOfWeek;
        var weekStart = anyDate.AddDays(-((anyDate.DayOfWeek - DayOfWeek.Monday + 7) % 7));
        var days = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var date = weekStart.AddDays(offset);
                var dayName = date.DayOfWeek.ToString().Substring(0, 3); // "Mon", "Tue", ...
                return (date, dayName);
            })
            .ToList();
        var worklogs = new Dictionary<string, (bool future, int seconds, string friendly)[]>();

        foreach (var (name, logsByDate) in data)
        {
            var week = new (bool future, int seconds, string fridndly)[7];

            foreach (var (date, value) in logsByDate)
            {

                // Get index based on DayOfWeek, Monday = 0, Sunday = 6
                int index = (date.DayOfWeek - DayOfWeek.Monday + 7) % 7;
                week[index] = (future: date >= cutoff, value.seconds, value.friendly);
            }

            for (int i = 0; i < 7; i++)
                week[i].fridndly ??= ""; // filling missing entries

            worklogs[name] = week;
        }

        var dateHeader = new object[]
        {
            new
            {
                type = "Column",
                width = "80px",
                items = new object[]
                {
                    new
                    {
                        type = "TextBlock",
                        text = $"**{(days.Count > 0 ? days.First().date : DateTime.UtcNow):MMMM}**",
                        size = "Small",
                        weight = "Bolder"
                    }
                }
            }
        };
        var memberHeader = new object[]
        {
            new
            {
                type = "Column",
                width = "80px",
                items = new object[]
                {
                    new
                    {
                        type = "TextBlock",
                        text = "**Member**",
                        size = "Small",
                        weight = "Bolder"
                    }
                }
            }
        };

        var dateColumns = days.Select(s =>
        new
        {
            type = "Column",
            width = "40px",
            items = new object[]
            {
                new
                {
                    type = "TextBlock",
                    text = $"**{s.date.Day}**",
                    size = "Small",
                    weight = "Bolder"
                }
            }
        });
        var dayColumns = days.Select(s =>
        new
        {
            type = "Column",
            width = "40px",
            items = new object[]
            {
                new
                {
                    type = "TextBlock",
                    text = $"**{s.dayName}**",
                    size = "Small",
                    weight = "Bolder"
                }
            }
        });

        var monthHeaderColumns = dateHeader.Concat(dateColumns);
        var dayHeaderColumns = memberHeader.Concat(dayColumns);

        var firstThreeRows = new object[]
        {
            new
            {
                type = "TextBlock",
                text = $"**{title} Worklogs (incl. weekends)**",
                wrap = true,
                weight = "Bolder",
                spacing = "Small"
            },
            new
            {
                type = "ColumnSet",
                columns = monthHeaderColumns
            },
            new
            {
                type = "ColumnSet",
                columns = dayHeaderColumns
            }
        };

        var items = new List<object>();
        items.AddRange(firstThreeRows);

        var weekdayLimit = observeWeekends ? 7 : 5;
        foreach (var member in worklogs.Keys)
        {
            var columns = new List<object>
            {
                new
                {
                    type = "Column",
                    width = "80px",
                    items = new object[]
                    {
                        new
                        {
                            type = "TextBlock",
                            text = member,
                            size = "Small"
                        }
                    }
                }
            };

            for (int i = 0; i < worklogs[member].Length; i++)
            {
                var future = worklogs[member][i].future;
                var friendly = worklogs[member][i].friendly;
                var seconds = worklogs[member][i].seconds;

                if (seconds % 3600 == 0 && seconds > 0) friendly = (seconds / 3600).ToString();
                if (seconds == 0) friendly = "";

                (var worklog, var color) = seconds > hoursPerDay * 3600 && i < weekdayLimit
                    ? (friendly, "Default")
                    : seconds < hoursPerDay * 3600 && seconds > 0 && i < weekdayLimit && !future
                        //? i < 5 ? ($"⚠️{friendly}", "Default") : (friendly, "Default")
                        ? i < 5 ? (friendly, "Warning") : (friendly, "Default")
                    : seconds > 0 && i >= weekdayLimit
                        //? i < 5 ? ($"🟣{friendly}", "Default") : (friendly, "Default")
                        ? i < 5 ? (friendly, "Warning") : (friendly, "Default")
                    : (friendly, "Default");

                if (seconds > hoursPerDay * 3600) color = "Attention";

                columns.Add(new
                {
                    type = "Column",
                    width = "40px",
                    items = new object[]
                    {
                        new
                        {
                            type = "TextBlock",
                            text = worklog,
                            size = "Small",
                            //horizontalAlignment = "Right",
                            color = color
                        }
                    }
                });
            }

            items.Add(new
            {
                type = "ColumnSet",
                columns
            });
        }

        var body = new List<object>
        {
            new
            {
                type = "ColumnSet",
                columns = new object[]
                {
                    new
                    {
                        type = "Column",
                        width = "stretch",
                        items
                    }
                }
            }
        };

        if (addResponsiveDisclaimer)
            body.Add(new
            {
                type = "TextBlock",
                text = "For best viewing experience, please switch to portrait mode if the weekly worklog is not fully visible",
                wrap = true,
                isSubtle = true,
                size = "Small",
                horizontalAlignment = "Left",
                spacing = "Small"
            });

        if (!string.IsNullOrEmpty(disclaimer))
            body.Add(new
            {
                type = "TextBlock",
                text = disclaimer,
                wrap = true,
                size = "small",
                isSubtle = true,
                spacing = "Medium"
            });

        var card = new Dictionary<string, object>
        {
            ["type"] = "AdaptiveCard",
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["version"] = "1.5",
            ["body"] = body
        };

        return GenerateAdaptiveCardAttachment(JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static Attachment GenerateScrumUpdateCard(KbsClient.ScrumResponse scrumResponse, string member)
    {
        if (scrumResponse.Message.ToLower() == "no activity found" || scrumResponse.Message.ToLower() == "there is no data to be processed by ai")
        {
            var noActivityCard = getAdaptiveCardContents("NoDataCard")
                .Replace("${Member}", member);
            return GenerateAdaptiveCardAttachment(noActivityCard);
        }

        var jsonCard = getAdaptiveCardContents("ScrumUpdateCard");
        jsonCard = jsonCard
            .Replace("${Member}", member)
            .Replace("${Last_Day}", scrumResponse.Last_Day)
            .Replace("${Current_Day}", scrumResponse.Current_Day)
            .Replace("${Blockers}", scrumResponse.Blockers);

        return GenerateAdaptiveCardAttachment(jsonCard);
    }

    public static Attachment GenerateWeeklyRetroCard(KbsClient.WeeklyRetroResponse retro, string member)
    {
        var jsonCard = getAdaptiveCardContents("WeeklyRetroIndvidual");
        var escaped = escapeAndConvertEmojisToUnicode(retro.Summary);

        jsonCard = jsonCard
            .Replace("${Member}", member)
            .Replace("${WeeklySummary}", escaped)
            .Replace("${DateRange}", retro.DateRange);

        return GenerateAdaptiveCardAttachment(jsonCard);
    }

    public static string GenerateAIWorklogCard(KbsClient.GenerateAIWorkLogResponse logs, string email, string fromName, bool includeUnsubscribe)
    {
        // before constructing the body we need to do some basic error handling
        if (!string.IsNullOrEmpty(logs.ErrorCode) && !string.IsNullOrEmpty(logs.Message))
        {
            // incase of an error in APIs dont send any activity to user
            if (logs.ErrorCode == "ND003" || logs.ErrorCode == "ND004" || logs.ErrorCode == "ND005")
                return null;

            return generateErrorCard(logs.Message, subTitle: "Text back after doing some activity 😉", includeAiWarning: true);
        }

        var body = new List<object>
        {
            new Dictionary<string, object>
            {
                ["type"] = "Container",
                ["style"] = "emphasis",
                ["items"] = new List<object>
                {
                    new Dictionary<string, object>
                    {
                        ["type"] = "TextBlock",
                        ["text"] = $"{fromName}'s Work Logs",
                        ["weight"] = "Bolder",
                        ["size"] = "Large",
                        ["horizontalAlignment"] = "Center",
                        ["color"] = "Accent",
                        ["spacing"] = "Large"
                    },
                    new Dictionary<string, object>
                    {
                        ["type"] = "ColumnSet",
                        ["spacing"] = "Medium",
                        ["separator"] = true,
                        ["columns"] = new List<object>
                        {
                            new Dictionary<string, object>
                            {
                                ["type"] = "Column",
                                ["width"] = 1,
                                ["items"] = new List<object>
                                {
                                    new Dictionary<string, object>
                                    {
                                        ["type"] = "TextBlock",
                                        ["text"] = "Key",
                                        ["weight"] = "Bolder",
                                        ["wrap"] = true,
                                        ["color"] = "Good"
                                    }
                                }
                            },
                            new Dictionary<string, object>
                            {
                                ["type"] = "Column",
                                ["width"] = 3,
                                ["items"] = new List<object>
                                {
                                    new Dictionary<string, object>
                                    {
                                        ["type"] = "TextBlock",
                                        ["text"] = "Summary",
                                        ["weight"] = "Bolder",
                                        ["wrap"] = true,
                                        ["color"] = "Good"
                                    }
                                }
                            },
                            new Dictionary<string, object>
                            {
                                ["type"] = "Column",
                                ["width"] = 1,
                                ["items"] = new List<object>
                                {
                                    new Dictionary<string, object>
                                    {
                                        ["type"] = "TextBlock",
                                        ["text"] = "Time (h)",
                                        ["weight"] = "Bolder",
                                        ["wrap"] = true,
                                        ["horizontalAlignment"] = "Right",
                                        ["color"] = "Good"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            new
            {
                type="Container",
                spacing = "Small",
                horizontalAlignment = "Right",
                items = new List<object>
                {
                    new
                    {
                        type = "TextBlock",
                        text = "AI-generated content, please verify important details",
                        wrap = true,
                        isSubtle = true,
                        size = "Small",
                        horizontalAlignment = "Right",
                        spacing =  "Small"
                    },
                    new
                    {
                        type = "ActionSet",
                        horizontalAlignment = "Right",
                        spacing = "None",
                        actions = new List<object>
                        {
                            new
                            {
                                type = "Action.Submit",
                                title = "Report issue",
                                data = new
                                {
                                    msteams = new
                                    {
                                        type = "messageBack",
                                        text = "x-khojicloud-reportIssue workLogs"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        // Find the container's "items" list to append rows
        var container = body[0] as Dictionary<string, object>;
        var items = container["items"] as List<object>;

        // Add dynamic rows
        foreach (var log in logs.Data)
        {
            items.Add(new Dictionary<string, object>
            {
                ["type"] = "ColumnSet",
                ["spacing"] = "Small",
                ["separator"] = true,
                ["columns"] = new List<object>
                {
                    new Dictionary<string, object>
                    {
                        ["type"] = "Column",
                        ["width"] = 1,
                        ["items"] = new List<object>
                        {
                            new Dictionary<string, object>
                            {
                                ["type"] = "TextBlock",
                                ["text"] = log.Key,
                                ["wrap"] = true
                            }
                        }
                    },
                    new Dictionary<string, object>
                    {
                        ["type"] = "Column",
                        ["width"] = 3,
                        ["items"] = new List<object>
                        {
                            new Dictionary<string, object>
                            {
                                ["type"] = "TextBlock",
                                ["text"] = log.Summary,
                                ["wrap"] = true
                            }
                        }
                    },
                    new Dictionary<string, object>
                    {
                        ["type"] = "Column",
                        ["width"] = 1,
                        ["items"] = new List<object>
                        {
                            new Dictionary<string, object>
                            {
                                ["type"] = "TextBlock",
                                ["text"] = log.Time.ToString(),
                                ["horizontalAlignment"] = "Right"
                            }
                        }
                    }
                }
            });
        }

        var actions = new List<object>
        {
            new Dictionary<string, object>
            {
                ["type"] = "Action.Submit",
                ["title"] = "Submit Work Logs",
                ["data"] = new Dictionary<string, object>
                {
                    ["action"] = "x-khojicloud-submit-ai-worklog",
                    ["workLogs"] = logs.Data,
                    ["identifier"] = logs.UniqueIdentifier,
                    ["aud"] = email
                },
                ["style"] = "positive"
            },
            new
            {
                type = "Action.Submit",
                title = "Unsubscribe Reminders",
                data = new
                {
                    msteams = new
                    {
                        type = "messageBack",
                        text = "x-timesheet-disable"
                    }
                }
            }
        };

        var card = new Dictionary<string, object>
        {
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["type"] = "AdaptiveCard",
            ["version"] = "1.5",
            ["body"] = body,
            ["actions"] = actions
        };

        return JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true });
    }

    public static Attachment GenerateCard(string schemaFileName)
    {
        if (getAdaptiveCardContents(schemaFileName) is string s)
            return GenerateAdaptiveCardAttachment(s);
        else
            return null;
    }

    public static string GenerateScheduleAdaptiveCard(string actionToSchedule, string title, string submitButtonText)
    {
        //var timeZones = new TimeZoneClient().GetAllAvailableTimeZones().Select(s => new { title = s, value = s });
        var timeZones = TimeZoneInfo.GetSystemTimeZones().Select(z => new { title = z.DisplayName, value = z.Id });

        var card = new Dictionary<string, object>
        {
            { "type", "AdaptiveCard" },
            { "$schema", "http://adaptivecards.io/schemas/adaptive-card.json" },
            { "version", "1.5" },
            {
                "body", new List<Dictionary<string, object>>
                {
                    new()
                    {
                        { "type", "TextBlock" },
                        { "text", title },
                        { "weight", "Bolder" },
                        { "size", "Medium" },
                        { "wrap", true },           // for mobile ?
                        { "spacing", "Medium" }     // for mobile ?
                    },
                    //new() {
                    //    { "type", "Input.Time" },
                    //    { "id", "time" },
                    //    { "label", "Time" },
                    //    { "isRequired", true },
                    //    { "errorMessage", "Please select a time." }
                    //},
                    new()
                    {
                        { "type", "TextBlock" },
                        { "text", "Select a time:" },
                        { "wrap", true },
                        { "spacing", "Small" }
                    },
                    new()
                    {
                        { "type", "Input.Time" },
                        { "id", "time" },
                        { "isRequired", true },
                        { "errorMessage", "Please select a time." }
                    },
                    new() {
                        { "type", "Input.ChoiceSet" },
                        { "id", "timezone" },
                        { "label", "Select Timezone" },
                        { "style", "filtered" }, //compact
                        { "isRequired", true },
                        { "errorMessage", "Timezone is required." },
                        {
                            "choices", timeZones
                        }
                    }
                    //new()
                    //{
                    //    { "type", "TextBlock" },
                    //    { "text", "Select timezone:" },
                    //    { "wrap", true },
                    //    { "spacing", "Small" }
                    //},
                    //new()
                    //{
                    //    { "type", "Input.ChoiceSet" },
                    //    { "id", "timezone" },
                    //    { "style", "filtered" }, // expanded renders the whole list, compact
                    //    { "isMultiSelect", false },
                    //    { "isRequired", true },
                    //    { "errorMessage", "Timezone is required." },
                    //    { "choices", timeZones },
                    //    { "height", "stretch" } // new
                    //}
                }
            },
            {
                "actions", new List<Dictionary<string, object>>
                {
                    new()
                    {
                        { "type", "Action.Submit" },
                        { "title", submitButtonText },
                        {
                            "data", new Dictionary<string, object>
                            {
                                { "action", actionToSchedule }
                            }
                        }
                    }
                }
            }
        };

        return JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = true });
    }

    public static Attachment GenerateInstanceSelectionCard(IEnumerable<(string Name, int Id)> instances) =>
        GenerateAdaptiveCardAttachment(generateInstanceSelectionCard(instances));

    public static Attachment GenerateTeamMembersSelectionCard(bool standupBoardFeatureFlag, string teamName, IEnumerable<(string Name, string Id, string Image)> members, string kssLastSync) =>
        GenerateAdaptiveCardAttachment(generateTeamMembersSelectionCard(standupBoardFeatureFlag, teamName, members, kssLastSync));

    public static Attachment GenerateScheduleCard(string actionToSchedule,
        string title = "Pick a time and timezone", string submitButtonText = "Schedule") =>
        GenerateAdaptiveCardAttachment(GenerateScheduleAdaptiveCard(actionToSchedule, title, submitButtonText));
}
