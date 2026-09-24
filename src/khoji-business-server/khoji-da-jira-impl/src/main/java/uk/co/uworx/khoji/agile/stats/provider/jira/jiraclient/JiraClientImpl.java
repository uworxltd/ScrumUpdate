/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.stats.provider.jira.jiraclient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.ObjectUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderJiraImpl;
import uk.co.uworx.khoji.agile.config.JiraConfig;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.Issue;
import uk.co.uworx.khoji.agile.internal.model.IssueWorklog;
import uk.co.uworx.khoji.agile.internal.model.SourceSystem;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.internal.model.TeamBoard;
import uk.co.uworx.khoji.agile.internal.model.WorkLog;
import uk.co.uworx.khoji.agile.internal.model.jira.raw.IssuePart;
import uk.co.uworx.khoji.agile.internal.model.request.DataClientRequest;
import uk.co.uworx.khoji.agile.internal.model.request.DataClientRequestType;
import uk.co.uworx.khoji.agile.internal.model.request.PostWorkLogDataClientRequest;
import uk.co.uworx.khoji.agile.internal.model.request.TeamBoardDataClientRequestByWorkLog;
import uk.co.uworx.khoji.agile.internal.model.request.WorkLogDataClientRequest;
import uk.co.uworx.khoji.agile.internal.service.CustomFieldsService;
import uk.co.uworx.khoji.agile.legacy.models.SourceUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccessCredentials;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessCredentialsDataService;
import uk.co.uworx.khoji.agile.stats.provider.jira.Constants;
import uk.co.uworx.khoji.agile.stats.provider.jira.exception.SourceSystemServiceException;
import uk.co.uworx.khoji.agile.stats.provider.jira.helper.IJiraResponseTransformer;
import uk.co.uworx.khoji.agile.stats.provider.jira.helper.JiraClientRestHelper;
import uk.co.uworx.khoji.agile.stats.provider.jira.helper.JqlHelper;
import uk.co.uworx.khoji.data.api.IDataClient;

import java.net.URI;
import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Component
@Log4j2
public abstract class JiraClientImpl implements IDataClient
{
    @Autowired
    protected RestTemplate restTemplate;
    protected CustomFieldsService customFieldsService;
    protected IJiraResponseTransformer jiraResponseTransformer;
    @Autowired
    protected JqlHelper jqlHelper;
    @Autowired
    UserAccessCredentialsDataService userAccessCredentialsDataService;
    @Autowired
    InstanceDataService instanceDataService;
    @Autowired
    JiraClientRestHelper jiraClientRestHelper;
    @Autowired
    private JiraConfig jiraConfig;
    @Value("${jira.data.generic.endpoint:https://api.atlassian.com/ex/jira/}")
    private String JIRA_DATA_ENDPOINT;
    @Value("${jira.issueSpec.template.filepath:/jira/cloud/templates/issueSpec.liquid}")
    private String SPEC_TEMPLATE_FILE_PATH;

    public JiraClientImpl()
    {
        this.jiraResponseTransformer = (IJiraResponseTransformer) BootApplicationContextProviderJiraImpl.getContext().getBean("JoltHelperServerImpl");
    }

    private SourceSystem getUpdatedSourceInstance(Principal principal)
    {
        Optional<UserAccessCredentials> userTokenInfo = userAccessCredentialsDataService.findByEmail(
            principal.getName()
        );


        String tenantId = instanceDataService
            .findById(null, true)
            .orElseThrow(() -> new ServiceException(ServiceError.G0100))
            .getTenantId();

        return userTokenInfo.map(userAccessCredentials -> new SourceSystem(
            JIRA_DATA_ENDPOINT + tenantId,
            null,
            userAccessCredentials.getAccessToken()
        )).orElse(null);
    }

    HttpHeaders getSavedHeaders(Principal principal)
    {
        SourceSystem sourceSystem = getUpdatedSourceInstance(principal);

        HttpHeaders headers;

        headers = this.getHeaders(sourceSystem.getSourceUser(), sourceSystem.getApiToken());

        return headers;
    }

