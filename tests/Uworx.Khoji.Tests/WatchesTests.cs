// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Abstractions;
using KhojiGenAIServer.DatabaseCollections;
using KhojiGenAIServer.Features.Watches;
using Microsoft.Extensions.Logging;
using static Uworx.Khoji.Tests.NUnitConstants;
using DescriptionAttribute = System.ComponentModel.DescriptionAttribute;

namespace Uworx.Khoji.Tests;

record Ticket(
    string TicketId,
    [property: Description("Story Point")] int StoryPoint,
    [property: Description("Status")] string Status,
    string AssignedTo // no Description attribute
);

[TestFixture, Category(TestCatory.Unit)]
class WatchesTests
{
    NUnitLogger<WatchesTests> logger = new();

    [Test]
    public void GetDifferenceTextTests()
    {
        var logAndAssert = (string diff) =>
        {
            logger.LogInformation(diff);
            Assert.That(diff, Has.Length.GreaterThan(0));
        };

        var old1 = new Ticket("T123", 3, "In Progress", "Khurram");
        var new1 = new Ticket("T123", 5, "Done", "Ahmad");
        logAndAssert(old1.GetDifferenceText(new1));

        var old2 = new Ticket("T123", 3, "To Do", null);
        var new2 = new Ticket("T123", 3, "In Progress", "Khurram");
        logAndAssert(old2.GetDifferenceText(new2));

        var old3 = new Ticket("T123", 3, "In Progress", "Khurram");
        var new3 = new Ticket("T123", 3, "Closed", null);
        logAndAssert(old3.GetDifferenceText(new3));
    }

    [Test]
    public void ToOrderedDictionaryTest()
    {
        var tickets = new[]
        {
            new Ticket("T200", 1, "To Do", "Ahmad"),
            new Ticket("T201", 2, "In Progress", "Khurram")
        };

        var dict = tickets.ToOrderedDictionary(t => t.TicketId);

        Assert.That(dict.Keys.First(), Is.EqualTo("T200"));
        Assert.That(dict.Keys.Last(), Is.EqualTo("T201"));
        Assert.That(dict["T201"].AssignedTo, Is.EqualTo("Khurram"));
    }

    [Test]
    public void DiffWithTests()
    {
        var diffs = new List<string>();

        var oldTickets = new[]
        {
            new Ticket("T100", 3, "To Do", "Ahmad"),
            new Ticket("T101", 5, "In Progress", "Khurram"),
            new Ticket("T102", 8, "Done", "Khurram"),
        }.ToOrderedDictionary(t => t.TicketId);

        var newTickets = new[]
        {
            new Ticket("T100", 3, "In Progress", "Ahmad"),      // status changed
            new Ticket("T101", 5, "In Progress", "Khurram"),    // no change
                                                                // T102 is missing
            new Ticket("T103", 2, "To Do", "Ahmad")             // new ticket
        };

        oldTickets.DiffWith(
            newTickets,
            keySelector: t => t.TicketId,
            onDifference: (key, ticket, diff) =>
            {
                logger.LogInformation($"[{key}] Changed: {diff}");
                diffs.Add(diff);
            });

        Assert.That(diffs, Is.Not.Empty);
        Assert.That(diffs.Any(d => d.Contains("Status changed")), "Should detect status update");
        Assert.That(diffs.Any(d => d.Contains("added")), "Should detect new ticket");
        Assert.That(diffs.Any(d => d.Contains("removed")), "Should detect removed ticket");
    }
}


[TestFixture, Category(TestCatory.Integration)]
class WatchesIntegrationTests
{
    string connectionString = "Server=localhost;Port=5432;Username=khoji-admin;Password=khoji;Database=khoji-admin";
    NUnitLogger<WatchesIntegrationTests> logger = new();

