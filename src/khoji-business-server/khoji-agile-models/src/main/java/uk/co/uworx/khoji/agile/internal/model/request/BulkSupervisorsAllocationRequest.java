/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model.request;

import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Set;

@Getter
@Setter
public class BulkSupervisorsAllocationRequest
{
  @NotNull
  private List<Long> teamIds;
  private Set<Long> assignedSupervisorsIds;
  private Set<Long> unassignedSupervisorsIds;
}
