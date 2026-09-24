/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.controller.admin;

import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.controller.admin.api.UserAPI;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.internal.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.model.UserDetail;
import uk.co.uworx.khoji.agile.internal.service.AccessLevelDataService;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.RolesDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamMembersDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.service.AdminService;
import uk.co.uworx.khoji.agile.service.SubscriptionService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

@Validated
@RestController
@Log4j2
public class UserAPIImpl implements UserAPI
{
  @Autowired
  private AdminService adminService;
  @Autowired
  private SubscriptionService subscriptionService;
  @Autowired
  private InstanceUserDataService instanceUserDataService;
  @Autowired
  private AccessLevelDataService accessLevelDataService;
  @Autowired
  private RolesDataService rolesDataService;
  @Autowired
  private TeamMembersDataService teamMembersDataService;
  @Autowired
  private UserAccessDataService userAccessDataService;

  @Override
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public List<User> getUsers()
  {
    return instanceUserDataService
            .findInstanceUsersByInstanceId(null)
            .stream()
            .map(User::new)
            .toList();
  }


  // TODO: please remove below 2 methods when FE refactoring is done
  @Override
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public List<User> getUsersInTeam()
  {
    return this.getUsers();
  }

  @Override
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public List<User> getBasicUsers()
  {
    return this.getUsers();
  }

  /**
   * To revoke the access of the user from
   * Khoji
   * @param username
   * @param clientIp
   * @param usernameIdentifier
   * @param principal
   * @return
   */
  @Override
  @Transactional
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.TENANT_ADMIN
          }
  )
  public ResponseEntity<User> revokeUserAccess(
          String username,
          String clientIp,
          Long usernameIdentifier,
          Principal principal
  )
  {
    InstanceUser user = instanceUserDataService.findInstanceUserById(usernameIdentifier);
    if (StringUtils.isNotEmpty(user.getEmail()) && user.getEmail().equalsIgnoreCase(principal.getName()))
    {
      throw new ServiceException(ServiceError.U0106);
    }

    //    checkIfSyncingSchemeIsEnabledForSourceUser(user);
    user.setStatus(uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus.REVOKED.name());
    instanceUserDataService.saveOrUpdate(user);
    teamMembersDataService.removeRevokedUserFromTeams(user.getId());
    //    subscriptionService.sendUpdatedUserCountOnPaymentSource();
    return new ResponseEntity<>(
            new User(user),
            HttpStatus.OK
    );
  }

  /**
   * Method to enable access again after revoke.
   * An email is sent to user that he can log in
   * with existing credentials again
   * @param username
   * @param clientIp
   * @param usernameIdentifier revoked user identifier
   * @param principal to fetch username
   * @return
   */
  @Override
  @Transactional
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.TENANT_ADMIN
          }
  )
  public ResponseEntity<User> enableAccessAfterRevoke(
          String username,
          String clientIp,
          Long usernameIdentifier,
          Principal principal
  )
  {
    InstanceUser user = instanceUserDataService.findInstanceUserById(usernameIdentifier);
    String status;
    if (StringUtils.isNotEmpty(user.getEmail()))
    {
      if (userAccessDataService.findByEmailAndInstanceId(user.getEmail(), null).isPresent())
      {
        status = uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus.JOINED.name();
      }
      else
      {
        status = uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus.PENDING.name();
      }
    }
    else
    {
      status = uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus.INCOMPLETE.name();
    }
    user.setStatus(status);
    instanceUserDataService.saveOrUpdate(user);
    return new ResponseEntity<>(
            new User(user),
            HttpStatus.OK
    );
  }

  @Override
  public List<AccessLevel> getAllUserAccessLevels()
  {
    return accessLevelDataService.getAllAccessLevels();
  }

  @Override
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<List<User>> updateUsersDetails(List<UserDetail> usersList, Principal principal)
  {
    List<User> updatedUsers = new ArrayList<>();
    if (CollectionUtils.isNotEmpty(usersList))
    {
      usersList.forEach(
              usr -> {
                InstanceUser instanceUser = instanceUserDataService
                        .findInstanceUserUsingAccountAndInstanceId(
                                usr.getAccountId(),
                                null
                        );

                String oldEmail = instanceUser.getEmail();

                instanceUser.setEmail(usr.getEmail());

                if (
                        StringUtils.isNotEmpty(usr.getEmail()) &&
                        !instanceUser.getStatus().equalsIgnoreCase(KhojiUserStatus.JOINED.name())
                ) instanceUser.setStatus(KhojiUserStatus.PENDING.name());

                instanceUser.setRole(
                        rolesDataService.getRoleByCode(usr.getRoleCode())
                );

                instanceUser.setAccessLevel(
                        accessLevelDataService.findByCode(usr.getAccessLevelCode())
                );

                instanceUserDataService.saveOrUpdate(
                        instanceUser
                );

                updatedUsers.add(
                       new User(instanceUser)
                );

                if (StringUtils.isNotEmpty(usr.getEmail()) && !usr.getEmail().equalsIgnoreCase(oldEmail))
                {
                  adminService.sendEmailToUser(
                          usr.getEmail(),
                          principal.getName(),
                          null
                  );
                }
              }
      );
    }

    return new ResponseEntity<>(updatedUsers, HttpStatus.OK);
  }

  @Override
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<List<User>> getUsersByMemberIds(List<Long> memberIdsList)
  {
    List<InstanceUser> instanceUsers = instanceUserDataService.findInstanceUserUsingIdsListAndInstanceId(
            memberIdsList,
            null
    );

    return new ResponseEntity<>(
            instanceUsers
                    .stream()
                    .map(User::new)
                    .toList(),
            HttpStatus.OK
    );
  }
}
