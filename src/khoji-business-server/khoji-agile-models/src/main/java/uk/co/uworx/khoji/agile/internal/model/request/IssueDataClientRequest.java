/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model.request;

import java.util.List;

public class IssueDataClientRequest
{
  private List<String> issueIds;
  private String tenantId;

  public IssueDataClientRequest(final List<String> issueIds, final String tenantId)
  {
    this.issueIds = issueIds;
    this.tenantId = tenantId;
  }

  public List<String> getIssueIds()
  {
    return issueIds;
  }

  public void setIssueIds(final List<String> issueIds)
  {
    this.issueIds = issueIds;
  }

  public String getTenantId()
  {
    return tenantId;
  }

  public void setTenantId(final String tenantId)
  {
    this.tenantId = tenantId;
  }
}
