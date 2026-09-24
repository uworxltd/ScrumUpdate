/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonView;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import jakarta.persistence.Cacheable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * The Role class stores all the information of roles
 */
@Getter
@Setter
@ToString
@RequiredArgsConstructor
@Cacheable
public class Role
{
  @JsonView(Views.User.class)
  @NotNull
  private Long id;
  @JsonView(Views.UserSummary.class)
  private String code;
  @Size(min = 2, max = 20, message = "{role.name.maxLimit}")
  @JsonView(Views.User.class)
  private String name;
  private String description;
}
