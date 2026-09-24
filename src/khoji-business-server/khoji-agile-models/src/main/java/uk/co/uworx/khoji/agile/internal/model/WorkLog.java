/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder(toBuilder = true)
public class WorkLog
{
  private String issueSourceId;
  private String workLogId;
  private String issueId;
  private String started;
  private String created;
  private String updated;
  private String timeSpentSeconds;
  private String comment;
  private Author author;
}
