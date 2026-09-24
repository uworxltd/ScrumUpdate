// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using Microsoft.Extensions.Logging;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Integration)]
class GatewayTests
{
    string connectionString = "Server=localhost;Port=5432;Username=khoji-admin;Password=khoji;Database=khoji-admin";
    NUnitLogger<GatewayTests> logger = new();

    [Test]
    public void GetDailyWorklogsOfTheTeamTest()
    {
        var email = "test-user@scrumupdate.local";
        int instanceId = 2751;

        var kbsG = new KbsGateway(logger, connectionString);
        var kssG = new KssGateway(logger, connectionString, instanceId);

        var teams = kbsG.GetUserTeams(instanceId, email);
        Assert.That(teams.Count, Is.EqualTo(1));

        foreach (var member in kbsG.GetTeamMembers(teams.First().teamId).Where(m => m.name == "Change Me"))
        {
            logger.LogInformation($"Fetching worklogs of {member}");
            (var date, var data) = kssG.GetDailyWorklogsOfThisWeek(member.accountId, out string errorOrMessage);
            Assert.That(date, Is.Not.Default);
            Assert.That(data, Is.Not.Null);
        }
    }
}
