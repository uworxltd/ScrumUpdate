/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.response.Member;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TeamWorkLog implements Serializable
{
  private String teamName;
  private ArrayList<Member> members = new ArrayList<>();
  private double percentage;
  private String thresholdColor;
  private List<String> othersDistrMeta = new ArrayList<>();
  HashMap<String,Double> totalsPercentages = new HashMap<>();
  HashMap<String, Double> totalsDays = new HashMap<>();
  private List<String> columnsNames;
  private double totalAvailableDays;

  /**
   * returns member in reference to the email
   * @param email of the member
   * @return the member
   */
  public Member getMember(String email)
  {
    email = email.toLowerCase();
    for (Member member : members)
    {
      if (member.getEmail().toLowerCase().equals(email))
      {
        return member;
      }
    }
    return null;
  }

  public uk.co.uworx.khoji.agile.response.Member getMemberByAccountId(String accountId)
  {
    for (uk.co.uworx.khoji.agile.response.Member member : members)
    {
      if (accountId.equals(member.getAccountId()))
      {
        return member;
      }
    }
    return null;
  }
}
