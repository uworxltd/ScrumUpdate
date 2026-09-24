// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Features.Kia.Models;
using System.Globalization;
using System.Text.Json.Serialization;

namespace KhojiGenAIServer.Features.Kia;

// public because of tests
public class ScrumUpdate
{
    public record ScrumUpdateResponse
    {
        [property: JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [property: JsonPropertyName("last_day")]
        public string LastDay { get; set; } = string.Empty;

        [property: JsonPropertyName("current_day")]
        public string CurrentDay { get; set; } = string.Empty;

        [property: JsonPropertyName("blockers")]
        public string Blockers { get; set; } = string.Empty;

        [property: JsonPropertyName("calendar_connected")]
        public bool CalendarConnected { get; set; } = true;
    };

    // public because of tests
    public const int MAX_STRING_LENGTH = 200;

    static object? getNested(IDictionary<string, object?> dict, params string[] keys)
    {
        object? current = dict;
        foreach (var key in keys)
        {
            if (current is Dictionary<string, object?> d && d.TryGetValue(key, out var next))
                current = next;
            else
                return null;
        }
        return current;
    }

    // public because of tests
    public static string FormatComments(IEnumerable<IDictionary<string, object?>> comments)
    {
        var formatted_comments = "";

        foreach (var comment in comments)
        {
            if (comment.TryGetValue("content", out var contentObj) &&
                contentObj is List<Dictionary<string, object?>> contentList)
            {
                foreach (var msg in contentList)
                {
                    if (msg.TryGetValue("type", out var typeObj) && typeObj is string type)
                    {
                        if (type == "text")
                        {
                            if (msg.TryGetValue("text", out var textObj) && textObj is string text)
                                formatted_comments += text + " ";
                        }
                        else if (type == "mention")
                        {
                            if (msg.TryGetValue("attrs", out var attrsObj) &&
                                attrsObj is Dictionary<string, object?> attrs &&
                                attrs.TryGetValue("text", out var mentionTextObj) &&
                                mentionTextObj is string mentionText)
                            {
                                formatted_comments += mentionText + " ";
                            }
                        }
                        else if (type == "paragraph")
                        {
                            formatted_comments += FormatComments(new List<Dictionary<string, object?>> { msg });
                        }
                        else if (type == "orderedList" || type == "bulletList")
                        {
                            if (msg.TryGetValue("content", out var subContentObj) &&
                                subContentObj is List<Dictionary<string, object?>> subContent)
                            {
                                formatted_comments += FormatComments(subContent);
                            }
                        }
                        else if (type == "listItem")
                        {
                            if (msg.TryGetValue("content", out var listItemContentObj) &&
                                listItemContentObj is List<Dictionary<string, object?>> listItemContent)
                            {
                                formatted_comments += "- " + FormatComments(listItemContent);
                            }
                        }
                    }
                }
            }
        }

        return formatted_comments.Trim();
    }

    public static bool UserExists(string user_name, IEnumerable<ActivityLog> logs)
    {
        try
        {
            foreach (var log in logs)
            {
                // --- Check changeLog.history
                foreach (var history in log.ChangeLog.History)
                {
                    if (history.Username == user_name)
                        return true;
                }

                // --- Check fields.comment
                foreach (var comment in log.Fields.Comment)
                {
                    if (comment.Username == user_name)
                        return true;
                }

                // --- Check fields.reporter
                if (log.Fields.Reporter == user_name)
                    return true;

                // --- Check fields.assignee
                if (log.Fields.Assignee == user_name)
                    return true;
            }

            return false;
        }
        catch (Exception e)
        {
            throw new InvalidOperationException($"An error occurred while checking for the user: {e.Message}", e);
        }
    }

    static string getUserName(ILogger logger, string logNumber, IDictionary<string, object?> rawData)
    {
        logger.LogDebug($"[{logNumber}] Extracting user name from raw data");

        if (rawData.TryGetValue("sourceData", out var sourceDataObj) &&
            sourceDataObj is IEnumerable<object> sourceList)
        {
            foreach (var source in sourceList)
            {
                if (source is Dictionary<string, object?> srcDict &&
                    srcDict.TryGetValue("sourceName", out var sourceName) &&
                    sourceName?.ToString() == "Jira" &&
                    srcDict.TryGetValue("sourceUserDisplayName", out var displayName))
                {
                    logger.LogInformation($"[{logNumber}] User name extracted successfully: {displayName}");
                    return displayName?.ToString() ?? "";
                }
            }
        }

        logger.LogError($"[{logNumber}] sourceData not found in the raw data");
        throw new InvalidOperationException("sourceData not found in the raw data");
    }

    static string getDate(ILogger logger, string logNumber, IDictionary<string, object?> rawData, string key)
    {
        if (rawData.TryGetValue(key, out var dateObj))
        {
            logger.LogDebug($"[{logNumber}] Date extracted successfully at {key}");
            return dateObj?.ToString() ?? "";
        }

        logger.LogError($"[{logNumber}] date not found in the raw data at {key}");
        throw new InvalidOperationException($"{key} not found in the raw data");
    }

    // public because of tests
    public static string GetDate(ILogger logger, string logNumber, IDictionary<string, object?> rawData) =>
        getDate(logger, logNumber, rawData, "date");

