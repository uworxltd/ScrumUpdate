/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.stats.provider.jira.exception;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.util.ObjectUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;

import java.util.Map;

@Getter
public class SourceSystemServiceException extends RuntimeException
{
  private final Exception exception;
  private final SourceSystem systemCode;

  public SourceSystemServiceException(Exception exception, SourceSystem systemCode)
  {
    super(exception);
    this.exception = exception;
    this.systemCode = systemCode;
  }

  /**
   * Check if exception is due to connectivity problem
   *
   * @return boolean
   */
  public boolean isConnectionException()
  {
    boolean value = false;
    if (exception != null)
    {
      if (exception instanceof ResourceAccessException)
      {
        value = true;
      }
      else if (exception instanceof HttpClientErrorException)
      {
        HttpStatus statusCode = HttpStatus.valueOf(((HttpClientErrorException) exception).getStatusCode().value());
        if (statusCode.equals(HttpStatus.SERVICE_UNAVAILABLE) || statusCode.equals(HttpStatus.GATEWAY_TIMEOUT)
                || statusCode.equals(HttpStatus.BAD_GATEWAY) || statusCode.equals(HttpStatus.NOT_FOUND))
        {
          value = true;
        }
      }
    }
    return value;
  }

  public boolean isUnauthorizedException()
  {
    if (!ObjectUtils.isEmpty(exception))
    {
      return exception instanceof HttpClientErrorException.Unauthorized;
    }

    return false;
  }

  public boolean isForbiddenRequestException(String message) {
    if (!ObjectUtils.isEmpty(exception))
    {
      if (exception instanceof HttpClientErrorException.Forbidden httpClientErrorException)
      {
        try
        {
          ObjectMapper objectMapper = new ObjectMapper();
          Map<String, String> responseMap = objectMapper.readValue(
                  httpClientErrorException.getResponseBodyAsString(),
                  Map.class
          );

          return message.equalsIgnoreCase(responseMap.get("message"));
        }
        catch (JsonProcessingException e)
        {
          return false;
        }
      }

      if (exception instanceof ServiceException serviceException)
      {
        return serviceException.getResponseCode().equals(ServiceError.AR404.name());
      }
    }
    return false;
  }

  public boolean isForbiddenRequestException() {
    if (!ObjectUtils.isEmpty(exception))
    {
      if (exception instanceof HttpClientErrorException.Forbidden)
      {
        return true;
      }

      if (exception instanceof ServiceException serviceException)
      {
        return serviceException.getResponseCode().equals(ServiceError.AR404.name());
      }
    }
    return false;
  }

  @Getter
  public enum SourceSystem
  {
    JIRA("Jira"),
    CONFLUENCE("Confluence");

    private final String systemName;

    SourceSystem(String systemName)
    {
      this.systemName = systemName;
    }
  }
}
