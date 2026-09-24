/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonView;
import jakarta.persistence.Cacheable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import java.io.Serializable;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Getter
@Setter
@Cacheable
public class Team implements Serializable
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  @JsonView({Views.Team.class, Views.TeamsOfUser.class})
  private Long id;

  @NotBlank(message = "{team.name.notBlank}")
  @JsonView({Views.Team.class, Views.TeamsOfUser.class})
  private String teamName;

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(name = "teams_members")
  @JsonView({Views.Team.class, Views.TeamsOfUser.class})
  private Set<Member> member = new HashSet<>();

  @Transient
  @JsonView({Views.Team.class, Views.TeamsOfUser.class})
  private Set<Member> supervisorsMembers;

  @ManyToMany(fetch = FetchType.LAZY)
  @JsonView({Views.Team.class, Views.TeamsOfUser.class})
  private Set<TeamBoard> boards = new HashSet<>();

  @OneToOne
  @JoinColumn(name = "locnId")
//  @NotNull(message = "{team.owningOrganization.notBlank}")
  @JsonView(Views.Team.class)
  private Location location;

  @OneToOne
  @JoinColumn(name = "tenant_id")
  private TenantDetails tenantId;

  public Team()
  {
  }

  public Team(Long id, String teamName, Set<Member> member)
  {
    this.id = id;
    this.teamName = teamName;
    this.member = member;
  }

  public Team(Long id, String teamName, Set<Member> member, Set<Member> supervisorsMembers)
  {
    this.id = id;
    this.teamName = teamName;
    this.member = member;
    this.supervisorsMembers = supervisorsMembers;
  }

  @Override
  public boolean equals(Object obj)
  {
    boolean isEqual = false;

    if (obj != null && obj instanceof Team)
    {
      if (getTeamName().equalsIgnoreCase(((Team) obj).getTeamName()))
      {
        return true;
      }
      else
      {
        return false;
      }
    }

    return isEqual;
  }

  @Override
  public int hashCode()
  {
    return Objects.hash(teamName);
  }

  public String getStatus()
  {
    boolean active = this.boards.stream().anyMatch(teamBoard -> teamBoard.getStatus().equals(KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus()));
    return active ? KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus() : KhojiDropdownStatus.CLOSED.getKhojiDropdownStatus();
  }

  public Location getLocation()
  {
    return location;
  }

  public void setLocation(Location location)
  {
    this.location = location;
  }
}