    static List<CalendarEvent> getCalendarEvents(ILogger logger, string logNumber, IDictionary<string, object?> rawData)
    {
        if (!rawData.TryGetValue("sourceData", out var sourceDataObj) || sourceDataObj is not IEnumerable<object> sourceData)
        {
            logger.LogError($"[{logNumber}] sourceData not found in raw data");
            return new List<CalendarEvent>();
        }

        // Find calendar data (sourceName == "MS-Calendar-View")
        var calendarData = sourceData
            .OfType<Dictionary<string, object?>>()
            .FirstOrDefault(s => s.TryGetValue("sourceName", out var sn) && sn?.ToString() == "MS-Calendar-View")
            ?? new Dictionary<string, object?>();

        var eventsObj = calendarData.TryGetValue("data", out var d) && d is IEnumerable<object> list
            ? list.OfType<Dictionary<string, object?>>().ToList()
            : new List<Dictionary<string, object?>>();

        if (!eventsObj.Any())
        {
            logger.LogInformation($"[{logNumber}] No calendar events found");
            return new List<CalendarEvent>();
        }

        var allEvents = new List<CalendarEvent>();
        foreach (var ev in eventsObj)
        {
            var start = ev.TryGetValue("start", out var s) && s is Dictionary<string, object?> sd
                ? sd.GetValueOrDefault("dateTime")?.ToString()
                : null;

            var end = ev.TryGetValue("end", out var e) && e is Dictionary<string, object?> ed
                ? ed.GetValueOrDefault("dateTime")?.ToString()
                : null;

            // Original filter excludes events where isCancelled is not a bool.
            // Only create a CalendarEvent when the raw value is a bool.
            if (ev.GetValueOrDefault("isCancelled") is not bool cancelled) continue;

            allEvents.Add(new CalendarEvent
            {
                Subject = ev.GetValueOrDefault("subject")?.ToString(),
                Start = start,
                End = end,
                IsCancelled = cancelled
            });
        }

        // Filter out cancelled events
        var nonCancelled = allEvents
            .Where(ev => !ev.IsCancelled)
            .ToList();

        return nonCancelled;
    }

    // public because of tests
    public static List<CalendarTicket> GetCalendarTickets(ILogger logger, string logNumber, Dictionary<string, object?> rawData)
    {
        var result = new List<CalendarTicket>();

        if (!rawData.TryGetValue("sourceData", out var sourceDataObj) || sourceDataObj is not IEnumerable<object> sourceData)
        {
            logger.LogError($"[{logNumber}] sourceData not found in raw data");
            return result;
        }

        // Get defaults data
        var defaultsData = sourceData
            .OfType<Dictionary<string, object?>>()
            .FirstOrDefault(s => s.TryGetValue("sourceName", out var sn) && sn?.ToString() == "defaults")
            ?? new Dictionary<string, object?>();

        var tickets = defaultsData.TryGetValue("data", out var ticketsObj) && ticketsObj is IEnumerable<object> tks
            ? tks.OfType<Dictionary<string, object?>>().ToList()
            : new List<Dictionary<string, object?>>();

        var defaultTickets = new List<CalendarTicket>();
        if (tickets.Any())
        {
            foreach (var ticket in tickets)
            {
                var fields = ticket.TryGetValue("fields", out var fieldsObj) && fieldsObj is Dictionary<string, object?> f
                    ? f
                    : new Dictionary<string, object?>();

                defaultTickets.Add(new CalendarTicket
                {
                    Key = ticket.GetValueOrDefault("key")?.ToString() ?? "",
                    Summary = fields.GetValueOrDefault("summary")?.ToString() ?? "",
                    IssueType = (fields.GetValueOrDefault("issuetype") as Dictionary<string, object?>)?.GetValueOrDefault("name")?.ToString() ?? "",
                    Parent = fields.GetValueOrDefault("parent") ?? new Dictionary<string, object?>()
                });
            }
        }
        else
        {
            logger.LogWarning($"[{logNumber}] No default tickets found");
        }

        // Get activity logs from Jira
        var activityLogs = GetActivityLogsJira(logger, logNumber, rawData);

        // Extract unique keys
        var uniqueKeys = activityLogs
            .Select(a => a.Key)
            .Where(k => !string.IsNullOrEmpty(k))
            .Distinct()
            .ToList();

        var uniqueKeysData = new List<CalendarTicket>();
        foreach (var key in uniqueKeys)
        {
            var keyData = activityLogs
                .FirstOrDefault(a => a.Key == key)
                ?? new ActivityLog();

            uniqueKeysData.Add(new CalendarTicket
            {
                Key = keyData.Key,
                Summary = keyData.Fields.Summary,
                IssueType = keyData.Fields.IssueType,
                Parent = keyData.Fields.Parent
            });
        }

        // Extract project codes
        var projects = uniqueKeysData
            .Select(k => k.Key?.Split('-').FirstOrDefault())
            .Where(p => !string.IsNullOrEmpty(p))
            .Distinct()
            .ToList();

        logger.LogInformation($"[{logNumber}] Projects: {projects}");

        if (projects.Any())
        {
            defaultTickets = defaultTickets
                .Where(t => projects.Contains(t.Key?.Split('-').FirstOrDefault()))
                .ToList();
        }

        // Combine
        result = defaultTickets.Concat(uniqueKeysData).ToList();

        if (!result.Any())
        {
            logger.LogWarning($"[{logNumber}] No tickets found");
            return new List<CalendarTicket>();
        }

        return result;
    }

