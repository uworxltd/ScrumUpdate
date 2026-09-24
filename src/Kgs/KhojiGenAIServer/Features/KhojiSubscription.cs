// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Core.Models;
using System.Text;
using System.Text.Json;

namespace KhojiGenAIServer.Features;

class KhojiSubscription
{
    static int getPreferedInstanceId(string key)
    {
        using var db = new KGSDbContext();
        var q = from p in db.TeamUserPreferences
                where p.MsftTeamsAadObjectId == key
                select p.PreferredInstanceId;
        var r = q.FirstOrDefault();
        return r ?? 0;
    }

    static void savePreferredInstanceId(string key, int instanceId)
    {
        using var db = new KGSDbContext();

        var r = db.TeamUserPreferences
            .FirstOrDefault(p => p.MsftTeamsAadObjectId == key);

        if (r == null)
            db.TeamUserPreferences.Add(new TeamUserPreference
            {
                MsftTeamsAadObjectId = key,
                PreferredInstanceId = instanceId
            });
        else if (r.PreferredInstanceId != instanceId)
            r.PreferredInstanceId = instanceId;

        db.SaveChanges();
    }

    public async Task<(bool cleared, string email, int instanceId, bool hasMultipleInstances)> CheckSubscriptionAsync(ILogger logger, ITurnContext turnContext,
        bool scrumUpdatesFeatureFlag, bool worklogInsightsFeatureFlag, bool standupBoardFeatureFlag, bool sprintWatchFeatureFlag,
        CancellationToken token)
    {
        var fromName = turnContext.Activity.From.Name;
        var gateway = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
        var khojiData = gateway.GetSubscriptions(turnContext.Activity.From.AadObjectId);
        logger.LogInformation($"[{fromName}] {khojiData.Count()} subscriptions found in the system");

        if (!khojiData.Any())                               // not a single
        {
            logger.LogInformation($"[{fromName}] Couldnt identify Khoji ID for {turnContext.Activity.From.AadObjectId}");
            await turnContext.SendWelcomeCardAsync(token, logger, turnContext.Activity.From.Name);
            return (false, null, 0, false);
        }
        else if (!khojiData.Any(d => d.InstanceId > 0))     // not a single active
        {   // atleast one exists if we want email

            logger.LogInformation($"[{turnContext.Activity.From.Name}] Couldnt identify active subscription of {khojiData.First().Email}");

            var sb = new StringBuilder();
            sb.Append($"It appears that your account is not currently linked to an active Jira instance. To proceed, please connect your account to a Jira workspace by visiting 🔗 {KhojiConstants.KhojiXBaseUrl}");
            sb.Append(" 🔗 *Links open in external site*");

            await turnContext.SendActivityAsync(MessageFactory.Text(sb.ToString()),
                cancellationToken: token);

            return (false, null, 0, false);
        }
        else if (khojiData.Count(d => d.InstanceId > 0) > 1)    // multiple active
        {
            logger.LogInformation($"[{turnContext.Activity.From.Name}] We have multiple active subscription of {khojiData.First().Email}");

            if (turnContext.Activity.Value is { } v)
            {
                var jsonElement = JsonSerializer.SerializeToElement(v);

                if (jsonElement.TryGetProperty("action", out var actionProperty) &&
                    actionProperty.GetString() == "x-khojicloud-instance-select")
                {
                    if (jsonElement.TryGetProperty("selectedInstance", out var selectedInstanceProperty) &&
                        int.TryParse(selectedInstanceProperty.GetString(), out int specifiedInstanceId) && specifiedInstanceId > 0)
                    {
                        if (khojiData.FirstOrDefault(d => d.InstanceId == specifiedInstanceId) is { }) // we have a valid specified instance id
                        {
                            savePreferredInstanceId(turnContext.Activity.From.AadObjectId, specifiedInstanceId);
                            logger.LogInformation($"[{turnContext.Activity.From.Name}] {specifiedInstanceId} saved for {khojiData.First().Email}, sending welcome card");
                            await turnContext.SendHelpCardAsync(token, logger, fromName,
                                specifiedInstanceId, isSupervisor: gateway.IsUserTeamSupervisorAndSchemaExists(khojiData.First().Email, specifiedInstanceId),
                                scrumUpdatesFeatureFlag, worklogInsightsFeatureFlag, standupBoardFeatureFlag, sprintWatchFeatureFlag,
                                allowChangingInstance: true); // as we have multiple active
                            return (false, null, 0, false); //returning false as we want khoji bot to be done with this request
                        }
                    }
                }
            }

            var instanceIdToLook = getPreferedInstanceId(turnContext.Activity.From.AadObjectId);
            var firstOrDefault = khojiData.FirstOrDefault(d => d.InstanceId == instanceIdToLook);

            if (instanceIdToLook > 0 && firstOrDefault.InstanceId > 0)
            {
                logger.LogInformation($"[{turnContext.Activity.From.Name}] {instanceIdToLook} from state found for {khojiData.First().Email}");
                return (true, firstOrDefault.Email, firstOrDefault.InstanceId, true);
            }
            else
                logger.LogInformation($"[{turnContext.Activity.From.Name}] {instanceIdToLook} was got from state but was not found");

            await turnContext.SendInstanceSelectionCardAsync(token, logger, fromName,
                khojiData.Select(d => (d.InstanceName, d.InstanceId)));
            return (false, null, 0, false);
        }

        string email = null;
        int instanceId = 0;

        foreach (var data in khojiData)
            (email, instanceId) = (data.Email, data.InstanceId);

        return (true, email, instanceId, khojiData.Count(d => d.InstanceId > 0) > 1);
    }
}
