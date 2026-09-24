/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonView;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.springframework.util.StringUtils;
import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import java.io.Serializable;
import java.time.LocalDate;

@Getter
@Setter
@ToString
public class TeamBoard implements Serializable
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  @JsonView({Views.BoardsInTeam.class, Views.TeamsOfUser.class})
  private long id;

  @NotBlank(message = "{board.boardId.notBlank}")
  @JsonView(Views.BoardsInTeam.class)
  private String boardID;

  @NotBlank(message = "{board.boardName.notBlank}")
  @JsonView(Views.BoardsInTeam.class)
  private String boardName;

  private String teamBoardIdentifier;

  @Enumerated(EnumType.STRING)
  private TeamBoardDataSource teamBoardDataSource;

  @NotBlank
  @JsonView(Views.Board.class)
  private String type;

  @JsonFormat(pattern = "dd-MM-yyyy")
  private LocalDate dateStarted;

  @JsonFormat(pattern = "dd-MM-yyyy")
  private LocalDate dateDissolved;

  @ManyToOne
  @JsonView(Views.Board.class)
  private Project project;

  @OneToOne
  @JoinColumn(name = "tenant_id")
  private TenantDetails tenantId;

  public String getType()
  {
    return StringUtils.hasLength(type) ? type.toUpperCase() : type;
  }

  public String getStatus()
  {
    if (dateStarted != null && dateDissolved == null)
    {
      return KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus();
    }
    if (dateStarted != null && dateDissolved != null)
    {
      LocalDate currentDate = LocalDate.now();
      return currentDate.isBefore(dateDissolved) ? KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus() : KhojiDropdownStatus.CLOSED.getKhojiDropdownStatus();
    }

    return KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus();
  }

  @Override
  public boolean equals(final Object o)
  {
    if (this == o)
    {
      return true;
    }
    if (o == null || getClass() != o.getClass())
    {
      return false;
    }

    final TeamBoard teamBoard = (TeamBoard) o;
    final String boardId = getBoardID();

    if (teamBoard != null && boardId != null && !boardId.equals(teamBoard.getBoardID()))
    {
      return false;
    }
    return getProject() != null ? getProject().getProjectID().equals(teamBoard.getProject().projectID) : teamBoard.getProject() == null;
  }

  @Override
  public int hashCode()
  {
    int result = getBoardID().hashCode();
    result = 31 * result + (getProject() != null ? getProject().getProjectID().hashCode() : 0);
    return result;
  }
}