    static string historyTupleString(ActivityHistoryEntry h) =>
        h.CreatedAt + "|" + string.Join(";", h.ChangeLog.Select(ci =>
            string.Join(",", $"field:{ci.Field},fromString:{ci.FromString},toString:{ci.ToStringValue}")));

    static List<ActivityLog> removeDuplicateActivities(List<ActivityLog> activity_logs)
    {
        var uniqueLogs = new List<ActivityLog>();
        var seenKeys = new HashSet<string>();

        foreach (var log in activity_logs)
        {
            var logKey = log.Key;
            if (logKey == null) continue;

            if (!seenKeys.Contains(logKey))
            {
                seenKeys.Add(logKey);

                // remove duplicate history entries
                var uniqueHistory = new List<ActivityHistoryEntry>();
                var seenHistory = new HashSet<string>();

                foreach (var history in log.ChangeLog.History)
                {
                    var historyTuple = historyTupleString(history);

                    if (!seenHistory.Contains(historyTuple))
                    {
                        seenHistory.Add(historyTuple);
                        uniqueHistory.Add(history);
                    }
                }

                log.ChangeLog.History = uniqueHistory;
                uniqueLogs.Add(log);
            }
            else
            {
                // if log_key already exists, merge unique history entries
                var existingLog = uniqueLogs.First(l => l.Key == logKey);
                var existingHistory = existingLog.ChangeLog.History;

                var seenHistory = new HashSet<string>(
                    existingHistory.Select(historyTupleString)
                );

                foreach (var history in log.ChangeLog.History)
                {
                    var historyTuple = historyTupleString(history);

                    if (!seenHistory.Contains(historyTuple))
                    {
                        seenHistory.Add(historyTuple);
                        existingHistory.Add(history);
                    }
                }
            }
        }

        return uniqueLogs;
    }

    static ActivityChangeItem toChangeItem(Dictionary<string, object?> item) =>
        new()
        {
            Field = item.GetValueOrDefault<string>("field") ?? "",
            FromString = item.GetValueOrDefault<string>("fromString") ?? "",
            ToStringValue = item.GetValueOrDefault<string>("toString") ?? ""
        };

    static List<ActivityChangeItem> toChangeItems(object? rawItems)
    {
        if (rawItems is IEnumerable<object> rawObjects)
            return rawObjects.OfType<Dictionary<string, object?>>().Select(toChangeItem).ToList();
        return [];
    }

