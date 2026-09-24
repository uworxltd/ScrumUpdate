/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;
import uk.co.uworx.khoji.agile.config.KhojiUsersConfig;
import uk.co.uworx.khoji.agile.config.PaymentSubscriptionConfig;
import uk.co.uworx.khoji.agile.internal.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.internal.model.ProjectSourceUser;
import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.service.RoleService;
import uk.co.uworx.khoji.agile.internal.service.SourceSystemService;
import uk.co.uworx.khoji.agile.internal.service.UserService;
import uk.co.uworx.khoji.agile.internal.service.UserStatusService;
import uk.co.uworx.khoji.agile.internal.tenant.TenantContext;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Service manages syncing of source and khoji users
 */
@Service
@Log4j2
public class SubscriptionService
{
  private static final String USER_REVOKED = "USER_REVOKED";
  private static final String USER_CREATED = "USER_CREATED";
  private static final String USER_UPDATED = "USER_UPDATED";
  private UserService userService;
  private RoleService roleService;
  @Autowired
  private AdminService adminService;
  private UserStatusService userStatusService;
  @Autowired
  private PaymentSubscriptionConfig paymentSubscriptionConfig;
  private KhojiUsersConfig khojiUsersConfig;
  @Autowired
  private ApplicationContext applicationContext;

  /**
   * Change user status to their last
   * valid statuses
   *
   * @param revokedUsersInKhojiList to be changed
   */
  public void changeUserStatusesToLastValidStatus(List<User> revokedUsersInKhojiList)
  {
    revokedUsersInKhojiList.forEach(revokedUser ->
    {
      userStatusService.setUserStatusToLastValidStatus(revokedUser);
      log.info("Changed user status of {} to {}", revokedUser.getEmail(), revokedUser.getUserStatuses().get(1).getStatus());
    });
  }

  /**
   * Revoke users and send emails to admins
   *
   * @param revokeUsersList to be revoked
   */
  public void revokeUsersAndNotify(List<User> revokeUsersList)
  {
    paymentSubscriptionConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("paymentSubscriptionConfig", PaymentSubscriptionConfig.class);
    revokeUsersList.forEach(userToBeRevoked ->
    {
      userService.revokeUserAccess(userToBeRevoked, null, null);
      if (paymentSubscriptionConfig.notifyAdminOnUserSyncMap.get(USER_REVOKED))
      {
        log.info("Revoked user {} from Khoji", userToBeRevoked.getEmail());
        adminService.sendUserRevokedEmailToAllAdmins(userToBeRevoked);
      }
    });
  }

  /**
   * Converts User model to ProjectSourceUser
   * and assign default role and organization
   *
   * @param incompleteUser to be changed
   * @return ProjectSourceUser after conversion
   */
  public ProjectSourceUser getUserDetails(User incompleteUser)
  {
    khojiUsersConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("khojiUsersConfig", KhojiUsersConfig.class);
    ProjectSourceUser projectSourceUser = new ProjectSourceUser();
    projectSourceUser.setAccountId(incompleteUser.getAccountId());
    projectSourceUser.setFirstName(incompleteUser.getMember().getFirstName());
    projectSourceUser.setLastName(incompleteUser.getMember().getLastName());
    return projectSourceUser;
  }

  /**
   * This method extract users having revoked access on Khoji
   * but enabled access on source
   *
   * @param projectSourceList users from project source
   * @param khojiUsersList    users from khoji
   * @return
   */
  public List<User> getSourceUsersWithEnabledAccess(List<User> projectSourceList, List<User> khojiUsersList)
  {
    List<User> usersHavingAccessEnabledAgainOnSource = new ArrayList<>();
    for (User sourceUser : khojiUsersList)
    {
      if (projectSourceList.stream().anyMatch(khojiUser -> isSourceAndKhojiUserAccountIdEqual(sourceUser, khojiUser) && isUserStatusRevoked(sourceUser)))
      {
        usersHavingAccessEnabledAgainOnSource.add(sourceUser);
      }
    }
    return usersHavingAccessEnabledAgainOnSource;
  }

  /**
   * This method extracts the users that are
   * not revoked in khoji but revoked or deleted
   * from source.
   *
   * @param projectSourceList users from project source
   * @param khojiUsersList    users from khoji
   * @return list of users
   */
  public List<User> getSourceRevokedUsers(List<User> projectSourceList, List<User> khojiUsersList)
  {
    List<User> revokedOrDeletedUsersFromSourceList = new ArrayList<>();
    for (User sourceUser : khojiUsersList)
    {
      if (projectSourceList.stream().noneMatch(khojiUser -> isSourceAndKhojiUserAccountIdEqual(sourceUser, khojiUser)))
      {
        revokedOrDeletedUsersFromSourceList.add(sourceUser);
      }
    }
    revokedOrDeletedUsersFromSourceList.removeIf(this::isUserStatusRevoked);
    return revokedOrDeletedUsersFromSourceList;
  }

  /**
   * This method compares the both lists and
   * extract users who are not in khoji but on source
   *
   * @param projectSourceList users from project source
   * @param khojiUsersList    users from khoji
   * @return list of users
   */
  public List<User> getNewUsersFromProjectSource(List<User> projectSourceList, List<User> khojiUsersList)
  {
    List<User> addNewIncompleteUsers = new ArrayList<>();
    for (User sourceUser : projectSourceList)
    {
      if (khojiUsersList.stream().noneMatch(khojiUser -> isSourceAndKhojiUserAccountIdEqual(khojiUser, sourceUser)))
      {
        addNewIncompleteUsers.add(sourceUser);
      }
    }
    return addNewIncompleteUsers;
  }

  /**
   * The method excludes the khoji users and
   * users with specific domains if removeDomainSpecificUsers
   * is true.
   * Users with no account id are considered as
   * khoji users.
   *
   * @param khojiUsersList users from khoji
   */
  public void excludeEmailSpecificUsersFromList(List<User> khojiUsersList)
  {
    paymentSubscriptionConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("paymentSubscriptionConfig", PaymentSubscriptionConfig.class);
    log.info("Emails to exclude: {}", Arrays.toString(paymentSubscriptionConfig.excludeUsersFromBillingCount.toArray()));

    khojiUsersList.removeIf(user -> {
      boolean isMemberEmailInExclusion = StringUtils.hasLength(user.getMember().getMemberEmail()) && paymentSubscriptionConfig.excludeUsersFromBillingCount.stream().anyMatch(email -> Objects.equals(user.getMember().getMemberEmail(), email));
      if (isMemberEmailInExclusion)
      {
        log.info("Excluded user with email: {} from final count.", user.getMember().getMemberEmail());
      }
      return isMemberEmailInExclusion;
    });
  }

  /**
   * Checks whether source user and
   * khoji user account ids are equal
   *
   * @param sourceUser from project source
   * @param khojiUser  from khoji
   * @return true if account ids are equal
   */
  private boolean isSourceAndKhojiUserAccountIdEqual(User sourceUser, User khojiUser)
  {
    return Objects.equals(khojiUser.getAccountId(), sourceUser.getMember().getAccountId());
  }

  /**
   * Checks whether the user
   * status is revoked
   *
   * @param user user to check status
   * @return True if the user is revoked, false otherwise
   */
  public boolean isUserStatusRevoked(User user)
  {
    return Objects.equals(user.getUserStatuses().get(0).getStatus(), KhojiUserStatus.REVOKED);
  }
}
