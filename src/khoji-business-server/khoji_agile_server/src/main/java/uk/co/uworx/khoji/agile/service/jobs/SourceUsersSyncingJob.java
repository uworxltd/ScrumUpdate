package uk.co.uworx.khoji.agile.service.jobs;

import lombok.extern.log4j.Log4j2;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.legacy.models.SourceUser;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.agile.service.jira.JiraTokenRefreshService;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;


@Log4j2
@Component("SourceUsersSyncingJob")
public class SourceUsersSyncingJob implements Processor
{
  private final InstanceDataService instanceDataService;
  private final UserAccessDataService userAccessDataService;
  private final TenantService tenantService;
  private final InstanceUserDataService instanceUserDataService;
  private final JiraTokenRefreshService jiraTokenRefreshService;

  public SourceUsersSyncingJob(
          InstanceDataService instanceDataService,
          UserAccessDataService userAccessDataService,
          TenantService tenantService,
          InstanceUserDataService instanceUserDataService,
          JiraTokenRefreshService jiraTokenRefreshService
  )
  {
    this.instanceDataService = instanceDataService;
    this.userAccessDataService = userAccessDataService;
    this.tenantService = tenantService;
    this.instanceUserDataService = instanceUserDataService;
    this.jiraTokenRefreshService = jiraTokenRefreshService;
  }

  @Override
  public void process(Exchange exchange) throws Exception
  {
    // Step-1: find all the registered instances in the system
    log.debug("Finding all the instances in the system");
    List<Instance> allInstances = this.instanceDataService.findAll();
    log.debug("Found {} registered instances", allInstances.size());

    if (CollectionUtils.isNotEmpty(allInstances))
    {
      // Step-2: find the user accesses of instance owners
      List<UserAccess> userAccesses = new ArrayList<>();
      log.debug("Finding owner userAccess against found instances");
      allInstances.forEach(i -> {
        Optional<UserAccess> userAccess = this.userAccessDataService.findByEmailAndInstanceId(
                i.getWorkspace().getOwner().getEmail(),
                i.getId()
        );
        userAccess.ifPresent(userAccesses::add);
      });
      log.debug("Found {} owner userAccesses against instances", userAccesses.size());

      if (CollectionUtils.isNotEmpty(userAccesses))
      {
        userAccesses.forEach(ua -> {
          try
          {
            // set context for auto Injections of instance ids
            InstanceIdContext.setInstanceId(ua.getInstance().getId().toString());

            // Step-3: check if token update is required
            jiraTokenRefreshService.updateTokenIfRequired(ua);

            // Step-4: finding all the users that are not active in source
            log.debug("Fetching revoked users on source");
            List<SourceUser> allUsers = tenantService
                    .getJiraDataClient()
                    .fetchUsers(
                            null,
                            () -> ua.getUser().getEmail(),
                            false
                    );

            List<String> inActiveSourceUsers = allUsers
                    .stream()
                    .filter(su -> !su.isActiveInSource())
                    .map(SourceUser::getSourceId)
                    .toList();

            List<String> activeUsers = allUsers
                    .stream()
                    .filter(SourceUser::isActiveInSource)
                    .map(SourceUser::getSourceId)
                    .toList();

            // Step-5: find all the users that are registered by the user in instance
            log.debug("Fetching instance users");
            List<InstanceUser> instanceUsers = this.instanceUserDataService.findInstanceUsersByInstanceId(
                    ua.getInstance().getId()
            );

            // Step-6: revoke those that are not active in source
            log.debug("Updating status of instance users according to status on source");
            instanceUsers.forEach(iu -> {
              if (iu.getStatus().equals(KhojiUserStatus.REVOKED.name()) && activeUsers.contains(iu.getAccountId()))
              {
                log.debug("Un-revoking user wth account id {}", iu.getAccountId());
                if (StringUtils.isEmpty(iu.getEmail()))
                {
                  iu.setStatus(KhojiUserStatus.INCOMPLETE.name());
                }
                else
                {
                  if (userAccessDataService.findByEmailAndInstanceId(iu.getEmail(), ua.getInstance().getId()).isPresent())
                  {
                    iu.setStatus(KhojiUserStatus.JOINED.name());
                  }
                  else
                  {
                    iu.setStatus(KhojiUserStatus.PENDING.name());
                  }
                }
              }
              else if (inActiveSourceUsers.contains(iu.getAccountId()) && !iu.getStatus().equals(KhojiUserStatus.REVOKED.name()))
              {
                log.debug("Revoking user with account id {}", iu.getAccountId());
                iu.setStatus(KhojiUserStatus.REVOKED.name());
              }
            });

            // Step-7: save in the db now
            instanceUserDataService.saveOrUpdateAll(instanceUsers);

            InstanceIdContext.clear();
          }
          catch (Exception e)
          {
            log.debug("Exception occurred while syncing source users for user {}", ua.getUser().getId(), e);
          }
        });
      }
    }
  }
}
