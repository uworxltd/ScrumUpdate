/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonView;
import jakarta.persistence.Cacheable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.apache.commons.lang3.StringUtils;
import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import java.io.Serializable;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;



@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
@Cacheable
public class Member implements Serializable
{
  @Id
  @JsonView({Views.User.class, Views.Team.class, Views.TeamsOfUser.class})
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  private Long id;

  @Transient
  @JsonView({Views.BasicUser.class, Views.Team.class, Views.UserInTeam.class, Views.TeamsOfUser.class})
  private String fullName;

  @Transient
  @JsonView({Views.BasicUser.class, Views.Team.class, Views.UserInTeam.class, Views.TeamsOfUser.class})
  private boolean isInMultipleTeams;

  @NotBlank(message = "{member.firstName.notBlank}")
  @JsonView(Views.UserProfileView.class)
  private String firstName;

  @NotBlank(message = "{member.lastName.notBlank}")
  @JsonView(Views.UserProfileView.class)
  private String lastName;

  private String middleName;

  @JsonView({Views.UserInTeam.class, Views.TeamsOfUser.class, Views.Team.class})
  @Getter(AccessLevel.NONE)
  @Setter(AccessLevel.NONE)
  private String memberEmail;

  @JsonView({Views.BasicUser.class, Views.Team.class})
  private String accountId;

  @OneToOne
  @NotNull(message = "{member.memberRole.notBlank}")
  @JsonView(Views.User.class)
  private Role role;

  @NotNull(message = "{member.isKhojiUser.notNull}")
  private boolean iskhojiUser;

  @OneToOne
  @JoinColumn(name = "tenant_id")
  private TenantDetails tenantId;

  @OneToOne
  @JoinColumn(name = "locnId")
//  @NotNull(message = "{member.owningOrganization.notBlank}")
  @JsonView(Views.UserSummary.class)
  private Location location;

  @Transient
  private List<UserStatus> userStatuses;

  public String getFullName()
  {
    return StringUtils.isNotEmpty(this.fullName) ? this.fullName : Stream.of(firstName, middleName, lastName)
            .filter(x -> StringUtils.isNotEmpty(x))
            .collect(Collectors.joining(" "));
  }

  public void setMemberEmail(@Email(message = "{member.email.validFormat}") String memberEmail)
  {
    if (StringUtils.isNotEmpty(memberEmail) && StringUtils.isNotBlank(memberEmail))
    {
      this.memberEmail = StringUtils.trim(memberEmail);
    }
    else
    {
      this.memberEmail = null;
    }
  }

  public String getMemberEmail()
  {
    return memberEmail == null ? null : memberEmail;
  }

  public void setAccountId(String accountId)
  {
    if (StringUtils.isNotEmpty(accountId) && StringUtils.isNotBlank(accountId))
    {
      this.accountId = StringUtils.trim(accountId);
    }
    else
    {
      this.accountId = null;
    }
  }

  public void setIsInMultipleTeams(boolean isInMultipleTeams)
  {
    this.isInMultipleTeams = isInMultipleTeams;
  }

  @Override
  public int hashCode()
  {
    return Objects.hash(memberEmail);
  }

  @Override
  public boolean equals(Object obj)
  {
    boolean isEqual = false;

    if (obj != null && obj instanceof Member)
    {
      if (StringUtils.isNotEmpty(getMemberEmail()))
      {
        if (getMemberEmail().equalsIgnoreCase(((Member) obj).getMemberEmail()))
        {
          return true;
        }
      }
      else
      {
        if (StringUtils.isNotEmpty(getAccountId()) && getAccountId().equalsIgnoreCase(((Member) obj).getAccountId()))
        {
          return true;
        }
      }
    }

    return isEqual;
  }

  @Override
  public String toString()
  {
    return "Member{" +
            "id=" + id +
            ", fullName='" + getFullName() + '\'' +
            ", firstName='" + firstName + '\'' +
            ", lastName='" + lastName + '\'' +
            ", middleName='" + middleName + '\'' +
            ", memberEmail='" + memberEmail + '\'' +
            ", accountId='" + accountId + '\'' +
            ", memberRole='" + role + '\'' +
            ", isInMultipleTeams=" + isInMultipleTeams + '\''+
             ", iskhojiUser=" + iskhojiUser +
            '}';
  }
}
