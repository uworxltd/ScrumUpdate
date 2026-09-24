// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Teams;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.TeamsFx.Conversation;
using Newtonsoft.Json.Linq;
using TickerQ.Utilities.Base;

namespace KhojiGenAIServer.Jobs;

enum XJobScheduleStatus
{
    Scheduled = 0,
    Updated = 1,
    Conflict = 2,
    UnScheduled = 3,
    NotFound = 4
}

class XTimeSheetJobMetaData
{
    public string Time { get; set; }
}

class XJobRequest : ProactiveSubscription
{
    public TeamsBotInstallation Installation;

    public XJobRequest(ProactiveSubscription s, TeamsBotInstallation installation)
    {
        SubscriptionId = s.SubscriptionId;
        UserEmail = s.UserEmail;
        InstanceId = s.InstanceId;
        ChannelId = s.ChannelId;
        ServiceType = s.ServiceType;
        SubscriptionParameters = s.SubscriptionParameters;
        Installation = installation;
    }

    public T GetXJobMetaData<T>()
    {
        if (SubscriptionParameters == null)
            return default;
        return SubscriptionParameters.ToObject<T>();
    }
}

class XJobUtils(ILogger logger, ConversationBot conversationBot = null)
{

    public async Task<List<XJobRequest>> GetJobRequestsWithInstallationDetails(string jobType)
    {
        logger.LogInformation($"{jobType} job triggered in XJobUtils::GetJobRequestsWithInstallationDetails");
        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);

        if (conversationBot == null)
        {
            logger.LogInformation("This method requires conversationBot please add it");
            return null;
        }


        // 🔹 Fetch all requests for this job
        var requests = await db.ProactiveSubscriptions
            .Where(r => r.ServiceType == jobType)
            .ToListAsync();

        if (requests.Count == 0)
        {
            logger.LogInformation("No active requests to be processed");
            return null;
        }

        var installations = await conversationBot.GetAllInstallationsAsync();
        var installationsMap = installations.ToDictionary(
            r => r.ConversationReference.Conversation.Id,
            r => r);

        return [
            .. requests.Select(r => new XJobRequest(r, installationsMap.GetValueOrDefault(r.ChannelId)))
        ];
    }

    public async Task<XJobScheduleStatus> ScheduleProactiveInsights(
        string email,
        int instanceId,
        string conversationId,
        string insightJobType,
        object metaData
    )
    {
        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);

        // check if entry already exists
        var existingItem = db.ProactiveSubscriptions.FirstOrDefault(s =>
            s.UserEmail == email &&
            s.InstanceId == instanceId &&
            s.ChannelId == conversationId &&
            s.ServiceType == insightJobType
        );


        if (existingItem != null)
        {
            var subscriptionParams = JObject.FromObject(metaData);
            if (!JToken.DeepEquals(existingItem.SubscriptionParameters, subscriptionParams))
            {
                existingItem.SubscriptionParameters = subscriptionParams;
                db.Update(existingItem);
                await db.SaveChangesAsync();

                return XJobScheduleStatus.Updated;
            }

            return XJobScheduleStatus.Conflict;
        }

        // persist subscription request
        var request = new ProactiveSubscription
        {
            SubscriptionId = Guid.NewGuid(),
            UserEmail = email,
            InstanceId = instanceId,
            ChannelId = conversationId,
            ServiceType = insightJobType,
            SubscriptionParameters = JObject.FromObject(metaData)
        };

        db.Add(request);
        await db.SaveChangesAsync();

        return XJobScheduleStatus.Scheduled;
    }

    public async Task<XJobScheduleStatus> UnScheduleProActiveInsights(
        string email,
        int instanceId,
        string conversationId,
        string insightJobType
    )
    {
        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
        var itemToRemove = db.ProactiveSubscriptions.FirstOrDefault(s =>
            s.UserEmail == email &&
            s.InstanceId == instanceId &&
            s.ChannelId == conversationId &&
            s.ServiceType == insightJobType
        );

        if (itemToRemove != null)
        {
            db.Remove(itemToRemove);
            await db.SaveChangesAsync();
            return XJobScheduleStatus.UnScheduled;
        }
        else
            return XJobScheduleStatus.NotFound;
    }
}

internal class XTimeSheetJob(ILogger<XTimeSheetJob> logger, ConversationBot conversationBot)
{
    public const string ServiceType = "x-proactive-TimeSheet";

    [TickerFunction(nameof(ExecuteJobAsync), cronExpression: "0 */5 * * * *")]
    public async Task ExecuteJobAsync()
    {
        if (DateTime.UtcNow.IsWeekend()) return;

        var jobUtils = new XJobUtils(logger, conversationBot);
        var subscriptions = await jobUtils.GetJobRequestsWithInstallationDetails(ServiceType);

        if (subscriptions == null || subscriptions.Count == 0)
        {
            logger.LogInformation("No Job Found to process");
            return;
        }

        subscriptions = [.. subscriptions.Where(
            s => DateTime.Parse(s.GetXJobMetaData<XTimeSheetJobMetaData>().Time).IsInNextXMinutes(5))];

        if (subscriptions.Count == 0)
        {
            logger.LogInformation("No Job Found to process in the next 5 minutes");
            return;
        }

        foreach (var subscription in subscriptions)
        {
            try
            {
                logger.LogInformation("fetching KBS token, and then AI work logs");
                var generatedWorklogUsingAi = new KbsClient(subscription.UserEmail)
                    .InitializeToken()
                    .GenerateAIWorkLog(subscription.InstanceId);

                logger.LogInformation("processing fetched data and sending logs to user");
                string card = AdaptiveCardsHelper.GenerateAIWorklogCard(generatedWorklogUsingAi, subscription.UserEmail, subscription.UserEmail,
                    includeUnsubscribe: true);

                if (!string.IsNullOrEmpty(card))
                {
                    // send card only if there is no Activity or Activity, in case of error keep quiet
                    logger.LogInformation("sending the card to user");
                    await subscription.Installation.SendAdaptiveCard(card);
                }
            }
            catch (HttpRequestException requestException)
            {
                logger.LogError($"HTTP Request error for user {subscription.UserEmail}: {requestException.Message}");
                // Do nothing
            }
        }

        await Task.CompletedTask;
    }
}