    public List<Issue> searchIssuesUsingPost(DataClientRequest request, Principal principal)
    {
        return searchIssuesUsingPost(
            new TypeReference<List<Issue>>()
            {
            },
            request,
            appendCustomFieldsWithCommaDelimeter(getJiraConfig().jiraFieldsToExpandString),
            true,
            principal
        );
    }

    /**
     * This method decides on run time from which tenant to fetch data
     *
     * @param workLogDataClientRequest contains the information of tenants
     *                                 members and date range
     * @return the list of issues with work log information
     */
    public List<Issue> getWorkLogData(WorkLogDataClientRequest workLogDataClientRequest, Principal principal)
    {
        return getWorklogIssuesFromJira(workLogDataClientRequest, principal);
    }

    public HttpStatusCode isValidJiraIssueId(String issueId, Principal principal)
    {
        try
        {
            String url = getValidateIssueIdUrl(issueId, principal);
            ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<String>(null,
                getSavedHeaders(principal)), new ParameterizedTypeReference<>()
            {
            });
            return response.getStatusCode();
        }
        catch (HttpClientErrorException exception)
        {
            if (exception instanceof HttpClientErrorException.NotFound)
            {
                return HttpStatus.NOT_FOUND;
            }
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
        catch (Exception e)
        {
            log.error("Error while checking validity of issue: {} {}", issueId, e.getMessage());
            return HttpStatus.NOT_FOUND;
        }
    }

