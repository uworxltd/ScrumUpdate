/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service.jira;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.log4j.Log4j2;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;
import uk.co.uworx.khoji.agile.internal.service.UserService;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Service("UserDataReportingSync")
@Log4j2
public class UserDataReportingSync implements Processor
{
  private UserService userService;
  @Autowired
  private TenantService tenantService;
  @Autowired
  private ValidateUserSubscriptionService validateUserSubscriptionService;

  @Override
  public void process(Exchange exchange) throws Exception
  {
//    //This will fetch all the entries in table as no tenant is present
//    List<TenantDetails> tenantDetailsList = tenantDetailsRepository.findAll();
//
//    //This logic can be improved if we want to use token of tenant admin only
//    tenantDetailsList.forEach(
//            this::checkIfUsersDataNeedsUpdationOrDeletionFromSource
//    );
  }

  public Map<String, List<TenantUserInfo>> getAllTenantDetails()
  {
//    log.info("About to start finding user details for all the users");
//    List<TenantDetails> allTenants = tenantDetailsRepository.findAll();
//    log.info("found all tenants");
//    Map<String, List<TenantUserInfo>> tenantDetails = new HashMap<>();
//    allTenants.forEach(
//            getTenantUserDetailsWithEmail(tenantDetails)
//    );
//
//    return tenantDetails;
    return new HashMap<>();
  }

  private Consumer<TenantDetails> getTenantUserDetailsWithEmail(Map<String, List<TenantUserInfo>> tenantDetails)
  {
//    return t -> {
//      try
//      {
//        if (validateUserSubscriptionService.validateIfSubscriptionIsActiveAgainstTenantId(t.getTenantId()))
//        {
//          log.info("About to find details of tenant {}", t.getTenantId());
//          List<UserSettings> userSettings = userSettingsRepository.findAll();
//          log.info("users found against tenant {}", userSettings.size());
//          tenantDetails.put(
//                  t.getTenantName(),
//                  userSettings
//                          .stream()
//                          .filter(us -> userService.isUserAJoinedUser(us.getUser()) &&
//                                  us
//                                          .getUser()
//                                          .getTenantId()
//                                          .getTenantId()
//                                          .equalsIgnoreCase(t.getTenantId())
//                          )
//                          .map(us -> new TenantUserInfo(
//                                  us
//                                          .getUser()
//                                          .getMember()
//                                          .getFullName(),
//                                  us
//                                          .getUser()
//                                          .getMember()
//                                          .getMemberEmail(),
//                                  us.isEmailWorkLog()
//                          ))
//                          .toList()
//          );
//        }
//      }
//      catch (Exception e)
//      {
//        log.info("Failed for tenant {}::{}", t.getTenantId(), e);
//      }
//    };
    return t -> {};
  }

//  private void checkIfUsersDataNeedsUpdationOrDeletionFromSource(TenantDetails tenant)
//  {
//    TenantUsers tenantUsers = tenantUserService.findFirstByTenantId(tenant.getTenantId());
//
//    if (tenantUsers != null)
//    {
//      TenantContext.setCurrentTenant(tenantUsers, "Setting tenant for data reporting API");
//
//      //Fetching all users for account id
//      List<User> userList = userService.getUsers();
//      //send these to security service and update accounts if required
//      validateUserSubscriptionService.fetchAndUpdateUserDetailsAgainstSourceDataReportingAPI(userList);
//      TenantContext.clear();
//    }
//  }

  @Getter
  @Setter
  @AllArgsConstructor
  public static class TenantUserInfo
  {
    private String usersName;
    private String email;
    private boolean emailsEnabled;
  }
}

