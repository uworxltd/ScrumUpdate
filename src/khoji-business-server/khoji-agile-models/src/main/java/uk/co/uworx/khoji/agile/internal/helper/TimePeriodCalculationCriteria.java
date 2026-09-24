/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.helper;

public enum TimePeriodCalculationCriteria
{
  UNRELEASED_BOTH_DATES_MISSING("UNRELEASED_BOTH_DATES_MISSING"),
  UNRELEASED_START_DATE_MISSING("UNRELEASED_START_DATE_MISSING"),
  UNRELEASED_END_DATE_MISSING("UNRELEASED_END_DATE_MISSING"),
  RELEASED_BOTH_DATES_MISSING("RELEASED_BOTH_DATES_MISSING"),
  RELEASED_START_DATE_MISSING("RELEASED_START_DATE_MISSING"),
  RELEASED_END_DATE_MISSING("RELEASED_END_DATE_MISSING");

  private final String text;

  TimePeriodCalculationCriteria(final String text)
  {
    this.text = text;
  }

  public String getText()
  {
    return this.text;
  }
}
