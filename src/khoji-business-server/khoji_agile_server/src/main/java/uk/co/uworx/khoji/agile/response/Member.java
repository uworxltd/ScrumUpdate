/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.internal.model.WorkLogDistribution;

import java.io.Serializable;
import java.util.Objects;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Member implements Serializable
{
  private String name;
  private String email;
  private double totalWorkLog;
  private double totalWorkLogInDays;
  private double percentage;
  private String thresholdColor;
  private WorkLogDistribution workLogDistribution;
  private boolean inMultipleTeams = false;
  private double othersPercentage;
  private String accountId;
  private double totalAvailableDays;


  /**
   * returns total work log in hours
   * @return worklog in hours
   */
  public double getTotalWorkLogInHours()
  {
    return totalWorkLog / 60;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    Member member = (Member) o;
    return Objects.equals(accountId, member.accountId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(accountId);
  }
}
