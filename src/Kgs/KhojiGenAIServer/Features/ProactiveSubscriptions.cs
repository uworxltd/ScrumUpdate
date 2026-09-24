// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using Microsoft.Agents.Builder;
using Microsoft.TeamsFx.Conversation;

namespace KhojiGenAIServer.Features;

static class ProactiveSubscriptions
{
    public enum SubscriptionStatus { Subscribed, Updated, Conflict, Unsubscribed, NotFound }

    public static SubscriptionStatus SubscribeProactively(string channelId,
        string email, int instanceId, string serviceType, bool particularChannel = false, object metaData = null)
    {
        var status = SubscriptionStatus.NotFound;

        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
        var q = from s in db.ProactiveSubscriptions
                where s.InstanceId == instanceId
                && s.ServiceType == serviceType
                select s;

        if (particularChannel && !string.IsNullOrEmpty(channelId))
            q = q.Where(s => s.ChannelId == channelId);

        var r = q.FirstOrDefault();

        if (r == null)
        {
            r = new ProactiveSubscription
            {
                UserEmail = email,
                InstanceId = instanceId,
                ChannelId = channelId,
                ServiceType = serviceType
            };

            if (metaData != null)
                r.SubscriptionParameters = Newtonsoft.Json.Linq.JObject.FromObject(metaData);

            db.ProactiveSubscriptions.Add(r);
            status = SubscriptionStatus.Subscribed;
        }
        else
        {
            r.ChannelId = channelId; // we will send message to the channel from where its requested last
            r.UserEmail = email;
            r.SubscriptionParameters = metaData != null ?
                Newtonsoft.Json.Linq.JObject.FromObject(metaData) : null;
            r.Updated = DateTime.UtcNow;

            status = SubscriptionStatus.Updated;
        }

        db.SaveChanges();
        return status;
    }

    public static SubscriptionStatus SubscribeProactively(this ITurnContext turnContext,
        string email, int instanceId, string serviceType, object metaData = null) =>
        SubscribeProactively(turnContext.Activity.Conversation.Id,
            email, instanceId, serviceType, metaData: metaData);

    public static async Task<int> SendProactiveMessagesAsync(IServiceProvider service,
        int instanceId, string serviceType, IEnumerable<string> messages, CancellationToken cancellationToken)
    {
        int toReturn = 0;
        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
        var q = from s in db.ProactiveSubscriptions
                where s.InstanceId == instanceId && s.ServiceType == serviceType
                select s;

        var result = q.ToArray();

        if (result != null && result.Length > 0)
        {
            var conversationBot = service.GetService<ConversationBot>();
            if (conversationBot != null)
            {
                var installations = await conversationBot.GetAllInstallationsAsync();
                var installationsMap = installations.ToDictionary(
                    r => r.ConversationReference.Conversation.Id,
                    r => r);

                foreach (var r in result)
                {
                    if (installationsMap.ContainsKey(r.ChannelId))
                    {
                        foreach (var m in messages)
                        {
                            await installationsMap[r.ChannelId].SendMessage(m, cancellationToken: cancellationToken);
                            toReturn++;
                        }
                    }
                }
            }
        }

        return toReturn;
    }

    public static async Task<int> SendProactiveMessagesAsync(IServiceProvider service,
        int instanceId, string serviceType, string message, CancellationToken cancellationToken) =>
        await SendProactiveMessagesAsync(service, instanceId, serviceType, [message], cancellationToken);

    public static SubscriptionStatus UnsubscribeProactively(string channelId,
        int instanceId, string serviceType, string email = null)
    {
        var status = SubscriptionStatus.NotFound;

        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
        var q = from s in db.ProactiveSubscriptions
                where s.InstanceId == instanceId && s.ChannelId == channelId
                && s.ServiceType == serviceType
                select s;

        if (!string.IsNullOrWhiteSpace(email)) q = q.Where(s => s.UserEmail == email);

        var r = q.FirstOrDefault();
        if (null != r)
        {
            db.ProactiveSubscriptions.Remove(r);
            db.SaveChanges();
            status = SubscriptionStatus.Unsubscribed;
        }

        return status;
    }

    public static SubscriptionStatus UnsubscribeProactively(this ITurnContext turnContext,
        int instanceId, string serviceType, string email = null) =>
        UnsubscribeProactively(turnContext.Activity.Conversation.Id,
            instanceId, serviceType, email);

    public static async Task<string> SendProactiveMessagesAsync(this ITurnContext turnContext, IServiceProvider service,
        Exception ex, CancellationToken cancellationToken)
    {
        var instanceId = 0;
        var serviceType = "x-subscription-exceptions";
        var messages = new List<string>
        {
            $"[{turnContext.Activity.Conversation.Id}]{Environment.NewLine}Exception occurred on [{turnContext.Activity.From.Name}] {turnContext.Activity.Text}",
            $"[{turnContext.Activity.Conversation.Id}]{Environment.NewLine}{ex}"
        };

        var sentMessages = await SendProactiveMessagesAsync(service, instanceId, serviceType, messages, cancellationToken);
        if (sentMessages > 0)
            return "Looks like I have hit a dead end, the error is reported to our team and they will look into it...";

        return null;
    }
}
