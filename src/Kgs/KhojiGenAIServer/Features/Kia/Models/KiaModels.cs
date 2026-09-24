// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using System.Text.Json.Serialization;

namespace KhojiGenAIServer.Features.Kia.Models;

// === ActivityLog family ===
// Keys match dict wire format exactly via JsonPropertyName

public record ActivityLog
{
    [JsonPropertyName("key")] public string Key { get; set; } = "";
    [JsonPropertyName("changeLog")] public ActivityChangeLog ChangeLog { get; set; } = new();
    [JsonPropertyName("fields")] public ActivityFields Fields { get; set; } = new();
}

public record ActivityChangeLog
{
    [JsonPropertyName("history")] public List<ActivityHistoryEntry> History { get; set; } = [];
}

public record ActivityHistoryEntry
{
    [JsonPropertyName("created-at")] public string CreatedAt { get; set; } = "";
    [JsonPropertyName("username")] public string Username { get; set; } = "";
    [JsonPropertyName("changeLog")] public List<ActivityChangeItem> ChangeLog { get; set; } = [];
}

// CRITICAL: CANNOT name property "ToString" - conflicts with the syntesized
// ToString() method on records (CS0102). Use "ToStringValue" instead; the
// [property: JsonPropertyName("toString")] keeps the wire key as "toString".
public record ActivityChangeItem
{
    [JsonPropertyName("field")] public string Field { get; set; } = "";
    [JsonPropertyName("fromString")] public string FromString { get; set; } = "";
    [property: JsonPropertyName("toString")] public string ToStringValue { get; set; } = "";
}

public record ActivityFields
{
    [JsonPropertyName("summary")] public string Summary { get; set; } = "";
    [JsonPropertyName("issuetype")] public string IssueType { get; set; } = "";
    [JsonPropertyName("parent")] public object? Parent { get; set; }
    [JsonPropertyName("created")] public string Created { get; set; } = "";
    [JsonPropertyName("reporter")] public string Reporter { get; set; } = "";
    [JsonPropertyName("assignee")] public string Assignee { get; set; } = "";
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("comment")] public List<ActivityComment> Comment { get; set; } = [];
    [JsonPropertyName("worklog")] public List<ActivityWorklogEntry> Worklog { get; set; } = [];
}

public record ActivityComment
{
    [JsonPropertyName("created-at")] public string CreatedAt { get; set; } = "";
    [JsonPropertyName("username")] public string Username { get; set; } = "";
    [JsonPropertyName("content")] public string Content { get; set; } = "";
}

public record ActivityWorklogEntry
{
    [JsonPropertyName("created-at")] public string CreatedAt { get; set; } = "";
    [JsonPropertyName("username")] public string Username { get; set; } = "";
    [JsonPropertyName("hoursLogged")] public object? HoursLogged { get; set; }
}

// === Calendar ===

public record CalendarEvent
{
    [JsonPropertyName("subject")] public string? Subject { get; set; }
    [JsonPropertyName("start")] public string? Start { get; set; }
    [JsonPropertyName("end")] public string? End { get; set; }
    [JsonPropertyName("isCancelled")] public bool IsCancelled { get; set; }
}

public record CalendarTicket
{
    [JsonPropertyName("key")] public string Key { get; set; } = "";
    [JsonPropertyName("summary")] public string Summary { get; set; } = "";
    [JsonPropertyName("issuetype")] public string IssueType { get; set; } = "";
    [JsonPropertyName("parent")] public object? Parent { get; set; }
}

// === Pipeline requests ===

public record ScrumUpdateRequest
{
    [JsonPropertyName("remaining_hours")] public object? RemainingHours { get; set; }
    [JsonPropertyName("userKhojiId")] public object? UserKhojiId { get; set; }
    [JsonPropertyName("user_name")] public string UserName { get; set; } = "";
    [JsonPropertyName("user_role")] public object? UserRole { get; set; }
    [JsonPropertyName("yesterday")] public string Yesterday { get; set; } = "";
    [JsonPropertyName("today")] public string Today { get; set; } = "";
    [JsonPropertyName("calendarEvents")] public List<CalendarEvent> CalendarEvents { get; set; } = [];
    [JsonPropertyName("activityLogs")] public List<ActivityLog> ActivityLogs { get; set; } = [];
    [JsonPropertyName("externalReferences")] public object? ExternalReferences { get; set; }
    [JsonPropertyName("worklogSummary")] public string WorklogSummary { get; set; } = "";
}

public record WorklogRequest
{
    [JsonPropertyName("remaining_hours")] public object? RemainingHours { get; set; }
    [JsonPropertyName("user_name")] public string UserName { get; set; } = "";
    [JsonPropertyName("user_role")] public object? UserRole { get; set; }
    [JsonPropertyName("date")] public string Date { get; set; } = "";
    [JsonPropertyName("calendarEvents")] public List<CalendarEvent> CalendarEvents { get; set; } = [];
    [JsonPropertyName("calendarTickets")] public List<CalendarTicket> CalendarTickets { get; set; } = [];
    [JsonPropertyName("activityLogs")] public List<ActivityLog> ActivityLogs { get; set; } = [];
    [JsonPropertyName("externalReferences")] public object? ExternalReferences { get; set; }
    [JsonPropertyName("worklogSummary")] public string WorklogSummary { get; set; } = "";
}

// === WeeklyRetro ===

public record WeeklyRetroRequest
{
    [JsonPropertyName("user_role")] public string UserRole { get; set; } = "";
    [JsonPropertyName("formatted_issues")] public List<FormattedIssue> FormattedIssues { get; set; } = [];
}

public record FormattedIssue
{
    [JsonPropertyName("key")] public string Key { get; set; } = "";
    [JsonPropertyName("summary")] public string Summary { get; set; } = "";
    [JsonPropertyName("worklogs")] public string Worklogs { get; set; } = "";
}

// === Categorizer ===

public record IssueTypeEntry
{
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("description")] public string Description { get; set; } = "";
    [JsonPropertyName("subtask")] public bool Subtask { get; set; }
    [JsonPropertyName("heirarchyLevel")] public int HierarchyLevel { get; set; }
}

public record IssueTypeRef
{
    [JsonPropertyName("issueTypeId")] public string IssueTypeId { get; set; } = "";
    [JsonPropertyName("issueTypeName")] public string IssueTypeName { get; set; } = "";
}

public record IssueCategory
{
    [JsonPropertyName("title")] public string Title { get; set; } = "";
    [JsonPropertyName("issuetypes")] public List<IssueTypeRef> IssueTypes { get; set; } = [];
}

public record CategorizationResult
{
    [JsonPropertyName("message")] public string Message { get; set; } = "";
    [JsonPropertyName("data")] public List<IssueCategory> Data { get; set; } = [];
}