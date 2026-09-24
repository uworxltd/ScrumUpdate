/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonProperty;
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
import org.springframework.util.ObjectUtils;
import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;

import java.io.Serializable;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class User implements Serializable
{
  private Long id;
  @Getter(AccessLevel.NONE)
  @Setter(AccessLevel.NONE)
  private String username;
  @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
  private String password;
  @Getter(AccessLevel.NONE)
  @Setter(AccessLevel.NONE)
  private String email;
  private String currentMenuCode;
  private Member member;
  private Set<Team> teams;
  private String activationCode;
  private boolean userAgreement;
  private boolean privacyPolicy;
  private Instant createdAt;
  private OffsetDateTime updatedAt;
  private List<UserStatus> userStatuses;
  private String accountId;
  private String accessLevel;
  private String emailWorkLog;
  private Boolean isFirstTenantAdmin;
  private String avatarURL;
  private UserProfileImage userProfileImage;
  private boolean activeInSourceSystem;
  private EmailFrequency emailFrequency;
  private TenantDetails tenantId;
  private String status;
  private String lastSeen;

  public User(InstanceUser instanceUser)
  {
    String[] userNames = instanceUser.getFullName().split(" ", 2);
    this.id = instanceUser.getId();
    this.accountId = instanceUser.getAccountId();
    this.avatarURL = instanceUser.getAvatarUrl();
    this.email = instanceUser.getEmail();
    this.status = instanceUser.getStatus();
    this.accessLevel = instanceUser.getAccessLevel().getLevelCode();
    Member member = new Member();
    member.setId(instanceUser.getId());
    member.setFullName(instanceUser.getFullName());
    member.setFirstName(userNames[0]);
    member.setMemberEmail(instanceUser.getEmail());
    member.setAccountId(instanceUser.getAccountId());
    member.setLastName(userNames.length > 1 ? userNames[1] : "");
    Role role = new Role();
    role.setId(instanceUser.getRole().getId());
    role.setName(instanceUser.getRole().getName());
    role.setCode(instanceUser.getRole().getCode());
    member.setRole(role);
    this.setMember(member);
    this.lastSeen = ObjectUtils.isEmpty(instanceUser.getLastSeen()) ? null : instanceUser.getLastSeen().toString();
  }

  /**
   * This method will update email, username and member email of User
   *
   * @param email
   */
  public void setUserEmailAndUsername(String email)
  {
    setEmail(email);
    setUsername(email);
    getMember().setMemberEmail(email);
  }

  public @Email(message = "{user.email.validFormat}") @NotNull(message = "{user.email.notBlank}") String getEmail()
  {
    return email == null ? null : email;
  }

  public void setEmail(@Email(message = "{user.email.validFormat}") @NotNull(message = "{user.email.notBlank}") String email)
  {
    this.email = email == null ? null : email;
  }

  public @NotBlank(message = "{user.userName.notBlank}") String getUsername()
  {
    return username == null ? null : username;
  }

  public void setUsername(@NotBlank(message = "{user.userName.notBlank}") String username)
  {
    this.username = username == null ? null : username;
  }
}
