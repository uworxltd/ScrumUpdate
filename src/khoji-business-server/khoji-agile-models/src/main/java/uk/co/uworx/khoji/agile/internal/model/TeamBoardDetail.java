/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class TeamBoardDetail
{
  private String teamBoardName;
  private String teamBoardId;
  private String teamName;
  private String status;
  private LocalDate dateCreated;
  private LocalDate dateDesolved;
  private String boardType;

  @Override
  public String toString()
  {
    return "TeamBoardDetail{" +
            "teamBoardName='" + teamBoardName + '\'' +
            ", teamName='" + teamName + '\'' +
            ", status='" + status + '\'' +
            ", dateCreated='" + dateCreated + '\'' +
            ", dateDesolved='" + dateDesolved + '\'' +
            '}';
  }

}
