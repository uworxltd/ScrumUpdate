/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.helper.WorkLogHourConfigService;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.request.WorkLogRequest;

import java.text.DecimalFormat;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

@Component
public class TimeService
{
  @Autowired
  WorkLogHourConfigService workLogHourConfigService;
  @Autowired
  private ConfigDataService configDataService;

  public double getNumberOfWorkingDays(WorkLogRequest workLogRequestParam)
  {
    LocalDate startDate = LocalDate.parse(workLogRequestParam.getDateFrom());
    LocalDate endDate = LocalDate.parse(workLogRequestParam.getDateTo());

    EnumSet<DayOfWeek> weekend = EnumSet.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
    List<LocalDate> list = new ArrayList<>();

    LocalDate start = startDate;
    while (start.isBefore(endDate) || start.isEqual(endDate))
    {
      list.add(start);
      start = start.plus(1, ChronoUnit.DAYS);
    }

    boolean weekendStatsInclusion = configDataService.IsWeekendStatsInclusionEnabled(null);

    return list
            .stream()
            // if weekend stats inclusion is enabled, show all, else filter weekends
            .filter(d -> weekendStatsInclusion || !weekend.contains(d.getDayOfWeek()))
            .count();
  }

  public double getNumberOfWorkingDaysExcludingFutureDate(WorkLogRequest workLogRequestParam, String timeZone) {
    LocalDate startDate = LocalDate.parse(workLogRequestParam.getDateFrom());
    LocalDate endDate = LocalDate.parse(workLogRequestParam.getDateTo());

    ZonedDateTime now = ZonedDateTime.now(ZoneId.of(timeZone));
    LocalDate currentDate = now.toLocalDate();

    if (currentDate.isAfter(startDate) && currentDate.isBefore(endDate)) {
      endDate = currentDate;
    } else if (currentDate.isEqual(endDate) || currentDate.isEqual(startDate)) {
      endDate = currentDate;
    }

    EnumSet<DayOfWeek> weekend = EnumSet.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);

    List<LocalDate> list = new ArrayList<>();
    LocalDate start = startDate;
    while (!start.isAfter(endDate)) {
      list.add(start);
      start = start.plus(1, ChronoUnit.DAYS);
    }
    boolean weekendStatsInclusion = configDataService.IsWeekendStatsInclusionEnabled(null);

    return list
            .stream()
            // if weekend stats inclusion is enabled, show all, else filter weekends
            .filter(d -> weekendStatsInclusion || !weekend.contains(d.getDayOfWeek()))
            .count();
  }


  /**
   * Returns the time spent in days from hours
   *
   * @param spentInHours the time spent in hours
   * @return the days spent
   */
  public double getTimeInDays(double spentInHours)
  {
    return spentInHours / workLogHourConfigService.getConfigValueByTenantId();
  }

  public String incrementDateByOne(String dateString) {
    try {
      // Parse the date string into a LocalDate
      LocalDate date = LocalDate.parse(dateString);

      // Increment the date by one day
      LocalDate incrementedDate = date.plusDays(1);

      // Format the incremented date back to a string
      return incrementedDate.toString(); // Returns in ISO format (yyyy-MM-dd)
    } catch (DateTimeParseException e) {
      System.err.println("Invalid date format: " + e.getMessage());
      return null; // Handle invalid format appropriately
    }
  }

  public boolean isOlderThan(Instant instant, int days) {
    Instant now = Instant.now();

    // Calculate the threshold instant
    Instant threshold = now.minus(days, ChronoUnit.DAYS);

    // Check if the provided instant is before the threshold
    return instant.isBefore(threshold);
  }
}
