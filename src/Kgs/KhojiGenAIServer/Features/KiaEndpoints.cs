// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Features.Kia;
using Microsoft.AspNetCore.Mvc;

namespace KhojiGenAIServer.Features;

static class KiaEndpoints
{
    public static void MapKiaFeatureEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/kia")
            .WithGroupName("protected")
            .RequireHost("*:9090")
            .WithTags(nameof(KiaEndpoints));

        group.MapGet("/cache-prompt", async (
            [FromServices] IWebHostEnvironment environment, [FromServices] ILogger<Program> logger,
            [FromHeader(Name = "x-tenant")] string? tenant) =>
        {
            logger.LogInformation($"cache-prompt endpoint called, x-tenant header: {tenant}");
            return Results.Ok();
        })
        .WithName("Cache Prompt");

        group.MapPost("/scrum-update", async (
            IServiceProvider services, IWebHostEnvironment environment, ILogger<ScrumUpdate> logger,
            [FromHeader(Name = "x-tenant")] string? tenant,
            HttpContext context, HttpRequest request) =>
        {
            var logNumber = await environment.LogRequestAsync(context);

            //logger.LogInformation($"[{logNumber}] scrum-update; returning default response for now");
            //return Results.Json(new ScrumUpdate.ScrumResponseModel("Scrum update generated successfully",
            //    "Fought with our beloved Python scripts that insisted on redefining ‘clean code’ as ‘creative chaos.’ Survived another round of indentation errors and mysterious dependency hell.",
            //    "Migrating to .NET — where semicolons bring structure, and we no longer summon runtime surprises with every execution. Refactoring feels like therapy.",
            //    "Only blocked by nostalgia — it’s hard to let go of the Python spaghetti we once called ‘architecture.’"));

            var step = "Failed to process request";

            try
            {
                logger.LogInformation($"[{logNumber}] Calling scrum-update API, x-tenant header: {tenant}");
                var rawData = await context.ReadFromJsonNewtonsoft();

                step = "Failed to convert raw data to target format";
                var targetData = ScrumUpdate.ConvertToScrumUpdateFormat(logger, logNumber, rawData, out string user);
                _ = ProactiveSubscriptions.SendProactiveMessagesAsync(services, instanceId: 0, serviceType: "x-subscription-kiadebugging",
                    message: $"[ScrumUpdate] Log Number: {logNumber}, User: {user}", CancellationToken.None);

                step = "Failed to mask names in target data";
                var masker = WorklogGenerator.MaskNames(logger, targetData);

                step = "Failed to call AI model";
                var aiResponse = await ScrumUpdate.GenerateScrumUpdate(services, environment, logger, logNumber, targetData, masker);

                step = "Failed to process AI response or generate scrum update";
                var processedResponse = ScrumUpdate.PostProcess(logger, aiResponse, masker);

                logger.LogInformation($"[{logNumber}] Returning response");
                return Results.Json(processedResponse);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"[{logNumber}] {step}");
                return Results.Problem(step);
            }
        })
        .WithName("Generates Scrum Update");

        group.MapPost("/weekly-retro", async (
            IServiceProvider services, IWebHostEnvironment environment, ILogger<WeeklyRetro> logger,
            [FromHeader(Name = "x-tenant")] string tenant,
            HttpContext context) =>
        {
            string logNumber = await environment.LogRequestAsync(context);

            logger.LogInformation($"[{logNumber}] Calling current-summary API, x-tenant header: {tenant}");
            var rawData = await context.ReadFromJsonNewtonsoft();
            if (rawData is null) return Results.BadRequest($"[{logNumber}] Invalid JSON payload");

            var preparedData = WeeklyRetro.ConvertToWeeklyRetroFormat(logger, logNumber, rawData, out string user);
            _ = ProactiveSubscriptions.SendProactiveMessagesAsync(services, instanceId: 0, serviceType: "x-subscription-kiadebugging",
                message: $"[WeeklyRetro] Log Number: {logNumber}, User: {user}", CancellationToken.None);
            logger.LogInformation($"[{logNumber}] Prepared data for summarization with {preparedData.FormattedIssues.Count} entries");

            var aiResponse = await WeeklyRetro.GenerateWeeklyRetro(services, environment, logger, logNumber, preparedData);
            return Results.Json(aiResponse);
        })
        .WithName("Generates Weekly Retro");

        group.MapPost("/categorize-issuetypes", async (
            IServiceProvider services, IWebHostEnvironment environment, ILogger<Categorizer> logger,
            [FromHeader(Name = "x-tenant")] string tenant,
            HttpContext context) =>
            {
                string logNumber = await environment.LogRequestAsync(context); // Log incoming request

                // Migrated code ahead:
                logger.LogInformation($"Calling categorize_issuetypes API, x-tenant header: {tenant}");

                var rawData = await context.ReadFromJsonNewtonsoft();

                if (rawData is null)
                    return Results.BadRequest("Invalid JSON payload");

                var issueTypes = Categorizer.ReadyForCategorize(logger, rawData);

                var aiResponse = await Categorizer.CallAiIssueCategorizer(services, environment, logger, logNumber, issueTypes);

                return Results.Json(aiResponse);
            }
        )
        .WithName("Generates AI Categories");

        group.MapPost("/generate-worklogs", async (
            IServiceProvider services, IWebHostEnvironment environment, ILogger<WorklogGenerator> logger,
            [FromHeader(Name = "x-tenant")] string tenant,
            HttpContext context) =>
        {
            string logNumber = await environment.LogRequestAsync(context);

            // Migrated code ahead:
            logger.LogInformation($"[{logNumber}] Calling generate-logs API, x-tenant header: {tenant}");

            var step = "Failed to process request";
            try
            {
                var rawData = await context.ReadFromJsonNewtonsoft();

                if (rawData is null)
                    return Results.BadRequest($"[{logNumber}] Invalid JSON payload");

                step = "Failed to convert raw data to target format";
                var targetData = ScrumUpdate.ConvertToWorklogFormat(logger, logNumber, rawData, out string user);
                _ = ProactiveSubscriptions.SendProactiveMessagesAsync(services, instanceId: 0, serviceType: "x-subscription-kiadebugging",
                    message: $"[GenerateLogs] Log Number: {logNumber}, User: {user}", CancellationToken.None);

                step = "Failed to mask names in target data";
                var masker = WorklogGenerator.MaskNames(logger, targetData);

                step = "Failed to call AI model";
                var aiResponse = await WorklogGenerator.GenerateWorklog(services, environment, logger, logNumber, targetData, masker);

                step = "Failed to process AI response or create work logs";
                var processedResponse = WorklogGenerator.PostProcess(logger, aiResponse, masker);


                var response = new WorkLogAIResponse(processedResponse, targetData);

                return Results.Json(response);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, step);
                return Results.Problem(step);
            }
        })
        .WithName("Generates Worklogs");
    }
}