    [Test]
    public async Task DiffWithDatabaseTestsAsync()
    {
        var diffs = new List<string>();

        Action<string, string> onDifference = (key, diff) =>
        {
            logger.LogInformation($"[{key}] Changed: {diff}");
            diffs.Add(diff);
        };

        var trackableDictionary = new TrackableDictionary<Ticket>(this.logger, this.connectionString, 100, "Testing");
        trackableDictionary.OnAddition += v => onDifference(v.TicketId, $"{v.TicketId} added");
        trackableDictionary.OnRemoval += v => onDifference(v.TicketId, $"{v.TicketId} removed");
        trackableDictionary.OnDifference += (v, message) => onDifference(v.TicketId, message);

        var oldTickets = new[]
        {
            new Ticket("T100", 3, "To Do", "Ahmad"),
            new Ticket("T101", 5, "In Progress", "Khurram"),
            new Ticket("T102", 8, "Done", "Khurram"),
        };
        await trackableDictionary.ReplaceWithAsync(oldTickets, t => t.TicketId);

        var newTickets = new[]
        {
            new Ticket("T100", 3, "In Progress", "Ahmad"),      // status changed
            new Ticket("T101", 5, "In Progress", "Khurram"),    // no change
                                                                // T102 is missing
            new Ticket("T103", 2, "To Do", "Ahmad")             // new ticket
        };
        await trackableDictionary.ReplaceWithAsync(newTickets, t => t.TicketId);

        Assert.That(diffs, Is.Not.Empty);
        Assert.That(diffs.Any(d => d.Contains("Status changed")), "Should detect status update");
        Assert.That(diffs.Any(d => d.Contains("added")), "Should detect new ticket");
        Assert.That(diffs.Any(d => d.Contains("removed")), "Should detect removed ticket");
    }

    [Test]
    public async Task SprintWatchTestAsync()
    {
        int instanceId = 2751;

        DateTime day3 = DateTime.UtcNow.Date;
        DateTime day2 = day3.AddDays(-1);
        DateTime day1 = day2.AddDays(-1);

        IEnumerable<WorkItemSnapshot> fetchedItems1 = [
            new WorkItemSnapshot { Key = "KFX-14", IsBlocked = true, IsAssigned = false },
            new WorkItemSnapshot { Key = "KFX-15", IsAssigned = false }];

        IEnumerable<WorkItemSnapshot> fetchedItems2 = [
            new WorkItemSnapshot { Key = "KFX-14", IsBlocked = true, IsAssigned = false },
            new WorkItemSnapshot { Key = "KFX-15", IsAssigned = false }];

        IEnumerable<WorkItemSnapshot> fetchedItems3 = [
            new WorkItemSnapshot { Key = "KFX-14", IsAssigned = false },
            new WorkItemSnapshot { Key = "KFX-15", IsAssigned = false }];

        var trackableDictionary = new TrackableDictionary<TrackedWorkItem>(this.logger, this.connectionString,
            instanceId, "SprintWatch");
        trackableDictionary.Clear();
        await trackableDictionary.SaveChangesAsync();

        logger.LogInformation("");
        logger.LogInformation("Sprint Day 1");
        var diffs1 = trackableDictionary.Difference(fetchedItems1, day1);
        logger.LogInformation(diffs1.ToFriendlyString(returnNullWhenNothing: true, getLink: s => s));
        await trackableDictionary.ReplaceWithAsync(diffs1.NextState);

        logger.LogInformation("");
        logger.LogInformation("Sprint Day 2");
        var diffs2 = trackableDictionary.Difference(fetchedItems2, day2);
        logger.LogInformation(diffs2.ToFriendlyString(returnNullWhenNothing: true, getLink: s => s));
        await trackableDictionary.ReplaceWithAsync(diffs2.NextState);

        logger.LogInformation("");
        logger.LogInformation("Sprint Day 3");
        var diffs3 = trackableDictionary.Difference(fetchedItems3, day3);
        logger.LogInformation(diffs3.ToFriendlyString(returnNullWhenNothing: true, getLink: s => s));
        await trackableDictionary.ReplaceWithAsync(diffs3.NextState);
    }

    [Test]
    public async Task WatchlistJobTestAsync()
    {
        var job = WatchlistJob.Create(this.logger, this.connectionString);
        await job.GenerateUpdatesAsync();
    }

    [Test]
    public async Task GenerateWatchlistTestAsync()
    {
        var job = WatchlistJob.Create(this.logger, this.connectionString);
        var result = await job.ForTestAsync(4103);
        Assert.That(result.ToString().Length, Is.AtLeast(1));
    }

}
