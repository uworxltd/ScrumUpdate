/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Objects;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KhojiIssueType
{
  private String id;
  private String description;
  private String name;
  /**
   * Whether this issue type is used to create subtasks.
   */
  private Boolean subtask;
  /**
   * Hierarchy level of the issue type.
   */
  private int hierarchyLevel;

  private boolean recentlyUsed;

  @Override
  public boolean equals(Object o)
  {
    if (this == o)
    {
      return true;
    }
    if (o == null || getClass() != o.getClass())
    {
      return false;
    }
    KhojiIssueType that = (KhojiIssueType) o;
    return Objects.equals(id, that.id) && Objects.equals(name, that.name);
  }

  @Override
  public int hashCode()
  {
    return Objects.hash(id, name);
  }
}
