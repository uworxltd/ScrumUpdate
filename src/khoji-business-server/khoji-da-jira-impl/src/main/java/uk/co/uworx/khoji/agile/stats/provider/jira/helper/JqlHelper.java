/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.stats.provider.jira.helper;

import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.internal.model.JiraRequestParameters;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.liquid.LiquidTemplateHandler;
import uk.co.uworx.khoji.agile.stats.provider.jira.JiraQueryId;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Helper class to form jql queries
 */
@Component
@Log4j2
public class JqlHelper {
    @Autowired
    private LiquidTemplateHandler liquidTemplateHandler;
    @Value("${jira.jql.template.filepath:/jira/cloud/templates/jiraRequest.liquid}")
    private String TEMPLATE_FILE_PATH;
    @Autowired
    private ConfigHandler configHandler;

    Map<String, String> templates = new HashMap<>();

    /**
     * Returns the jql for searching individual issues
     *
     * @param members  the team members
     * @param dateFrom the date from
     * @param dateTo   the date to
     * @return the jql
     */
    public String getJqlForIndividualsIssues(List<String> members, String dateFrom, String dateTo) {
        JiraRequestParameters parameters = new JiraRequestParameters();
        if (StringUtils.isEmpty(dateFrom) || StringUtils.isEmpty(dateTo)) {
            parameters.setQueryId(JiraQueryId.INDIVIDUALS_ISSUES_WITHOUT_RANGE.getValue());
        } else {
            parameters.setQueryId(JiraQueryId.INDIVIDUALS_ISSUES.getValue());
        }
        parameters.setDateFrom(dateFrom);
        parameters.setDateTo(dateTo);
        Collections.sort(members);
        parameters.setMemberNames(members);
        return liquidTemplateHandler.renderTemplate(getTemplateAgainstTenant(configHandler.TENANT_ID), parameters);
    }

    public String getJqlForUserActivity(String accountId, String date, String userName)
    {
        JiraRequestParameters parameters = new JiraRequestParameters();
        parameters.setQueryId(JiraQueryId.USER_ACTIVITY.getValue());
        parameters.setUserAccountId(accountId);
        parameters.setRequestedDate(date);
        parameters.setUserName(userName);
        return liquidTemplateHandler.renderTemplate(getTemplateAgainstTenant(configHandler.TENANT_ID), parameters);
    }

    public String getJqlForDefaultActivity(String date)
    {
        JiraRequestParameters parameters = new JiraRequestParameters();
        parameters.setQueryId(JiraQueryId.DEFAULT_ACTIVITY.getValue());
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate dateF = LocalDate.parse(date, formatter);
        LocalDate newDate = dateF.minusDays(30);
        parameters.setRequestedDate(dateF.toString());
        LocalDate currentDate = LocalDate.now().plusDays(1);
        parameters.setTodayDatePlus1(currentDate.format(formatter));
        parameters.setRequestedDateMinus30Days(newDate.toString());
        parameters.setSummaryKeyWords(Arrays.asList("Sprint", "Scrum", "Meetings", "Leaves", "Holidays"));

        return liquidTemplateHandler.renderTemplate(getTemplateAgainstTenant(configHandler.TENANT_ID), parameters);
    }

    public String getJqlForActivityInDateRange(String accountId, String dateFrom, String dateTo, String userName)
    {
        JiraRequestParameters parameters = new JiraRequestParameters();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        dateFrom = LocalDate.parse(dateFrom, formatter).toString();
        dateTo = LocalDate.parse(dateTo, formatter).toString();

        parameters.setQueryId(JiraQueryId.DATE_RANGE_ACTIVITY.getValue());
        parameters.setUserAccountId(accountId);
        parameters.setUserName(userName);
        parameters.setDateFrom(dateFrom);
        parameters.setDateTo(dateTo);

        return liquidTemplateHandler.renderTemplate(getTemplateAgainstTenant(configHandler.TENANT_ID), parameters);
    }

    public String getJqlForLastWeekActivity(SummaryGeneration.Request request)
    {
        JiraRequestParameters parameters = new JiraRequestParameters();
        parameters.setQueryId(JiraQueryId.LAST_WEEK_ACTIVITY.getValue());
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate dateNow = LocalDate.now();
        String dateFrom;
        String dateTo;

        if (CollectionUtils.isNotEmpty(request.getDateRange()))
        {
            dateFrom = LocalDate.parse(request.getDateRange().get(0), formatter).toString();
            dateTo = LocalDate.parse(request.getDateRange().get(1), formatter).toString();
        }
        else
        {
            dateFrom = dateNow.minusDays(7).format(formatter);
            dateTo = dateNow.format(formatter);
        }

        parameters.setDateFrom(dateFrom);
        parameters.setDateTo(dateTo);
        parameters.setUserAccountId(request.getAccountId());

        request.setDateRange(List.of(dateFrom, dateTo));

        return liquidTemplateHandler.renderTemplate(getTemplateAgainstTenant(configHandler.TENANT_ID), parameters);
    }

    private String getTemplateAgainstTenant(String tenantId) {
        //Todo Before parsing make sure there is no empty line at the end of file else the template will not be parsed
        if (templates.get(tenantId) != null) {
            return templates.get(tenantId);
        }

        String template = null;
        try {
            InputStream resource = new ClassPathResource(TEMPLATE_FILE_PATH).getInputStream();
            template = new String(resource.readAllBytes(), StandardCharsets.UTF_8);
            templates.put(tenantId, template);
        } catch (IOException e) {
          log.error("Unable to read the templates from config. Reason: {}", e.getMessage(), e);
        }
        return template;
    }
}