    public ResponseEntity<WorkLog> logOrEditWorkLogOnJira(
        String issueIdOrKey,
        String commentText,
        LocalDateTime started,
        double timeSpentSeconds,
        String timeZone,
        Principal principal,
        String workLogId
    )
    {
        try
        {
            ResponseEntity<Object> response;

            String url = getJiraWorklogUrl(issueIdOrKey, principal, workLogId);
            String payload = PostWorkLogDataClientRequest.createWorklogPayload(
                commentText,
                started,
                timeSpentSeconds,
                timeZone
            );

            response = restTemplate.exchange(
                url,
                StringUtils.hasLength(workLogId) ? HttpMethod.PUT : HttpMethod.POST,
                new HttpEntity<>(payload, getSavedHeaders(principal)),
                new ParameterizedTypeReference<>()
                {
                }
            );
            // TODO: what to do if mapping fails for some reason, although it shouldn't cause any issues
            WorkLog workLog = jiraResponseTransformer.transformObject(
                response.getBody(),
                jiraConfig.SINGLE_WORKLOG_SPEC,
                WorkLog.class
            );
            return new ResponseEntity<>(
                workLog,
                response.getStatusCode()
            );
        }
        catch (HttpClientErrorException e)
        {
            if (e.getStatusCode().equals(HttpStatus.FORBIDDEN))
            {
                throw new SourceSystemServiceException(e, SourceSystemServiceException.SourceSystem.JIRA);
            }

            log.error("Error while posting worklog for :{} {}", issueIdOrKey, e.getMessage());
            return new ResponseEntity<>(e.getStatusCode());
        }
        catch (Exception e)
        {
            log.error("Error while posting worklog for :{} {}", issueIdOrKey, e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @Override
    public HttpStatusCode deleteWorkLogAgainstId(
        Principal principal,
        String workLogId,
        String issueId
    )
    {
        try
        {
            ResponseEntity<Object> response;

            response = restTemplate.exchange(
                getJiraWorklogUrl(issueId, principal, workLogId),
                HttpMethod.DELETE,
                new HttpEntity<>(getSavedHeaders(principal)),
                new ParameterizedTypeReference<>()
                {
                }
            );
            return response.getStatusCode();
        }
        catch (HttpClientErrorException e)
        {
            if (e.getStatusCode().equals(HttpStatus.FORBIDDEN))
            {
                throw new SourceSystemServiceException(e, SourceSystemServiceException.SourceSystem.JIRA);
            }

            log.error("Error while deleting worklog for :{} {} from Jira", workLogId, issueId, e);
            return e.getStatusCode();
        }
        catch (Exception e)
        {
            log.error("Error while deleting worklog for :{} {}", workLogId, issueId, e);
            return HttpStatus.NOT_FOUND;
        }
    }

    public <T> List<T> getWorkLogIssuesWithLimitedInformation(
        TypeReference typeReference,
        WorkLogDataClientRequest workLogDataClientRequest,
        Principal principal
    )
    {

        String searchJQLJson = jqlHelper.getJqlForIndividualsIssues(
            workLogDataClientRequest.getMembers(),
            workLogDataClientRequest.getDateFrom(),
            workLogDataClientRequest.getDateTo()
        );

        log.debug("Post Query: {}", searchJQLJson);

        try
        {
            List<Object> tempIssues = jiraClientRestHelper.searchIssueUsingPost(
                buildJiraUrl(getJiraConfig().jiraSearchUrl, principal),
                searchJQLJson,
                List.of("issuetype"),
                Collections.emptyList(),
                getSavedHeaders(principal)
            );

            return new ArrayList<>(
                (ArrayList) jiraResponseTransformer.transformList(
                    Map.of("issues", tempIssues), // this is required for mapping
                    jiraConfig.ISSUE_SPEC,
                    SPEC_TEMPLATE_FILE_PATH,
                    typeReference
                )
            );
        }
        catch (SourceSystemServiceException exception)
        {
            throw exception;// exception already picked in getFromCache(), so just return this exception
        }
        catch (Exception exception)
        {
            log.error("Exception occurred while firing jql: {}", searchJQLJson, exception);
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
    }

    /**
     * This method fetch data from Jira
     *
     * @param workLogDataClientRequest
     * @param principal
     * @return list of issues with work log
     */
    private List<Issue> getWorklogIssuesFromJira(WorkLogDataClientRequest workLogDataClientRequest, Principal principal)
    {
        List<Issue> issues = getWorkLogData(
            new TypeReference<List<Issue>>()
            {
            },
            workLogDataClientRequest,
            principal
        );

        for (Issue issue : issues)
        {
            if (workLogNeedsToBeFetched(issue))
            {
                List<IssueWorklog> issueWorklogs = getWorkLogForGivenKeys(
                    Collections.singletonList(issue.getId()),
                    workLogDataClientRequest,
                    principal
                );
                issue.setWorklog(!CollectionUtils.isEmpty(issueWorklogs) && issueWorklogs.size() == 1 ? issueWorklogs.get(0) : null);
            }
        }

        return issues;
    }

    public List<IssueWorklog> getWorkLogForGivenKeys(List<String> keys, WorkLogDataClientRequest workLogDataClientRequest, Principal principal)
    {
        return getWorkLogForGivenKeys(new TypeReference<IssueWorklog>()
        {
        }, keys, null, workLogDataClientRequest, principal);
    }

    public <T> List<T> getWorkLogForGivenKeys(
        TypeReference typeReference,
        List<String> keys,
        String worklogTenant,
        WorkLogDataClientRequest workLogDataClientRequest,
        Principal principal
    )
    {
        List<T> issueWorkLogs = new ArrayList<>();
        try
        {
            for (String key : keys)
            {
                log.debug("Call to additional work log query for key: {}", key);
                String workLogURL = workLogDataClientRequest != null ?
                    getWorkLogUrlWithStartedAtParam(workLogDataClientRequest, key, principal) :
                    getWorkLogUrlWithoutAnyParam(key);

                ResponseEntity<Object> response = restTemplate.exchange(
                    workLogURL,
                    HttpMethod.GET,
                    new HttpEntity<>(getSavedHeaders(principal)),
                    new ParameterizedTypeReference<>()
                    {
                    }
                );
                Object workLog = jiraResponseTransformer.transformObj(response.getBody(), jiraConfig.WORKLOG_SPEC, typeReference);
                if (workLog == null)
                {
                    return new ArrayList<>();
                }
                else if (workLog instanceof List)
                {
                    issueWorkLogs.addAll((Collection<? extends T>) workLog);
                    log.debug("Fetched work log entries: {}", ((List<?>) workLog).size());
                }
                else
                {
                    if (workLog instanceof IssueWorklog)
                    {
                        log.debug("Fetched work log entries: {}", ((IssueWorklog) workLog).getWorklogs().size());
                    }
                    issueWorkLogs.add((T) workLog);
                }

            }
            return issueWorkLogs;

        }
        catch (Exception exception)
        {
            log.error("Exception occurred while getting WorkLog: {}", String.join(", ", keys), exception);
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }

    }

    private <T> T getWorklogForASingleKey(
        String key,
        ParameterizedTypeReference<T> parameterizedTypeReference,
        String startedAt,
        Principal principal
    )
    {
        WorkLogDataClientRequest workLogDataClientRequest = new WorkLogDataClientRequest();
        workLogDataClientRequest.setDateFrom(startedAt);

        try
        {
            log.debug("Call to additional work log query for key: {}", key);
            String workLogURL = getWorkLogUrlWithStartedAtParam(workLogDataClientRequest, key, principal);

            ResponseEntity<T> response = restTemplate.exchange(
                workLogURL,
                HttpMethod.GET,
                new HttpEntity<>(getSavedHeaders(principal)),
                parameterizedTypeReference
            );

            return response.getBody();
        }
        catch (Exception exception)
        {
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
    }

    private String getWorkLogUrlWithoutAnyParam(String key)
    {
        return buildJiraUrl(
            String.format(
                getJiraConfig().JiraWorklogUrl.substring(0, getJiraConfig().JiraWorklogUrl.indexOf("?")),
                key
            ), null
        );
    }

    private String getWorkLogUrlWithStartedAtParam(WorkLogDataClientRequest workLogDataClientRequest, String key, Principal principal)
    {
        return buildJiraUrl(
            String.format(
                getJiraConfig().JiraWorklogUrl,
                key,
                LocalDate.parse(workLogDataClientRequest.getDateFrom())
                    .minusDays(1)
                    .atStartOfDay(ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli()
            ), principal
        );
    }

    private String getJiraWorklogUrl(String issueId, Principal principal, String workLogId)
    {
        String url = String.format(
            getJiraConfig().JiraPostWorklogUrl,
            issueId
        );

        if (StringUtils.hasLength(workLogId))
        {
            url = url + "/" + workLogId;
        }

        return buildJiraUrl(
            url,
            principal
        );
    }

    private String getValidateIssueIdUrl(String issueId, Principal principal)
    {
        return buildJiraUrl(
            String.format(
                getJiraConfig().JiraValidateIssueId,
                issueId
            ), principal
        );
    }

    public <T> List<T> searchIssuesUsingPost(
        TypeReference typeReference,
        DataClientRequest request,
        String requiredFields,
        boolean expandChangelog,
        Principal principal
    )
    {
        log.debug("Post Query at jira client: {}", request.getJQL());
        try
        {
            if (!StringUtils.hasLength(requiredFields))
            {
                requiredFields = appendCustomFieldsWithCommaDelimeter(getJiraConfig().jiraFieldsToExpandString);
            }

            List<Object> issues = jiraClientRestHelper.searchIssueUsingPost(
                buildJiraUrl(getJiraConfig().jiraSearchUrl, principal),
                request.getJQL(),
                Arrays.stream(requiredFields.split(",")).toList(),
                expandChangelog ? List.of("changelog") : Collections.emptyList(),
                getSavedHeaders(principal)
            );

            List<T> finalIssues = new ArrayList<>(
                (ArrayList) jiraResponseTransformer.transformList(
                    Map.of("issues", issues),// this is required for mapping
                    jiraConfig.ISSUE_SPEC,
                    SPEC_TEMPLATE_FILE_PATH,
                    typeReference
                )
            );

            if (CollectionUtils.isEmpty(finalIssues))
            {
                log.info("Empty Response against the request for getting issues for the given jql: {}", request.getJQL());
            }

            return populateTeamBoardMappedList(request, finalIssues);
        }
        catch (Exception exception)
        {
            log.error("Exception occured while firing jql: {}", request.getJQL(), exception);
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
    }

    protected <T> List<T> populateTeamBoardMappedList(DataClientRequest request, List<T> issues)
    {
        if (issues == null)
        {
            return issues;
        }

        List<TeamBoard> teamBoards = new ArrayList<>();

        if (request.getRequestType() != null)
        {
            if (request.getRequestType().equals((DataClientRequestType.TEAM_BOARD_BY_WORK_LOG)))
            {
                teamBoards.addAll(((TeamBoardDataClientRequestByWorkLog) request.getRequest()).getTeamBoards());
            }
        }

        issues.forEach(x -> {
            Issue issue = (Issue) x;

            teamBoards.forEach(teamBoard -> {
                if (teamBoard.getTeamBoardIdentifier().equals((issue).getTeamBoard()))
                {
                    issue.setTeamBoardMappedList(Collections.singletonList(teamBoard));
                }
            });
        });
        return issues;
    }

    @Override
    public List<SourceUser> fetchUsers(SourceSystem sourceSystem, Principal principal, boolean filterInactiveUsers)
    {
        sourceSystem = getUpdatedSourceInstance(principal);
        List<SourceUser> jiraUsers = new ArrayList<>();
        boolean hasMoreUsers = true;
        int startAt = 0;
        try
        {
            log.debug("Fetching users from JIRA against the given source user: {}", sourceSystem.getSourceUser());
            while (hasMoreUsers)
            {
                String apiURL = String.format(sourceSystem.getSourceUrl() + getJiraConfig().usersEndpoint, startAt);
                try
                {
                    ResponseEntity<Object> response = restTemplate.exchange(apiURL, HttpMethod.GET, new HttpEntity<String>(null,
                            getHeaders(sourceSystem.getSourceUser(),
                                sourceSystem.getApiToken())),
                        Object.class);

                    if (response.getBody() != null)
                    {
                        JSONArray responseJson = (JSONArray) new JSONObject(response).get("body");
                        if (responseJson.length() > 0)
                        {
                            startAt += Constants.JIRA_USERS_MAX_RESULTS;
                            List<SourceUser> usersFetched = (ArrayList) jiraResponseTransformer.transformList(response.getBody(), jiraConfig.USER_SPEC, new TypeReference<List<SourceUser>>()
                            {
                            });
                            jiraUsers.addAll(usersFetched);
                        }
                        else
                        {
                            hasMoreUsers = false;
                        }
                    }

                }
                catch (HttpClientErrorException clientErrorException)
                {
                    log.error("Exception thrown for fetching users by the jira client: ", clientErrorException);
                    throw clientErrorException;
                }
            }
            return filterInactiveUsers ? filterUsers(jiraUsers) : jiraUsers;
        }
        catch (HttpClientErrorException httpClientErrorException)
        {
            throw new SourceSystemServiceException(httpClientErrorException, SourceSystemServiceException.SourceSystem.JIRA);
        }
        catch (Exception exception)
        {
            log.error("Exception thrown for fetching users by the jira client: ", exception);
            throw new ServiceException(ServiceError.PS0109, new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA));
        }
    }

    public <T> List<T> getWorkLogData(
        TypeReference typeReference,
        WorkLogDataClientRequest workLogDataClientRequest,
        Principal principal
    )
    {
        String searchJQLJson = jqlHelper.getJqlForIndividualsIssues(
            workLogDataClientRequest.getMembers(),
            workLogDataClientRequest.getDateFrom(),
            workLogDataClientRequest.getDateTo()
        );

        log.debug("Post Query: {}", searchJQLJson);
        try
        {
            List<Object> tempIssues = jiraClientRestHelper.searchIssueUsingPost(
                buildJiraUrl(getJiraConfig().jiraSearchUrl, principal),
                searchJQLJson,
                List.of(
                    "issuetype",
                    "parent",
                    "worklog",
                    "summary"
                ),
                Collections.emptyList(),
                getSavedHeaders(principal)
            );

            return new ArrayList<>(
                (ArrayList) jiraResponseTransformer.transformList(
                    Map.of("issues", tempIssues),// this is required for mapping
                    jiraConfig.ISSUE_SPEC,
                    SPEC_TEMPLATE_FILE_PATH,
                    typeReference
                )
            );
        }
        catch (HttpClientErrorException exception)
        {
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
        catch (SourceSystemServiceException exception)
        {
            throw exception; // exception already picked in getFromCache(), so just return this exception
        }
        catch (Exception exception)
        {
            log.error("Exception occured while firing jql: {}", searchJQLJson, exception);
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
    }

    private boolean workLogNeedsToBeFetched(Issue issue)
    {
        return issue.getWorklog() != null && issue.getWorklog().getTotal().doubleValue() > issue.getWorklog().getMaxResults().doubleValue();
    }

    private List<SourceUser> filterUsers(final List<SourceUser> jiraUsers)
    {
        List<SourceUser> filteredUsers = new ArrayList<>();
        if (CollectionUtils.isNotEmpty(jiraUsers) && !getJiraConfig().fetchInactiveUsersFromSource)
        {
            filteredUsers = jiraUsers.stream().filter(SourceUser::isActiveInSource).collect(Collectors.toList());
        }
        else
        {
            filteredUsers = jiraUsers;
        }

        return filteredUsers;
    }

    private HttpHeaders getHeaders(String user, String token)
    {
        HttpHeaders headers = new HttpHeaders();
        String authHeader = "Bearer " + token;
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("Authorization", authHeader);

        return headers;
    }

    private String appendCustomFieldsWithCommaDelimeter(String jiraFieldsToExpand)
    {
        String jiraFieldsString = "";
        if (StringUtils.hasLength(jiraFieldsToExpand))
        {
            List<String> customFieldList = customFieldsService
                .getAllCustomFields()
                .stream()
                .map(cf -> "customfield_" + cf.getCfValue())
                .toList();

            return jiraFieldsToExpand + "," + String.join(",", customFieldList);
        }
        return jiraFieldsString;
    }

    private String buildJiraUrl(String endpoint, Principal principal)
    {
        SourceSystem sourceSystem = getUpdatedSourceInstance(principal);

        return sourceSystem.getSourceUrl() + endpoint;
    }

    protected JiraConfig getJiraConfig()
    {
        return BootApplicationContextProviderAgileConfig.getContext().getBean(JiraConfig.class);
    }

    @Override
    public List<KhojiIssueType> fetchIssueTypes(Principal principal)
    {
        try
        {
            log.debug("Fetching issue types from Jira");
            SourceSystem sourceSystem = getUpdatedSourceInstance(principal);
            String apiURL = sourceSystem.getSourceUrl() + "/rest/api/3/issuetype";
            ResponseEntity<Object> response = restTemplate.exchange(apiURL, HttpMethod.GET,
                new HttpEntity<String>(null,
                    getSavedHeaders(principal)),
                Object.class);
            if (response.hasBody())
            {
                return (ArrayList) jiraResponseTransformer.transformList(response.getBody(), "/jira/cloud/specs/issueTypeSpec.json", new TypeReference<List<KhojiIssueType>>()
                {
                });
            }
            else
            {
                log.error("Source system returned empty response for fetching issue types");
            }
        }
        catch (HttpClientErrorException exception)
        {
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
        catch (Exception clientErrorException)
        {
            log.error("Exception thrown for fetching issue types by the jira client: ", clientErrorException);
        }
        return null;
    }

    @Override
    public Optional<String> getUserTimeZone(Principal principal, String accountId, UserAccessCredentials userAccessCredentials, String tenantId)
    {
        try
        {
            ResponseEntity<String> profileResponse = restTemplate.exchange(
                String.format(JIRA_DATA_ENDPOINT + tenantId + jiraConfig.jiraProfileUrl, accountId),
                HttpMethod.GET,
                new HttpEntity<String>(this.getHeaders(null, userAccessCredentials.getAccessToken())),
                String.class
            );

            if (profileResponse.hasBody())
            {
                return Optional.ofNullable(new JSONObject(profileResponse.getBody()).getString("timeZone"));
            }
        }
        catch (HttpClientErrorException.NotFound e)
        {
            log.error("Couldn't fetch timezone against user with accountId: {}", accountId);
            throw new ServiceException(ServiceError.PS0113);
        }
        catch (HttpClientErrorException exception)
        {
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }

        return Optional.empty();
    }

    public List<Map<String, Object>> fetchUserActivity(
        String accountId,
        String requestedDate,
        String userName,
        Principal principal,
        AtomicBoolean isThereAnyErrorFromJira,
        boolean fetchDefaultTickets,
        boolean fetchForScrumUpdate
    )
    {
        long jqlBuildStart = System.currentTimeMillis();
        String searchJQLJson;
        if (fetchForScrumUpdate)
        {
            String dateTo = LocalDate.now().toString();
            searchJQLJson = jqlHelper.getJqlForActivityInDateRange(accountId, requestedDate, dateTo, userName);
        }
        else
        {
            searchJQLJson = fetchDefaultTickets ?
                jqlHelper.getJqlForDefaultActivity(requestedDate) :
                jqlHelper.getJqlForUserActivity(accountId, requestedDate, userName);
        }
        long jqlBuildEnd = System.currentTimeMillis();
        log.debug("[SCRUM-TIMER] fetchUserActivity JQL built account={} fetchDefault={} fetchScrum={} jqlBuildTook={}ms",
                accountId, fetchDefaultTickets, fetchForScrumUpdate, jqlBuildEnd - jqlBuildStart);

        log.debug("Post Query: {}", searchJQLJson);

        try
        {
            long jiraCallStart = System.currentTimeMillis();
            List<Map<String, Object>> results = jiraClientRestHelper.searchIssueUsingPost(
                buildJiraUrl(getJiraConfig().jiraSearchUrl, principal),
                searchJQLJson,
                fetchDefaultTickets ? List.of("summary", "issuetype") : getAllRequiredFields(),
                !fetchDefaultTickets ? List.of("changelog") : Collections.emptyList(),
                getSavedHeaders(principal)
            );
            long jiraCallEnd = System.currentTimeMillis();
            log.debug("[SCRUM-TIMER] fetchUserActivity Jira API completed account={} issuesReturned={} jiraCallTook={}ms totalFetchTime={}ms",
                    accountId, results.size(), jiraCallEnd - jiraCallStart, jiraCallEnd - jqlBuildStart);
            return results;
        }
        catch (HttpClientErrorException exception)
        {
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
        catch (Exception exception)
        {
            //throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
            log.error("Exception occurred while firing JQL: {}", searchJQLJson, exception);

            if (isThereAnyErrorFromJira != null)
            {
                isThereAnyErrorFromJira.set(true);
            }

            return new ArrayList<>();
        }
    }

    @Override
    public List<Map<String, Object>> getIssuesWithSearchQuery(String query, Principal principal)
    {

        var url = buildJiraUrl(getJiraConfig().jiraIssuePicker, principal) + "?currentJQL=issueKey IS NOT EMPTY&query=" + query + "&showSubTasks=true&showSubTaskParent=true";

        try
        {
            var response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getSavedHeaders(principal)),
                new ParameterizedTypeReference<Map<String, Object>>()
                {
                }
            );

            var json = new JSONObject(response.getBody());
            var allIssues = new ArrayList<Map<String, Object>>();

            json.getJSONArray("sections").forEach(sectionObj -> {
                var section = (JSONObject) sectionObj;
                section.getJSONArray("issues").forEach(issueObj -> {
                    var issueJson = (JSONObject) issueObj;
                    allIssues.add(convertJsonToMap(issueJson));
                });
            });

            return allIssues;

        }
        catch (HttpClientErrorException exception)
        {
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
        catch (Exception exception)
        {
            log.error("Error while fetching or mapping: {}", exception.toString());
            return new ArrayList<>();
        }
    }

    @Override
    public void getLastWeekActivity(Principal principal, SummaryGeneration.Request request)
    {
        String searchJQLJson = jqlHelper.getJqlForLastWeekActivity(request).replace("\\\"", "'");
        log.debug("Post Query: {}", searchJQLJson);
        try
        {
            List<Map<String, Object>> allIssues = jiraClientRestHelper.searchIssueUsingPost(
                buildJiraUrl(getJiraConfig().jiraSearchUrl, principal),
                searchJQLJson,
                List.of("worklog", "summary"),
                Collections.emptyList(),
                getSavedHeaders(principal)
            );

            log.debug("Total issues fetched from source: {}", allIssues.size());
            Map<String, List<Object>> worklogs = getAdditionalWorklogs(principal, request, allIssues);

            request.setExcessWorklogs(worklogs);
            request.setIssues(allIssues);
        }
        catch (HttpClientErrorException exception)
        {
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
        catch (Exception exception)
        {
            request.setIssues(List.of());
        }
    }

    private Map<String, List<Object>> getAdditionalWorklogs(
        Principal principal,
        SummaryGeneration.Request request,
        List<Map<String, Object>> allIssues
    )
    {
        List<String> issuesForWhichWorkLogsNeedsToBeFetched = new ArrayList<>();

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        List<IssuePart> issueParts = objectMapper.convertValue(allIssues, new TypeReference<>()
        {
        });
        issueParts.forEach(issue -> {
            if (!ObjectUtils.isEmpty(issue.getFields().getWorklog()))
            {
                if (issue.getFields().getWorklog().getTotal() > issue.getFields().getWorklog().getMaxResults())
                {
                    issuesForWhichWorkLogsNeedsToBeFetched.add(issue.getKey());
                }
            }
        });

        Map<String, List<Object>> worklogs = new HashMap<>();
        issuesForWhichWorkLogsNeedsToBeFetched.forEach(key -> {
            log.debug("fetching extra worklog for {} after date {}", key, request.getDateRange().get(0));
            IssuePart.Worklog worklog = getWorklogForASingleKey(
                key,
                new ParameterizedTypeReference<>()
                {
                },
                request.getDateRange().get(0),
                principal
            );

            log.debug("retrieved {} entries from source", worklog.getWorklogs().size());
            worklogs.put(key, worklog.getWorklogs());
        });
        return worklogs;
    }

    private Map<String, Object> convertJsonToMap(JSONObject jsonObject)
    {
        Map<String, Object> map = new HashMap<>();

        for (String key : jsonObject.keySet())
        {
            Object value = jsonObject.get(key);
            map.put(key, value);
        }

        return map;
    }

    private List<String> getAllRequiredFields()
    {
        return List.of(
            "worklog",
            "summary",
            "issuetype",
            "parent",
            "comment",
            "reporter",
            "assignee",
            "created",
            "status"
        );
    }

    public Map<String, Object> getIssueDetail(String issueKey, Principal principal)
    {
        // Jira Issue endpoint e.g. /rest/api/3/issue/ABC-123
        String baseUrl = String.format(getJiraConfig().JiraValidateIssueId, issueKey);
        String fields = "?fields=summary,assignee,description,issuetype";

        String url = buildJiraUrl(baseUrl + fields, principal);

        try
        {
            var response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getSavedHeaders(principal)),
                new ParameterizedTypeReference<Map<String, Object>>()
                {
                }
            );

            var issueJson = new JSONObject(response.getBody());
            var fieldsJson = issueJson.getJSONObject("fields");

            // --- Convert ADF to HTML + Text ---
            String adfJson = fieldsJson.optString("description", "");
            String descriptionHtml = jiraClientRestHelper.convertAdfToHtml(adfJson);
            String descriptionText = jiraClientRestHelper.convertAdfToText(adfJson);

            Map<String, Object> result = new HashMap<>();
            result.put("id", issueJson.optInt("id", 0));
            result.put("key", issueKey);
            result.put("keyHtml", "<b>" + issueKey + "</b>");
            result.put("summary", fieldsJson.optString("summary", ""));
            result.put("description", descriptionHtml);
            result.put("descriptionText", descriptionText);

            // assignee object may be null
            if (!fieldsJson.isNull("assignee"))
            {
                var assignee = fieldsJson.getJSONObject("assignee");
                result.put("assignee", assignee.optString("displayName", ""));
            }
            else
            {
                result.put("assignee", null);
            }

            // --- Issue Type Icon (strip domain part) ---
            if (!fieldsJson.isNull("issuetype"))
            {
                var issueTypeObj = fieldsJson.getJSONObject("issuetype");
                var fullIconUrl = issueTypeObj.optString("iconUrl", null);

                if (fullIconUrl != null && !fullIconUrl.isBlank())
                {
                    // Remove domain, keep only the path
                    URI uri = URI.create(fullIconUrl);
                    var iconUrl = uri.getPath();  // e.g. "/rest/api/3/universal_avatar/view/type/issuetype/avatar/10318"
                    result.put("img", iconUrl);
                }
                else
                {
                    result.put("img", null);
                }
            }

            return result;

        }
        catch (HttpClientErrorException exception)
        {
            throw new SourceSystemServiceException(exception, SourceSystemServiceException.SourceSystem.JIRA);
        }
        catch (Exception exception)
        {
            log.error("Error while fetching or mapping single issue: {}", exception.toString());
            return Map.of();
        }
    }

}
