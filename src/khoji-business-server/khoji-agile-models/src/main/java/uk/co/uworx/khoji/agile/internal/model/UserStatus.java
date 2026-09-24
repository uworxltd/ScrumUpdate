/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;


import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonView;
import jakarta.persistence.Cacheable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import java.io.Serializable;
import java.time.LocalDateTime;

@Cacheable
public class UserStatus implements Serializable
{
  private Long id;
  private KhojiUserStatus status;
  private User user;
  private LocalDateTime startDate;
  private LocalDateTime endDate;

  public Long getId()
  {
    return id;
  }

  public void setId(final Long id)
  {
    this.id = id;
  }

  public KhojiUserStatus getStatus()
  {
    return status;
  }

  public void setStatus(final KhojiUserStatus status)
  {
    this.status = status;
  }

  public User getUser()
  {
    return user;
  }

  public void setUser(final User user)
  {
    this.user = user;
  }

  public LocalDateTime getStartDate()
  {
    return startDate;
  }

  public void setStartDate(final LocalDateTime startDate)
  {
    this.startDate = startDate;
  }

  public LocalDateTime getEndDate()
  {
    return endDate;
  }

  public void setEndDate(final LocalDateTime endDate)
  {
    this.endDate = endDate;
  }
}
