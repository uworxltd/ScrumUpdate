package uk.co.uworx.khoji.agile.service.jobs;


import lombok.extern.log4j.Log4j2;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.handler.WorkLogHandler;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.context.TenantIdContext;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.service.business.WorkLogAIService;
import uk.co.uworx.khoji.agile.service.jira.JiraTokenRefreshService;

import java.security.Principal;
import java.util.ArrayList;

@Log4j2
@Component("WorkLogSummariesGenerationJob")
public class WorkLogSummariesGenerationJob implements Processor
{
  public static String WORKLOG_GENERATION_KEY = "summary";
  private final WorkLogHandler workLogHandler;
  private final WorkLogAIService workLogAIService;
  private final UserAccessDataService userAccessDataService;
  private final InstanceUserConfigDataService instanceUserConfigDataService;
  private final JiraTokenRefreshService jiraTokenRefreshService;

  public WorkLogSummariesGenerationJob(
          WorkLogHandler workLogHandler,
          WorkLogAIService workLogAIService,
          UserAccessDataService userAccessDataService,
          InstanceUserConfigDataService instanceUserConfigDataService,
          JiraTokenRefreshService jiraTokenRefreshService
  )
  {
    this.workLogHandler = workLogHandler;
    this.workLogAIService = workLogAIService;
    this.userAccessDataService = userAccessDataService;
    this.instanceUserConfigDataService = instanceUserConfigDataService;
    this.jiraTokenRefreshService = jiraTokenRefreshService;
  }

  @Override
  public void process(Exchange exchange) throws Exception
  {
    userAccessDataService
            .findAll()
            .forEach(ua -> {
              try
              {
                InstanceIdContext.setInstanceId(ua.getInstance().getId().toString());
                TenantIdContext.setTenantId(ua.getInstance().getTenantId());

                // update token if required
                updateTokenIfRequired(ua);

                SummaryGeneration.Request request = SummaryGeneration
                        .Request
                        .builder()
                        .userName(ua.getInstanceUser().getFullName())
                        .userRole(ua.getInstanceUser().getRole().getName())
                        .accountId(ua.getInstanceUser().getAccountId())
                        .issues(new ArrayList<>())
                        .build();

                // fire jql method which returns the issues
                getLastWeekIssues(
                        () -> ua.getUser().getEmail(),
                        request
                );

                // send those issues to KIA (if no issues dont call kia)
                String summary = sendIssuesToKiaAndRetrieveSummary(request);

                // store generated summary in db against a key summary
                saveSummaryInDB(summary, ua.getInstanceUser());
              }
              catch (Exception e)
              {
                log.error(
                        "Failed job for user {} in instance {}",
                        ua.getInstanceUser().getFullName(),
                        ua.getInstance().getId(),
                        e
                );
              }
              finally
              {
                TenantIdContext.clear();
                InstanceIdContext.clear();
              }
            });
  }

  private void updateTokenIfRequired(UserAccess userAccess)
  {
    try
    {
      jiraTokenRefreshService.updateTokenIfRequired(userAccess);
    }
    catch (Exception e)
    {
      log.error("failed to update token, ", e);
      throw e;
    }
  }

  private void getLastWeekIssues(Principal principal, SummaryGeneration.Request request)
  {
    log.debug(
            "getting last week activity for user: {} in instance: {}",
            request.getUserName(),
            InstanceIdContext.getInstanceId()
    );

    try
    {
      workLogHandler.getLastWeekOrDateRangeActivity(principal, request);
    }
    catch (Exception e)
    {
      log.error("failed to retrieve user issues", e);
      throw e;
    }
  }

  private String sendIssuesToKiaAndRetrieveSummary(SummaryGeneration.Request request)
  {
    if (request.getIssues().isEmpty())
    {
      log.debug("retrieved no issue against user: {} skipping call to KIA", request.getUserName());
      return "";
    }

    log.debug(
            "retrieved {} issue(s) against user: {} sending to KIA",
            request.getIssues().size(),
            request.getUserName()
    );

    return workLogAIService
            .getWorkLogSummary(request, SummaryGeneration.Type.PERSONALIZATION)
            .getSummary();
  }

  private void saveSummaryInDB(String summary, InstanceUser instanceUser)
  {
    if (StringUtils.isEmpty(summary))
    {
      log.debug("skipping saving summary in db since it is empty");
      return;
    }

    log.debug("saving summary in db against user");
    instanceUserConfigDataService.saveInstanceUserConfig(
            WORKLOG_GENERATION_KEY,
            summary,
            instanceUser
    );
  }
}

