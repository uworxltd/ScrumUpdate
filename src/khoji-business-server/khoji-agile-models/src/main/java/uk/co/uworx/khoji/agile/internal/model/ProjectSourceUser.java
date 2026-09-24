/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;


import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Project Source user model
 */
@Data
@NoArgsConstructor
public class ProjectSourceUser
{
  private String name;
  private String firstName;
  private String lastName;
  private String avatarURL;
  private String email;
  private String accountId;
  private String eventType;
  private Boolean sourceStatus;
  @NotNull
  private Role userRole;
  private String locationId;
  private KhojiUserStatus userStatus;
  private String accessLevel;

  public ProjectSourceUser(
          final String name,
                           final String firstName,
                           final String lastName,
                           final String avatarURL,
                           final String email,
                           final String accountId,
                           final Role userRole,
                           final String locationId,
                           final KhojiUserStatus userStatus,
                           final String accessLevelCode
  )
  {
    this.name = name;
    this.firstName = firstName;
    this.lastName = lastName;
    this.avatarURL = avatarURL;
    this.email = email;
    this.accountId = accountId;
    this.userRole = userRole;
    this.locationId = locationId;
    this.userStatus = userStatus;
    this.accessLevel = accessLevelCode;
  }
}
