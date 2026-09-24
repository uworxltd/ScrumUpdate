/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */



package uk.co.uworx.khoji.agile.service;

import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * This class provides helper methods for cron expressions
 */
@Service
@Log4j2
public class CronHelperService
{
  /**
   * This method will parse and returns the frequency at which the cron expression will be executed
   *
   * @param expression - cron expression to parse
   * @return interval in hours
   */
  public String parseCronExpressionInHours(String expression)
  {
    if (!CronExpression.isValidExpression(expression))
    {
      log.error("Invalid cron expression on parsing: {}", expression);
      throw new ServiceException(ServiceError.CE101);
    }
    CronExpression cronExpression = CronExpression.parse(expression);
    LocalDateTime nextExecution = cronExpression.next(LocalDateTime.now());
    LocalDateTime nextToNextExecution = cronExpression.next(nextExecution);
    Duration durationBetweenExecutions = Duration.between(
            nextExecution, nextToNextExecution
    );
    float durationWithFloats = durationBetweenExecutions.toMinutes() / 60.0f;
    return Float.toString(durationWithFloats);
  }

}
