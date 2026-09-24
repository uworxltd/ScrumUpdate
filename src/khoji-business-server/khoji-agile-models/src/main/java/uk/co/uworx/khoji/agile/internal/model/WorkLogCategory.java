/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import java.util.List;

public class WorkLogCategory
{
  private String name;
  private List<String> includedIssueTypes;
  private int order;

  public WorkLogCategory(String name, List<String> includedIssueTypes)
  {
    this.name = name;
    this.includedIssueTypes = includedIssueTypes;
  }

  public String getName()
  {
    return name;
  }

  public void setName(final String name)
  {
    this.name = name;
  }

  public List<String> getIncludedIssueTypes()
  {
    return includedIssueTypes;
  }

  public void setIncludedIssueTypes(final List<String> includedIssueTypes)
  {
    this.includedIssueTypes = includedIssueTypes;
  }

  public int getOrder()
  {
    return order;
  }

  public void setOrder(final int order)
  {
    this.order = order;
  }
}
