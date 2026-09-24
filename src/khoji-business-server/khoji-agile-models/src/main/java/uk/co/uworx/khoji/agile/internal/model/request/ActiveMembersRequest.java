
/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public class ActiveMembersRequest
{
  @NotNull
  private List<Long> teamIds;
  
  private String dateFrom;
  private String dateTo;

  public ActiveMembersRequest(final List<Long> teamIds, final String dateFrom, final String dateTo)
  {
    this.teamIds = teamIds;
    this.dateFrom = dateFrom;
    this.dateTo = dateTo;
  }

  public ActiveMembersRequest()
  {
  }

  public List<Long> getTeamIds()
  {
    return teamIds;
  }

  public void setTeamIds(final List<Long> teamIds)
  {
    this.teamIds = teamIds;
  }

  public String getDateFrom()
  {
    return dateFrom;
  }

  public void setDateFrom(final String dateFrom)
  {
    this.dateFrom = dateFrom;
  }

  public String getDateTo()
  {
    return dateTo;
  }

  public void setDateTo(final String dateTo)
  {
    this.dateTo = dateTo;
  }
}
