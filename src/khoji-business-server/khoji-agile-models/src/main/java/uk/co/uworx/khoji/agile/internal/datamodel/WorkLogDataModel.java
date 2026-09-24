/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

public class WorkLogDataModel {

    private String issueSourceId;
    private String workLogId;
    private String issueId;
    private KhojiIssueType issueType;
    private String started;
    private String startedDate;
    private String updated;
    private String created;
    private String timeSpentSeconds;
    private String timeSpent;
    private AuthorDataModel author;

    public WorkLogDataModel()
    {

    }

    public WorkLogDataModel(String issueSourceId, String worklogId, String issueId, KhojiIssueType issueType, String started, String startedDate, String updated, String created, String timeSpentSeconds, String timeSpent, AuthorDataModel author) {
        this.issueSourceId = issueSourceId;
        this.workLogId = worklogId;
        this.issueId = issueId;
        this.issueType = issueType;
        this.started = started;
        this.startedDate = startedDate;
        this.updated = updated;
        this.created = created;
        this.timeSpentSeconds = timeSpentSeconds;
        this.timeSpent = timeSpent;
        this.author = author;
    }

    public String getStartedDate()
    {
        return startedDate;
    }

    public void setStartedDate(String startedDate)
    {
        this.startedDate = startedDate;
    }

    public String getIssueId() {
        return issueId;
    }

    public void setIssueId(String issueId) {
        this.issueId = issueId;
    }

    public KhojiIssueType getIssueType() {
        return issueType;
    }

    public void setIssueType(KhojiIssueType issueType) {
        this.issueType = issueType;
    }

    public String getStarted() {
        return started;
    }

    public void setStarted(String started) {
        this.started = started;
    }

    public String getUpdated() {
        return updated;
    }

    public void setUpdated(String updated) {
        this.updated = updated;
    }

    public String getCreated() {
        return created;
    }

    public void setCreated(String created) {
        this.created = created;
    }

    public String getTimeSpentSeconds() {
        return timeSpentSeconds;
    }

    public void setTimeSpentSeconds(String timeSpentSeconds) {
        this.timeSpentSeconds = timeSpentSeconds;
    }

    public String getTimeSpent() {
        return timeSpent;
    }

    public void setTimeSpent(String timeSpent) {
        this.timeSpent = timeSpent;
    }

    public AuthorDataModel getAuthor() {
        return author;
    }

    public void setAuthor(AuthorDataModel author) {
        this.author = author;
    }

    public String getIssueSourceId()
    {
        return issueSourceId;
    }

    public void setIssueSourceId(String issueSourceId)
    {
        this.issueSourceId = issueSourceId;
    }

    public String getWorkLogId()
    {
        return workLogId;
    }

    public void setWorkLogId(String workLogId)
    {
        this.workLogId = workLogId;
    }

    @Override
    public String toString() {
        return "WorkLogDataModel{" +
                "issueSourceId='" + issueSourceId + '\'' +
                ", workLogId='" + workLogId + '\'' +
                ", issueId='" + issueId + '\'' +
                ", issueType='" + issueType + '\'' +
                ", started='" + started + '\'' +
                ", startedDate='" + startedDate + '\'' +
                ", updated='" + updated + '\'' +
                ", created='" + created + '\'' +
                ", timeSpentSeconds='" + timeSpentSeconds + '\'' +
                ", timeSpent='" + timeSpent + '\'' +
                ", author=" + author +
                '}';
    }
}
