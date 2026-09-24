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

/**
 * Payment configuration for the platform.
 * Khoji Billing Processor (KBP) endpoint config has been removed; only
 * payment-site and user-sync/notification config that the platform consumes is retained.
 */
@Getter
@Component
public class PaymentSubscriptionConfig
{
  @Value("${chargebeePaymentSite:example}")
  private String paymentSite;

  @Value("#{${kbs.notifyAdminOnUserSync.map:{USER_CREATED:false,USER_UPDATED:false,USER_REVOKED:true}}}")
  public Map<String, Boolean> notifyAdminOnUserSyncMap = new HashMap<>();

  @Value("#{'${kbs.excludeUsersFromBillingCount:hello@scrumupdate.com,}'.split(',')}")
  public List<String> excludeUsersFromBillingCount;

  @Value("#{'${kbs.exclusionNotifyAdminEmailList:hello@scrumupdate.com,}'.split(',')}")
  public List<String> exclusionNotifyAdminEmailList;
}
