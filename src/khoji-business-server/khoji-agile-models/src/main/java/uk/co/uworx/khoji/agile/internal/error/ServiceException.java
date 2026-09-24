/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.error;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.HttpStatus;
import org.zalando.problem.AbstractThrowableProblem;
import org.zalando.problem.Status;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@JsonInclude(Include.NON_NULL)
@JsonIgnoreProperties({"instance", "type", "parameters", "stackTrace", "suppressed", "localizedMessage", "message"})
public class ServiceException extends AbstractThrowableProblem
{

  @JsonProperty("response_code")
  private String responseCode;

  @JsonProperty("response_type")
  private String responseType;

  @JsonProperty("field_errors")
  private List<FieldError> fieldErrors = null;

  /**
   * Private so that codes cannot be arbitrarily set.
   */
  private ServiceException(String code, String message, HttpStatus httpStatus, String responseType, Throwable cause)
  {
    super(null, null, Status.valueOf(httpStatus.value()), message);
    this.responseCode = code;
    this.responseType = responseType;
  }

  public ServiceException(ServiceError error)
  {
    this(error.name(), error.getMessage(), error.getHttpStatus(), error.getResponseType(), null);
  }

  public ServiceException(ServiceError error, Throwable throwable)
  {
    this(error.name(), error.getMessage(), error.getHttpStatus(), error.getResponseType(), throwable);
  }

  public ServiceException(ServiceError error, String message)
  {
    this(error.name(), message, error.getHttpStatus(), error.getResponseType(), null);
  }

  public ServiceException(ServiceError error, String message, Throwable cause)
  {
    this(error.name(), message, error.getHttpStatus(), error.getResponseType(), cause);
  }

  public ServiceException(ServiceError error, String message, HttpStatus status, Throwable cause)
  {
    this(error.name(), message, status, error.getResponseType(), cause);
  }

  public String getResponseCode()
  {
    return responseCode;
  }

  public void setResponseCode(String responseCode)
  {
    this.responseCode = responseCode;
  }

  public List<FieldError> getFieldErrors()
  {
    if (fieldErrors != null && !fieldErrors.isEmpty())
    {
      return Collections.unmodifiableList(fieldErrors);
    }
    return null;
  }

  public ServiceException addFieldErrorsItem(FieldError fieldErrorsItem)
  {

    if (this.fieldErrors == null)
    {
      this.fieldErrors = new ArrayList<>();
    }
    this.fieldErrors.add(fieldErrorsItem);
    return this;
  }

}
