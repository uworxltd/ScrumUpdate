/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpStatusCodeException;

public class TargetSystemServiceException extends RuntimeException
{
  private HttpStatusCodeException exception;

  public TargetSystemServiceException(HttpStatusCodeException exception)
  {
    super(exception);
    this.exception = exception;
  }

  public boolean isConnectionException()
  {
    boolean value = false;
    if (this.exception != null)
    {
      HttpStatus statusCode = HttpStatus.valueOf(exception.getStatusCode().value());
      if (statusCode.equals(HttpStatus.SERVICE_UNAVAILABLE) || statusCode.equals(HttpStatus.GATEWAY_TIMEOUT) || statusCode.equals(HttpStatus.BAD_GATEWAY) || statusCode.equals(HttpStatus.NOT_FOUND))
      {
        value = true;
      }
    }

    return value;
  }

  public boolean isValidationException()
  {
    boolean value = false;
    if (this.exception != null)
    {
      HttpStatus statusCode = HttpStatus.valueOf(this.exception.getStatusCode().value());
      if (statusCode.equals(HttpStatus.BAD_REQUEST))
      {
        value = true;
      }
    }

    return value;
  }

  public boolean isServerException()
  {
    boolean value = false;
    if (this.exception != null)
    {
      HttpStatus statusCode = HttpStatus.valueOf(this.exception.getStatusCode().value());
      if (statusCode.equals(HttpStatus.INTERNAL_SERVER_ERROR))
      {
        value = true;
      }
    }

    return value;
  }

  public Exception getException()
  {
    return this.exception;
  }

  public HttpStatus getStatusCode()
  {
    return HttpStatus.valueOf(this.exception.getStatusCode().value());
  }

  public String getMessage()
  {
    return this.exception.getMessage();
  }

}
