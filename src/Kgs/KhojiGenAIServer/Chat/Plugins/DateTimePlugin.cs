// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using System.ComponentModel;
using Uworx.Khoji.Agile.AI;

namespace KhojiGenAIServer.Chat.Plugins;

class DateTimePlugin
{
    [ToolFunction("get_utc_date_time"), Description("Retrieves the current date time in UTC.")]
    public static string GetCurrentDateTimeInUtc()
    {
        return DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
    }

    //[KernelFunction, Description("Get the current date")]
    //public string Date(IFormatProvider formatProvider = null)
    //{
    //    // Example: Sunday, 12 January, 2025
    //    var date = DateTimeOffset.Now.ToString("D", formatProvider);
    //    return date;
    //}


    //[KernelFunction, Description("Get the current date")]
    //public string Today(IFormatProvider formatProvider = null) =>
    //    // Example: Sunday, 12 January, 2025
    //    Date(formatProvider);

    //[KernelFunction, Description("Get the current date and time in the local time zone")]
    //public string Now(IFormatProvider formatProvider = null) =>
    //    // Sunday, January 12, 2025 9:15 PM
    //    DateTimeOffset.Now.ToString("f", formatProvider);
}
