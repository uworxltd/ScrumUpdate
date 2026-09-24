/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model.request;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Data client request model
 */
@Data
@AllArgsConstructor
public class DataClientRequest
{
  private String JQL;
  private Object request;
  private DataClientRequestType requestType;
  private boolean issueDeepScanning;

  /**
   * Constructor to initialize args
   *
   * @param JQL         to set
   * @param request     to set
   * @param requestType to set
   */
  public DataClientRequest(final String JQL, final Object request, final DataClientRequestType requestType)
  {
    this.JQL = JQL;
    this.request = request;
    this.requestType = requestType;
  }
}
