/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Getter
public class JiraConfig {
    @Value("${jira.searchUrl:/rest/api/2/search/jql}")
    public String jiraSearchUrl;

    @Value("${jira.searchUrl:/rest/api/3/issue/picker}")
    public String jiraIssuePicker;

    @Value("${jira.users.endpoint:/rest/api/3/users/search?startAt=%d}")
    public String usersEndpoint;

    @Value("${jira.worklogUrl:/rest/api/2/issue/%s/worklog?startedAfter=%s}")
    public String JiraWorklogUrl;

    @Value("${jira.profileUrl:/rest/api/2/user?accountId=%s}")
    public String jiraProfileUrl;

    @Value("${jira.issues.maxresult:100}")
    public int issuesMaxResult;

    @Value("${jira.spec.issue.filepath:/jira/cloud/specs/issueSpec.json}")
    public String ISSUE_SPEC;

    @Value("${jira.spec.issue.versioned.filepath:/jira/cloud/specs/issueVersionedRepresentationSpec.json}")
    public String VERSIONED_ISSUE_SPEC;

    @Value("${jira.spec.worklog.filepath:/jira/cloud/specs/worklogSpec.json}")
    public String WORKLOG_SPEC;

    @Value("${jira.spec.worklog.single.filepath:/jira/cloud/specs/singleWorkLogSpec.json}")
    public String SINGLE_WORKLOG_SPEC;

    @Value("${jira.extended.fields:issuetype,parent,timespent,timeoriginalestimate,timeestimate,resolution,aggregatetimeestimate,aggregatetimeoriginalestimate,aggregatetimespent,created,description,priority,resolutiondate,status,subtasks,summary,timeoriginalestimate,project,fixVersions,comment,updated")
    public String jiraFieldsToExpandString;

    @Value("${source.users.fetchInactive:false}")
    public boolean fetchInactiveUsersFromSource;

    @Value("${data.reporting.api.sync.enabled:false}")
    public boolean dataReportingApiSyncEnabled;

    @Value("${data.reporting.api.sync.cronExpression:0 0 0 * * ?}")
    public String dataReportingApiSyncCron;

    @Value("${jira.spec.user.filepath:/jira/cloud/specs/userSpec.json}")
    public String USER_SPEC;

    @Value("${jira.status.inferred:true}")
    public boolean inferStatus;

    @Value("/rest/api/2/issue/%s/worklog")
    public String JiraPostWorklogUrl;

    @Value("/rest/api/3/issue/%s")
    public String JiraValidateIssueId;
}
