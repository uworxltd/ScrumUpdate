/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class IssueCount {
  private Double resolved;
  private Double inProgress;
  private Double open;
  private Double total;

  public IssueCount() {
    this.open = 0.0;
    this.inProgress = 0.0;
    this.resolved = 0.0;
    this.total = 0.0;
  }

  public void addToOpen(Double value)
  {
    this.open += value;
  }

  public void addToInProgress(Double value)
  {
    this.inProgress += value;
  }

  public void addToResolved(Double value)
  {
    this.resolved += value;
  }

  public void addToTotal(Double value)
  {
    this.total += value;
  }
}
