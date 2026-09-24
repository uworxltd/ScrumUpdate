// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Extensions;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Unit)]
class DateTimeTests
{
    [Test]
    public void ToWeekDateRangeStringsTest()
    {
        var today = DateTime.UtcNow;
        var data = today.ToWeekDateRangeStrings();

        Assert.That(data, Has.Length.EqualTo(2));
    }
}