    // public because of tests
    public static List<ActivityLog> GetActivityLogsJira(ILogger logger, string logNumber, Dictionary<string, object?> rawData)
    {
        var userActivity = new Dictionary<string, List<ActivityLog>>();
        var sourceData = rawData.GetListOfDictionaryOrEmpty("sourceData");
        var jiraData = sourceData.FirstOrDefault(d => (string?)d.GetValueOrDefault("sourceName") == "Jira")
            ?? new Dictionary<string, object?>();

        var defaultUserName = jiraData.GetValueOrDefault("sourceUserDisplayName") as string ?? "";
        logger.LogInformation($"[{logNumber}] Accessed source user display name: {defaultUserName}");

        foreach (var entry in sourceData)
        {
            if ((string?)entry.GetValueOrDefault("sourceName") != "Jira")
                continue;

            if (entry.GetListOfDictionaryOrEmpty("data") is not List<Dictionary<string, object?>> issues)
            {
                logger.LogWarning($"[{logNumber}] No Jira data found in the entry");
                continue;
            }

            foreach (var issue in issues)
            {
                try
                {
                    var histories = issue.GetDictionaryOrEmpty("changelog").GetListOfDictionaryOrEmpty("histories");

                    // -------------------------
                    // Handle change log histories
                    // -------------------------
                    foreach (var history in histories)
                    {
                        var skipFields = new[] { "timeestimate", "timespent", "WorklogId" };

                        if (!history.ContainsKey("author"))
                        {
                            logger.LogDebug($"[{logNumber}] Skipping issue {issue.GetValueOrDefault("key")} history entry due to missing author");
                            continue;
                        }

                        var author = history["author"] as Dictionary<string, object?> ?? new();
                        var userName = author.GetValueOrDefault("displayName") as string ?? "";

                        if (userName != defaultUserName)
                            continue;

                        if (!userActivity.ContainsKey(userName))
                            userActivity[userName] = new List<ActivityLog>();

                        // Trim strings in items
                        var rawItems = history.GetValueOrDefault("items");
                        if (rawItems is IEnumerable<object> rawObjects)
                        {
                            foreach (var obj in rawObjects)
                            {
                                if (obj is IDictionary<string, object?> itemDict)
                                {
                                    if (itemDict.TryGetValue("field", out object? field) && skipFields.Contains(field?.ToString()))
                                        goto ContinueOuter; // jump to label

                                    if (itemDict.TryGetValue("toString", out var toStr) && toStr is string ts)
                                        itemDict["toString"] = ts[..Math.Min(ts.Length, MAX_STRING_LENGTH)];

                                    if (itemDict.TryGetValue("fromString", out var fromStr) && fromStr is string fs)
                                        itemDict["fromString"] = fs[..Math.Min(fs.Length, MAX_STRING_LENGTH)];
                                }
                            }
                        }

                        var historyItemCreatedDateTimeStr = history.GetValueOrDefault("created");
                        var parsedDate = DateTime.Parse(historyItemCreatedDateTimeStr.ToString());
                        var isoHistoryItemCreatedAt = DateTimeExtensions.ToIsoDateString(parsedDate);
                        var activityLog = createActivityLog(
                            issue.GetValueOrDefault("key"),
                            issue,
                            history: new List<ActivityHistoryEntry>
                            {
                                new()
                                {
                                    CreatedAt = history.GetValueOrDefault("created")?.ToString() ?? "",
                                    Username = userName,
                                    ChangeLog = toChangeItems(history.GetValueOrDefault("items"))
                                }
                            });

                        userActivity[userName].Add(activityLog);

                    ContinueOuter:
                        ; // empty statement required after label
                    }

                    // -------------------------
                    // Handle assignee changes
                    // -------------------------
                    foreach (var history in histories)
                    {
                        var rawItems = history.GetValueOrDefault("items");
                        if (rawItems is IEnumerable<object> rawObjects)
                        {
                            foreach (var itemObj in rawObjects)
                            {
                                if (itemObj is Dictionary<string, object?> item)
                                {
                                    item.Remove("from");
                                    item.Remove("to");

                                    var field = item.GetValueOrDefault("field") as string ?? "";
                                    if (field == "assignee")
                                    {
                                        var fromString = item.GetValueOrDefault("fromString") as string ?? "";
                                        var toString = item.GetValueOrDefault("toString") as string ?? "";

                                        if (fromString == defaultUserName || toString == defaultUserName)
                                        {
                                            var issueKeys = userActivity.GetValueOrDefault(defaultUserName, new())
                                                .Select(log => log.Key)
                                                .ToList();

                                            if (issueKeys.Contains(issue.GetValueOrDefault("key") as string))
                                            {
                                                foreach (var log in userActivity[defaultUserName]
                                                             .Where(l => l.Key == issue.GetValueOrDefault("key") as string))
                                                {
                                                    var existingHistory = log.ChangeLog.History;
                                                    var newChange = toChangeItem(item);
                                                    // The list equality below always evaluates false (reference
                                                    // equality on List<T>) -> always appends. Preserved.
                                                    if (!existingHistory.Any(existing =>
                                                            Equals(existing.CreatedAt, history.GetValueOrDefault("created")?.ToString()) &&
                                                            Equals(existing.ChangeLog, new List<ActivityChangeItem> { newChange })))
                                                    {
                                                        existingHistory.Add(new ActivityHistoryEntry
                                                        {
                                                            CreatedAt = history.GetValueOrDefault("created")?.ToString() ?? "",
                                                            Username = defaultUserName,
                                                            ChangeLog = new List<ActivityChangeItem> { newChange }
                                                        });
                                                    }
                                                }
                                            }
                                            else
                                            {
                                                if (!userActivity.ContainsKey(defaultUserName))
                                                    userActivity[defaultUserName] = new List<ActivityLog>();

                                                userActivity[defaultUserName].Add(createActivityLog(
                                                    issue.GetValueOrDefault("key"),
                                                    issue,
                                                    history: new List<ActivityHistoryEntry>
                                                    {
                                                        new()
                                                        {
                                                            CreatedAt = history.GetValueOrDefault("created")?.ToString() ?? "",
                                                            Username = defaultUserName,
                                                            ChangeLog = new List<ActivityChangeItem> { toChangeItem(item) }
                                                        }
                                                    }));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, $"[{logNumber}] Error processing issue {issue.GetValueOrDefault("key")}");
                    throw;
                }

                // -------------------------
                // Handle comments
                // -------------------------
                var commentsRaw = getNested(issue, "fields", "comment", "comments");
                if (commentsRaw is IEnumerable<object> rawCommentsObj)
                {
                    foreach (var obj in rawCommentsObj)
                    {
                        if (obj is Dictionary<string, object?> comment)
                        {
                            if (!comment.ContainsKey("author"))
                            {
                                logger.LogDebug($"[{logNumber}] Skipping issue {issue.GetValueOrDefault("key")} comment entry due to missing author");
                                continue;
                            }

                            var author = comment["author"] as Dictionary<string, object?> ?? new();
                            var userName = author.GetValueOrDefault("displayName") as string ?? "";
                            if (userName != defaultUserName)
                                continue;

                            var commentContent = comment.GetValueOrDefault("body");
                            string content;
                            if (commentContent is string strContent)
                            {
                                content = strContent;
                            }
                            else if (commentContent is List<Dictionary<string, object?>> listOfDictionaries)        // TODO: We need to check it
                                content = FormatComments(listOfDictionaries);
                            else
                                content = "";

                            var issueKeys = userActivity.GetValueOrDefault(userName, new())
                                .Select(log => log.Key)
                                .ToList();

                            if (issueKeys.Contains(issue.GetValueOrDefault("key") as string))
                            {
                                foreach (var log in userActivity[userName]
                                             .Where(l => l.Key == issue.GetValueOrDefault("key") as string))
                                {
                                    log.Fields.Comment.Add(new ActivityComment
                                    {
                                        CreatedAt = comment.GetValueOrDefault("created")?.ToString() ?? "",
                                        Username = userName,
                                        Content = content[..Math.Min(content.Length, MAX_STRING_LENGTH)]
                                    });
                                }
                            }
                            else
                            {
                                if (!userActivity.ContainsKey(userName))
                                    userActivity[userName] = new List<ActivityLog>();

                                userActivity[userName].Add(createActivityLog(
                                    issue.GetValueOrDefault("key"),
                                    issue,
                                    comments: new List<ActivityComment>
                                    {
                                        new()
                                        {
                                            CreatedAt = comment.GetValueOrDefault("created")?.ToString() ?? "",
                                            Username = userName,
                                            Content = content
                                        }
                                    }));
                            }
                        }
                    }
                }

                // -------------------------
                // Handle worklogs
                // -------------------------
                var worklogsRaw = getNested(issue, "fields", "worklog", "worklogs");
                if (worklogsRaw is IEnumerable<object> worklogsRawObj)
                {
                    foreach (var obj in worklogsRawObj)
                    {
                        if (obj is Dictionary<string, object?> worklog)
                        {
                            if (!worklog.ContainsKey("author"))
                            {
                                logger.LogDebug($"[{logNumber}] Skipping issue {issue.GetValueOrDefault("key")} worklog entry due to missing author");
                                continue;
                            }

                            var author = worklog["author"] as Dictionary<string, object?> ?? new();
                            var userName = author.GetValueOrDefault("displayName") as string ?? "";
                            if (userName != defaultUserName)
                                continue;

                            var issueKeys = userActivity.GetValueOrDefault(userName, new())
                                .Select(log => log.Key)
                                .ToList();

                            if (issueKeys.Contains(issue.GetValueOrDefault("key") as string))
                            {
                                foreach (var log in userActivity[userName]
                                             .Where(l => l.Key == issue.GetValueOrDefault("key") as string))
                                {
                                    log.Fields.Worklog.Add(new ActivityWorklogEntry
                                    {
                                        CreatedAt = worklog.GetValueOrDefault("started")?.ToString() ?? "",
                                        Username = userName,
                                        HoursLogged = worklog.GetValueOrDefault("timeSpent")
                                    });
                                }
                            }
                            else
                            {
                                if (!userActivity.ContainsKey(userName))
                                    userActivity[userName] = new List<ActivityLog>();

                                userActivity[userName].Add(createActivityLog(
                                    issue.GetValueOrDefault("key"),
                                    issue,
                                    worklogs: new List<ActivityWorklogEntry>
                                    {
                                        new()
                                        {
                                            CreatedAt = worklog.GetValueOrDefault("started")?.ToString() ?? "",
                                            Username = userName,
                                            HoursLogged = worklog.GetValueOrDefault("timeSpent")
                                        }
                                    }));
                            }
                        }
                    }
                }

                // -------------------------
                // Handle reporter
                // -------------------------
                var reporter = getNested(issue, "fields", "reporter", "displayName") as string ?? "";
                if (reporter == defaultUserName)
                {
                    var issueKeys = userActivity.GetValueOrDefault(defaultUserName, new())
                        .Select(log => log.Key)
                        .ToList();

                    if (issueKeys.Contains(issue.GetValueOrDefault("key") as string))
                    {
                        foreach (var log in userActivity[defaultUserName]
                                     .Where(l => l.Key == issue.GetValueOrDefault("key") as string))
                        {
                            log.Fields.Reporter = defaultUserName;
                        }
                    }
                    else
                    {
                        if (!userActivity.ContainsKey(defaultUserName))
                            userActivity[defaultUserName] = new List<ActivityLog>();

                        userActivity[defaultUserName].Add(createActivityLog(
                            issue.GetValueOrDefault("key"),
                            issue,
                            reporter: defaultUserName));
                    }
                }

                // -------------------------
                // Handle assignee field
                // -------------------------
                var assignee = getNested(issue, "fields", "assignee", "displayName") as string ?? "";
                if (assignee == defaultUserName)
                {
                    var issueKeys = userActivity.GetValueOrDefault(defaultUserName, new())
                        .Select(log => log.Key)
                        .ToList();

                    if (issueKeys.Contains(issue.GetValueOrDefault("key") as string))
                    {
                        foreach (var log in userActivity[defaultUserName]
                                     .Where(l => l.Key == issue.GetValueOrDefault("key") as string))
                        {
                            log.Fields.Assignee = defaultUserName;
                        }
                    }
                    else
                    {
                        if (!userActivity.ContainsKey(defaultUserName))
                            userActivity[defaultUserName] = new List<ActivityLog>();

                        userActivity[defaultUserName].Add(createActivityLog(
                            issue.GetValueOrDefault("key"),
                            issue,
                            assignee: defaultUserName));
                    }
                }
            }
        }

        var userActivityList = userActivity.Values.FirstOrDefault();
        if (userActivityList == null || !userActivityList.Any())
        {
            logger.LogWarning($"[{logNumber}] No activity logs found");
            return new List<ActivityLog>();
        }

        // Post-processing: remove WorklogId, adjust description, deduplicate
        foreach (var element in userActivityList)
        {
            foreach (var log in element.ChangeLog.History.ToList())
            {
                foreach (var item in log.ChangeLog.ToList())
                {
                    if (item.Field == "WorklogId")
                    {
                        element.ChangeLog.History.Remove(log);
                    }
                    else if (item.Field == "description")
                    {
                        item.FromString = "Old Description";
                        item.ToStringValue = "New Description";
                    }
                }
            }
        }

        var uniqueActivity = userActivityList.Distinct().ToList();
        var deduplicatedActivity = removeDuplicateActivities(uniqueActivity);
        // removeUnnecessaryFields REMOVED - junk keys never enter the typed model

        return deduplicatedActivity;
    }

    // Creates an activity log entry for a Jira issue; shared by all activity handlers
    // to avoid duplicating the construction (Key, changeLog.history, fields.*).
    static ActivityLog createActivityLog(
        object? key,
        IDictionary<string, object?> issue,
        List<ActivityHistoryEntry>? history = null,
        List<ActivityComment>? comments = null,
        List<ActivityWorklogEntry>? worklogs = null,
        string reporter = "",
        string assignee = "")
    {
        return new ActivityLog
        {
            Key = key?.ToString() ?? "",
            ChangeLog = new ActivityChangeLog
            {
                History = history ?? []
            },
            Fields = new ActivityFields
            {
                Summary = getNested(issue, "fields", "summary")?.ToString() ?? "",
                IssueType = getNested(issue, "fields", "issuetype", "name")?.ToString() ?? "",
                Parent = getNested(issue, "fields", "parent", "key"),
                Created = getNested(issue, "fields", "created")?.ToString() ?? "",
                Reporter = reporter,
                Assignee = assignee,
                Status = getNested(issue, "fields", "status", "name")?.ToString() ?? "",
                Comment = comments ?? [],
                Worklog = worklogs ?? []
            }
        };
    }

    static object getExternalReferences(Dictionary<string, object?> rawData)
    {
        if (rawData.TryGetValue("externalReferences", out var externalReferences))
            return externalReferences!;
        else
            return new Dictionary<string, object?>();
    }

    static object getRemainingHours(ILogger logger, string logNumber, Dictionary<string, object?> rawData)
    {
        if (rawData.TryGetValue("remainingHours", out var remainingHours))
        {
            logger.LogDebug($"[{logNumber}] Remaining hours extracted successfully: {remainingHours}");
            return remainingHours!;
        }
        else
        {
            logger.LogWarning($"[{logNumber}] Remaining hours not found in the raw data. Defaulting to 8.");
            return 8;
        }
    }

    static (object? userKhojiId, object? userRole) getUserRole(ILogger logger, string logNumber, Dictionary<string, object?> rawData)
    {
        if (rawData.TryGetValue("userInformation", out var userInfoObj) && userInfoObj is Dictionary<string, object?> userInfo)
        {
            if (!userInfo.TryGetValue("userKhojiId", out var userKhojiId)) userKhojiId = "";


            if (userInfo.TryGetValue("userRole", out var userRole))
                return (userKhojiId, userRole!);
            else
            {
                logger.LogWarning($"[{logNumber}] User role not found in the raw data");
                return (userKhojiId, null);
            }
        }
        else
        {
            logger.LogWarning($"[{logNumber}] User information not found in the raw data");
            return (null, null);
        }
    }


    // public because of tests
    public static string GetWorklogSummary(Dictionary<string, object?> rawData)
    {
        return rawData.TryGetValue("summary", out var summary) && summary is string s
            ? s
            : "No summary provided for this user.";
    }

    // public because of tests
    public static (DateTime, TimeSpan) ExtractDateFromTimestamp(string timestampStr)
    {
        try
        {
            var dto = DateTimeOffset.Parse(timestampStr, CultureInfo.InvariantCulture);

            // Preserve UTC
            var utc = dto.UtcDateTime;
            return (utc.Date, utc.TimeOfDay);
        }
        catch (FormatException e)
        {
            throw new FormatException("Invalid timestamp format", e);
        }
    }

    public static (List<string>, List<ActivityLog>) GetUserActivityOnDate(ILogger logger, string logNumber, string reason,
        List<ActivityLog> logs,
        string user_name, string target_date)
    {
        var keys = new List<string>();

        int days = reason == "worklog generation" ? 3 :
                   reason == "scrum update" ? 2 : 3;

        // Parse target date and create date range (today + last n days)
        var targetDateObj = DateTime.ParseExact(target_date, "yyyy-MM-dd", null);
        var dateRange = Enumerable.Range(0, days)
            .Select(i => targetDateObj.AddDays(-i).ToString("yyyy-MM-dd"))
            .ToList();

        logger.LogInformation($"[{logNumber}] Date range: {dateRange}");

        // Temporary dictionary to hold activities grouped by key
        var activityMap = new Dictionary<string, List<ActivityLog>>();

        foreach (var log in logs)
        {
            foreach (var historyEntry in log.ChangeLog.History)
            {
                if (historyEntry.Username == user_name)
                {
                    var createdAt = historyEntry.CreatedAt;
                    var logDate = ExtractDateFromTimestamp(createdAt).Item1;

                    if (dateRange.Contains(logDate.ToString("yyyy-MM-dd")))
                    {
                        var key = log.Key;

                        if (!string.IsNullOrEmpty(key))
                        {
                            if (!keys.Contains(key))
                                keys.Add(key);

                            if (!activityMap.ContainsKey(key))
                                activityMap[key] = new List<ActivityLog>();

                            // Note: records use value-equality for Contains; use
                            // ReferenceEquals to preserve the old dict reference behavior.
                            if (!activityMap[key].Any(l => System.Object.ReferenceEquals(l, log)))
                                activityMap[key].Add(log);
                        }
                    }
                }
            }
        }

        var activities = activityMap.Values.SelectMany(v => v).ToList();

        logger.LogInformation($"[{logNumber}] Keys: {keys.Count}");
        logger.LogInformation($"[{logNumber}] Activities: {activities.Count}");

        return (keys, activities);
    }

    static ScrumUpdateResponse addCalendarInfoInScrumUpdateResponse(ILogger logger, string logNumber, ScrumUpdateRequest data,
        ScrumUpdateResponse response, string logMessage)
    {
        int userKhojiId = 0;
        if (int.TryParse(data.UserKhojiId?.ToString(), out int kId))
            userKhojiId = kId;

        if (userKhojiId > 0)
        {
            var g = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
            bool calendarConnected = g.CalendarConnected(userKhojiId);

            logger.LogInformation($"[{logNumber}] {logMessage}, userKhojiId: {userKhojiId}, calendarConnected: {calendarConnected}");
            return response with { CalendarConnected = calendarConnected };
        }

        logger.LogInformation($"[{logNumber}] {logMessage}, userKhojiId: {userKhojiId}");
        return response;
    }

    static ScrumUpdateResponse createNoActivityScrumUpdateResponse(ILogger logger, string logNumber, ScrumUpdateRequest data) =>
        addCalendarInfoInScrumUpdateResponse(logger, logNumber, data,
            new ScrumUpdateResponse { Message = "No activity found" }, logMessage: "Returning No Activity Response w/o LLM");

    static async Task<ScrumUpdateResponse> scrumUpdate(IServiceProvider services, IWebHostEnvironment environment,
        ILogger logger, string logNumber,
        ScrumUpdateRequest data, NameMasker masker)
    {
        try
        {
            var yesterday = data.Yesterday;
            var today = data.Today;
            var userName = data.UserName;
            var userRole = data.UserRole?.ToString() ?? "";
            var calendarEvents = data.CalendarEvents;
            var activityLogs = data.ActivityLogs;
            var worklogSummary = data.WorklogSummary;

            logger.LogInformation($"[{logNumber}] Number of tickets: {activityLogs.Count()}");
            var reason = "scrum update";

            logger.LogInformation($"[{logNumber}] Request for {userName} received, yesterday: {yesterday}, today: {today}");

            // Case 1: user not in logs and no calendar events
            if (!UserExists(userName, activityLogs) && !calendarEvents.Any())
            {
                logger.LogWarning($"[{logNumber}] {userName} not found in the logs and calendar events list is empty");
                return createNoActivityScrumUpdateResponse(logger, logNumber, data);
            }

            string promptName = "kia_scrum-update4";

            // Case 2: calendar events present but user not in logs
            if (calendarEvents.Any() && !UserExists(userName, activityLogs))
            {
                logger.LogInformation($"[{logNumber}] Only calendar events are populated. Generating update for that.");
                var messages = await LlmLayer.PrepareScrumUpdateChatMessages(environment, logger, logNumber,
                    promptName,
                    yesterday, today, userName, userRole, calendarEvents);

                Dictionary<string, object> apiResponse = null;
                apiResponse = await LlmLayer.ScrumUpdateChatCompletion(services, environment, logger,
                    logNumber, promptName, messages);

                if (apiResponse is null || apiResponse.Count == 0)
                {
                    logger.LogWarning($"[{logNumber}] No update generated by LLM");
                    return createNoActivityScrumUpdateResponse(logger, logNumber, data);
                }

                if (apiResponse is IDictionary<string, object> dictResp && dictResp.ContainsKey("error"))
                {
                    logger.LogError($"[{logNumber}] Error in API response: {dictResp["error"]}");
                    throw new InvalidOperationException("Error in LLM response");
                }

                if (apiResponse.ContainsKey("message") && apiResponse.ContainsKey("last_day") &&
                    apiResponse.ContainsKey("current_day") && apiResponse.ContainsKey("blockers"))
                {
                    return addCalendarInfoInScrumUpdateResponse(logger, logNumber, data, new ScrumUpdateResponse
                    {
                        Message = apiResponse["message"]?.ToString() ?? "",
                        LastDay = apiResponse["last_day"]?.ToString() ?? "",
                        CurrentDay = apiResponse["current_day"]?.ToString() ?? "",
                        Blockers = apiResponse["blockers"]?.ToString() ?? ""
                    }, logMessage: "LLM response gathered");
                }
                else
                    throw new InvalidOperationException("Error in LLM response");
            }

            // Case 3: user not in logs
            if (!UserExists(userName, activityLogs))
            {
                logger.LogWarning($"[{logNumber}] User {userName} does not exist in the logs");
                return createNoActivityScrumUpdateResponse(logger, logNumber, data);
            }

            var (keys, logActivities) = GetUserActivityOnDate(logger, logNumber, reason, activityLogs, userName, yesterday); // what about today?
            logger.LogInformation($"[{logNumber}] Extracted {keys.Count} keys and {logActivities.Count} activities for user {userName} on yesterday:{yesterday}, today:{today}");

            // Case 4: user exists in logs, but no activity and no calendar events
            if (logActivities.Count == 0 && !calendarEvents.Any())
            {
                logger.LogWarning($"[{logNumber}] No activity logs found for user {userName} on yesterday:{yesterday}, today:{today} and calendar events list is also empty");
                return createNoActivityScrumUpdateResponse(logger, logNumber, data);
            }

            var messagesFull = await LlmLayer.PrepareScrumUpdateChatMessages(environment, logger,
                logNumber, promptName,
                yesterday, today, userName, userRole, calendarEvents, logActivities, worklogSummary);

            Dictionary<string, object> apiResponseFull = null;

            if (LlmIntegration.LlmAvailable == false)
            {
                logger.LogWarning($"[{logNumber}] LLM is not configured properly.");
                return new ScrumUpdateResponse { Message = "AI is not available" };
            }

            try
            {
                apiResponseFull = await LlmLayer.ScrumUpdateChatCompletion(services, environment, logger,
                    logNumber, promptName, messagesFull);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"[{logNumber}] Error using LLM");
            }

            if (apiResponseFull is null || apiResponseFull.Count == 0)
            {
                logger.LogWarning($"[{logNumber}] No logs generated by LLM");
                return new ScrumUpdateResponse { Message = "No activity generated from AI" };
            }

            if (apiResponseFull is IDictionary<string, object> dictResp2 && dictResp2.ContainsKey("error"))
            {
                logger.LogError($"[{logNumber}] Error in API response: {dictResp2["error"]}");
                throw new InvalidOperationException($"Error in LLM response");
            }

            if (apiResponseFull.ContainsKey("message") && apiResponseFull.ContainsKey("last_day") &&
                apiResponseFull.ContainsKey("current_day") && apiResponseFull.ContainsKey("blockers"))
            {
                return addCalendarInfoInScrumUpdateResponse(logger, logNumber, data, new ScrumUpdateResponse
                {
                    Message = apiResponseFull["message"]?.ToString() ?? "",
                    LastDay = apiResponseFull["last_day"]?.ToString() ?? "",
                    CurrentDay = apiResponseFull["current_day"]?.ToString() ?? "",
                    Blockers = apiResponseFull["blockers"]?.ToString() ?? ""
                }, logMessage: "LLM response gathered");
            }
            else
                throw new InvalidOperationException("Error in LLM response");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{logNumber}] An error occurred while processing the data");
            throw;//new InvalidOperationException("An error occurred while processing the data", ex);
        }
    }

    public static ScrumUpdateRequest ConvertToScrumUpdateFormat(ILogger logger, string logNumber, Dictionary<string, object?> rawData, out string userName)
    {
        userName = getUserName(logger, logNumber, rawData);
        var yesterday = getDate(logger, logNumber, rawData, "dateYesterday"); //GetDate(logger, logNumber, rawData);
        var today = getDate(logger, logNumber, rawData, "dateToday");
        var calendarEvents = getCalendarEvents(logger, logNumber, rawData);

        var activityLogs = GetActivityLogsJira(logger, logNumber, rawData);
        var externalReferences = getExternalReferences(rawData);
        var remainingHours = getRemainingHours(logger, logNumber, rawData);
        (var userKhojiId, var userRole) = getUserRole(logger, logNumber, rawData);
        var userSummary = GetWorklogSummary(rawData);

        var targetData = new ScrumUpdateRequest
        {
            RemainingHours = remainingHours,
            UserKhojiId = userKhojiId,
            UserName = userName,
            UserRole = userRole,
            Yesterday = yesterday,
            Today = today,
            CalendarEvents = calendarEvents,
            ActivityLogs = activityLogs,
            ExternalReferences = externalReferences,
            WorklogSummary = userSummary
        };

        logger.LogInformation($"[{logNumber}] Converted raw request to ScrumUpdate request");

        return targetData;
    }

    public static WorklogRequest ConvertToWorklogFormat(ILogger logger, string logNumber, Dictionary<string, object?> rawData, out string userName)
    {
        userName = getUserName(logger, logNumber, rawData);
        var date = GetDate(logger, logNumber, rawData);
        var calendarEvents = getCalendarEvents(logger, logNumber, rawData);

        var calendarTickets = calendarEvents.Any()
            ? GetCalendarTickets(logger, logNumber, rawData)
            : new List<CalendarTicket>();

        var activityLogs = GetActivityLogsJira(logger, logNumber, rawData);
        var externalReferences = getExternalReferences(rawData);
        var remainingHours = getRemainingHours(logger, logNumber, rawData);
        (var userKhojiId, var userRole) = getUserRole(logger, logNumber, rawData);
        var userSummary = GetWorklogSummary(rawData);

        var targetData = new WorklogRequest
        {
            RemainingHours = remainingHours,
            UserName = userName,
            UserRole = userRole,
            Date = date,
            CalendarEvents = calendarEvents,
            CalendarTickets = calendarTickets,
            ActivityLogs = activityLogs,
            ExternalReferences = externalReferences,
            WorklogSummary = userSummary
        };

        logger.LogInformation($"[{logNumber}] Converted raw request to Worklog request");

        return targetData;
    }

    internal static async Task<ScrumUpdateResponse> GenerateScrumUpdate(IServiceProvider services, IWebHostEnvironment environment,
        ILogger logger, string logNumber,
        ScrumUpdateRequest data, NameMasker masker) =>
        await scrumUpdate(services, environment, logger, logNumber, data, masker);

    internal static ScrumUpdateResponse PostProcess(ILogger logger, ScrumUpdateResponse aiResponse, NameMasker masker)
    {
        if (aiResponse == null) return aiResponse;

        foreach (var (masked, original) in masker.GetReplacements())
        {
            if (!string.IsNullOrWhiteSpace(aiResponse.Blockers))
                aiResponse.Blockers = aiResponse.Blockers.Replace(masked, original);

            if (!string.IsNullOrWhiteSpace(aiResponse.CurrentDay))
                aiResponse.CurrentDay = aiResponse.CurrentDay.Replace(masked, original);

            if (!string.IsNullOrWhiteSpace(aiResponse.LastDay))
                aiResponse.LastDay = aiResponse.LastDay.Replace(masked, original);

            if (!string.IsNullOrWhiteSpace(aiResponse.Message))
                aiResponse.Message = aiResponse.Message.Replace(masked, original);
        }

        return aiResponse;
    }
}