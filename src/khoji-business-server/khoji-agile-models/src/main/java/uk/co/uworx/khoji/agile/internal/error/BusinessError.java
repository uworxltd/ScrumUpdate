/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.error;

import org.springframework.http.HttpStatus;

public enum BusinessError
{

  //BurnUp chart Missing start or end date error
  BUCD0404("Missing Start Date and End Date.", HttpStatus.NO_CONTENT, ResponseType.INFO);

  private String message;
  private HttpStatus httpStatus;
  private String responseType;

  BusinessError(String message, HttpStatus httpStatus, String responseType)
  {
    this.message = message;
    this.httpStatus = httpStatus;
    this.responseType = responseType;
  }

  public String getMessage()
  {
    return message;
  }

  public HttpStatus getHttpStatus()
  {
    return this.httpStatus;
  }

  public String getResponseType()
  {
    return responseType;
  }

  @Override
  public String toString()
  {
    return getMessage();
  }

  private static class ResponseType
  {
    private static final String ERROR = "error";
    private static final String WARNING = "warning";
    private static final String INFO = "info";
  }
}

