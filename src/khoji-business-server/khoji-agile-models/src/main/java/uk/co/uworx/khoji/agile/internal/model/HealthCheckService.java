/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HealthCheckService
{
  private String dateTime;
  private String name;
  private String status;
  private HttpStatus httpStatusCode;
  private List<HealthCheckService> subServices;
  private Number uptime;

  public HealthCheckService(String serviceKey)
  {
    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    this.dateTime = dateFormat.format(new Date());
    this.name = serviceKey;
    this.subServices = new ArrayList<>();
    this.uptime = null;
    this.status = "true";
    this.httpStatusCode = HttpStatus.OK;
  }
}
