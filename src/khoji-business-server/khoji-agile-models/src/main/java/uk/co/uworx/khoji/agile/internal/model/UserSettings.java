/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonView;
import lombok.Getter;
import lombok.Setter;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import jakarta.persistence.Cacheable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;

import java.io.Serializable;

@Getter
@Setter
@Cacheable
public class UserSettings implements Serializable
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  @JsonView(Views.UserProfileView.class)
  private Long id;

  @JsonView(Views.UserProfileView.class)
  private boolean emailWorkLog;
  private boolean admin;
  private boolean allowTeamManagement;
  private boolean allowAllocationManagement;

  @JsonView(Views.UserProfileView.class)
  private EmailFrequency emailFrequency;

  @OneToOne
  @JsonView(Views.UserProfileView.class)
  private User user;
  @OneToOne
  @JsonView(Views.UserProfileView.class)
  private AccessLevel accessLevel;
}
