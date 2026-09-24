// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Analytics;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Features;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Integration)]
class AnalyticsTests
{
    // Local:   5432
    // Tunnel:  5436

    string connectionString = "Server=localhost;Port=5432;Username=khoji-admin;Password=khoji;Database=khoji-admin";
    NUnitLogger<AnalyticsTests> logger = new();

    [Test]
    public async Task WorkflowTestAsync()
    {
        var start = new DateTime(2025, 8, 4);
        var end = new DateTime(2025, 8, 15);
        var engine = new WorkflowEngine(this.logger, this.connectionString);

        var result = await engine.ExecuteWorkflowAsync(2751, "example", //"sprint_analyzer",
            isAbsolute: false,
            runtimeInputs: new Dictionary<string, object>
            {
                ["sprint_id"] = 300,
                ["additionalInfo"] = $"Today is: {DateTime.Now:d}, we are analyzing Sprint Title: X2, From Board: 289, Started: {start:d}, will end: {end:d} has goal: "
            });

        Assert.That(result, Is.Not.Null);
        Assert.That(result.ToString(), Has.Length.AtLeast(1));
    }

    [Test]
    public async Task AnalyticsActiveSprintTestAsync()
    {
        var kss = new KssGateway(this.logger, this.connectionString, instanceId: 7751);
        var result = await kss.AnalyzeSprintAsync(atlassianTenantName: "test-company", sprintId: 430);

        Assert.That(result.Succeeded, Is.True);
        Assert.That(result.Data, Is.Not.Null);
        Assert.That(result.Data.Length, Is.AtLeast(1));
    }

    [Test]
    [TestCase("X2")]
    public async Task AnalyticsSprintTestAsync(string sprintName)
    {
        var kss = new KssGateway(this.logger, this.connectionString, instanceId: 7751);
        var result = await kss.AnalyzeSprintAsync(atlassianTenantName: "test-company", sprintName);

        Assert.That(result.Succeeded, Is.True);
        Assert.That(result.Data, Is.Not.Null);
        Assert.That(result.Data, Has.Length.AtLeast(1));
    }

    [Test]
    public async Task WorkflowVariablesTestAsync()
    {
        var engine = new WorkflowEngine(this.logger, this.connectionString);

        // Create a simple workflow that uses variables
        var workflowYaml = """
            name: variable_test
            version: 1.0
            inputs:
                sprint_id: {type: int, default: 0}
            steps:
            - id: unassigned_issues
              type: sql
              query: |
                SELECT i.issue_key, i.summary, i.issue_type, i.priority, i.status
                FROM issues AS i JOIN sprint_issues AS si ON i.issue_key = si.issue_key
                WHERE si.sprint_id = {sprint_id}
                    AND i.status_category not in ('Done', 'Closed', 'Resolved')
                    AND (i.assignee_account_id IS NULL OR trim(i.assignee_account_id) = '');
              returns: (string issue_key, string summary, string issue_type, string priority, string status)
              output: unassigned_issues

            - id: unstarted_issues
              type: sql
              query: |
                SELECT i.issue_key, i.summary, i.issue_type, i.priority, i.status, i.assignee_display_name
                FROM issues AS i JOIN sprint_issues AS si ON i.issue_key = si.issue_key
                WHERE si.sprint_id = {sprint_id} 
                    AND i.status_category in ('To Do', 'Pending')
                    AND i.priority IN ('Highest', 'High');
              returns: (string issue_key, string summary, string issue_type, string priority, string status, string assignee_display_name)
              output: unstarted_issues
            """;

        // Write workflow to temp file
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, workflowYaml);

        try
        {
            bool isAbsolute = true;
            var result = await engine.ExecuteWorkflowAsync(7751, tempFile, isAbsolute, new Dictionary<string, object>
            {
                ["sprint_id"] = 430
            });

            Assert.That(result, Is.Not.Null);
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    [Test]
    public async Task WorkflowStepTestAsync()
    {
        var engine = new WorkflowEngine(this.logger, this.connectionString);

        var result = await engine.ExecuteWorkflowAsync(7751, "_parent",
            isAbsolute: false,
            runtimeInputs: new Dictionary<string, object>
            {
                ["sprint_id"] = 430
            });

        //Assert.That(result, Is.Not.Null);
        //var table = result as DynamicTable;
        //Assert.That(table, Is.Not.Null);
        //Assert.That(table.Rows, Is.Not.Empty);
    }

    [Test]
    public async Task WorkflowStepErrorHandlingTestAsync()
    {
        var engine = new WorkflowEngine(this.logger, this.connectionString);

        var result = await engine.ExecuteWorkflowAsync(7751, "_parent",
            isAbsolute: false,
            runtimeInputs: new Dictionary<string, object>
            {
                ["sprint_id"] = -1 // Invalid sprint ID
            });

        //Assert.That(result, Is.Not.Null);
        //var table = result as DynamicTable;
        //Assert.That(table, Is.Not.Null);
        //Assert.That(table.Rows, Is.Empty);
    }
}
