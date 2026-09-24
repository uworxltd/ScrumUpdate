/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public class WorkLogRequest
{
  @NotNull
  private List<String> teams;

  @NotNull
  private String dateFrom;

  @NotNull
  private String dateTo;

  private boolean stats = false;

  public WorkLogRequest(@JsonProperty("teams") List<String> teams, @JsonProperty("dateFrom") String dateFrom,
                        @JsonProperty("dateTo") String dateTo, @JsonProperty("stats") boolean stats)
  {
    this.teams = teams;
    this.dateFrom = dateFrom;
    this.dateTo = dateTo;
    this.stats = stats;
  }

  public List<String> getTeams()
  {
    return teams;
  }

  public String getDateFrom()
  {
    return dateFrom;
  }

  public String getDateTo()
  {
    return dateTo;
  }

  public boolean isStats()
  {
    return stats;
  }

  public void setStats(boolean stats)
  {
    this.stats = stats;
  }
}
