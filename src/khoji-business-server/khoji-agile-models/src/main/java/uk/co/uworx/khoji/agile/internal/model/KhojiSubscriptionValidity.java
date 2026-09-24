/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class KhojiSubscriptionValidity
{
  private boolean allowLogin;
  private boolean trialPeriod;
  private String subscriptionStatus;
  private String lastDayStatusSynced;
  private LocalDateTime subscriptionStartDate;
  private LocalDateTime subscriptionNextBillingDate;
  private boolean isPaymentMethodAdded;
}
