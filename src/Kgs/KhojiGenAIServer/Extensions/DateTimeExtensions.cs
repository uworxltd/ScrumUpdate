// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Extensions;

static class DateTimeExtensions
{
    public static string ToHoursAndMinutes(this TimeSpan timeSpan) =>
        $"{(int)timeSpan.TotalHours}:{timeSpan.Minutes:D2}";

    public static TimeSpan ElapsedTime(this DateTime dateTime) =>
        DateTime.Now - dateTime;

    //aka Yoda Date String
    public static string ToIsoDateString(this DateTime date) =>
        date.ToString("yyyy-MM-dd");

    public static DateTime LastWorkingDay(this DateTime today) =>
        today.DayOfWeek == DayOfWeek.Monday
        ? today.AddDays(-3) // jump back to Friday
        : today.AddDays(-1);

    public static bool IsWeekend(this DateTime date) =>
        date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday;

    public static DateTime GetWeekday(this DateTime date, DayOfWeek dayOfWeek)
    {
        int diff = (7 + (dayOfWeek - date.DayOfWeek)) % 7;
        return date.AddDays(diff).Date;
    }

    public static DateTime StartOfWeek(this DateTime date, DayOfWeek startOfWeek = DayOfWeek.Monday)
    {
        int diff = (7 + (date.DayOfWeek - startOfWeek)) % 7;
        return date.AddDays(-diff).Date;
    }

    //public static DateTime EndOfWorkWeek(this DateTime date) =>
    //    date.StartOfWeek().AddDays(4); // Monday + 4 = Friday

    public static DateTime EndOfWeek(this DateTime date) =>
        date.StartOfWeek().AddDays(6); // Monday + 6 = Sunday

    public static string[] ToWeekDateRangeStrings(this DateTime today)
    {
        var monday = today.AddDays(-(int)today.DayOfWeek + (int)DayOfWeek.Monday);

        // Special case: if today is Sunday, shift back 6 days
        if (today.DayOfWeek == DayOfWeek.Sunday)
            monday = today.AddDays(-6);

        var sunday = monday.AddDays(6);

        return [ToIsoDateString(monday), ToIsoDateString(sunday)];
    }

    public static DateTime ChangeUserSpecifiedTimeZoneTimeToUTC(this DateTime dateTime, string timeZoneId, string userTime)
    {
        if (!TimeSpan.TryParse(userTime, out var userTimeOfDay))
        {
            throw new ArgumentException("Invalid time format");
        }

        // Build a DateTime (today’s date + time) with Kind = Unspecified
        DateTime localUnspecified = new DateTime(
            DateTime.Today.Year,
            DateTime.Today.Month,
            DateTime.Today.Day,
            userTimeOfDay.Hours,
            userTimeOfDay.Minutes,
            0,
            DateTimeKind.Unspecified);

        // Load the user’s timezone
        var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);

        // Convert to UTC
        return TimeZoneInfo.ConvertTimeToUtc(localUnspecified, tz);
    }

    public static bool IsInNextXMinutes(this DateTime dateTime, int xMinutes)
    {
        var timeNow = DateTime.UtcNow;
        return dateTime >= timeNow && dateTime <= timeNow.AddMinutes(xMinutes);
    }
}
