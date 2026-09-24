/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.error;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.HttpStatus;
import org.zalando.problem.AbstractThrowableProblem;
import org.zalando.problem.Status;

import java.io.Serializable;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties({"instance", "type", "parameters", "stackTrace", "suppressed", "localizedMessage", "message"})
public class BusinessException extends AbstractThrowableProblem implements Serializable
{

  @JsonProperty("response_code")
  private String responseCode;

  @JsonProperty("response_type")
  private String responseType;


  /**
   * Private so that codes cannot be arbitrarily set.
   */
  private BusinessException(String code, String message, HttpStatus httpStatus, String responseType, Throwable cause)
  {
    super(null, null, Status.valueOf(httpStatus.value()), message);
    this.responseCode = code;
    this.responseType = responseType;
  }

  public BusinessException(BusinessError error)
  {
    this(error.name(), error.getMessage(), error.getHttpStatus(), error.getResponseType(), null);
  }

  public BusinessException()
  {

  }

}

