// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Extensions;
using System.Net.Http.Headers;
using System.Text.Json;

namespace KhojiGenAIServer.Services;

class KbsClient
{
    public class Base
    {
        public string Message { get; set; }
    }

    public class Credentials
    {
        public string Token { get; set; }
    }

    public class JiraCredentials : Credentials
    {
        public string JiraCloudTenantId { get; set; }
        public string TenantName { get; set; }
    }

    public class WeeklyRetroResponse : Base
    {
        public string Summary { get; set; }
        public string DateRange { get; set; }
    }

    public class ScrumResponse : Base
    {
        // Lets use JsonPropertyName attributes and rename the properties to PascalCase

        public string Last_Day { get; set; }
        public string Current_Day { get; set; }
        public string Blockers { get; set; }
    }

    public class GenerateAIWorkLogResponse
    {
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public string UniqueIdentifier { get; set; }
        public List<WorkLogAIDetails> Data { get; set; }
    }

    public class WorkLogAIDetails
    {
        public string Date { get; set; }
        public string Key { get; set; }
        public double Time { get; set; }
        public string Summary { get; set; }
        public string Reason { get; set; }
        public string TaskTitle { get; set; }
    }

    class WorkLogsPostResponse
    {
        public List<SubmissionDetail> SubmissionDetails { get; set; }
    }

    class SubmissionDetail
    {
        public string TicketId { get; set; }
        public bool Submitted { get; set; }
        public double Hours { get; set; }
        public string WorkLogId { get; set; }
        public string Comment { get; set; }
    }

    readonly string baseUrl;
    readonly string email;
    string token;

    public KbsClient(string email)
    {
        baseUrl = KhojiConstants.KhojiXBusinessServerUrl;
        this.email = Uri.EscapeDataString(email);
    }

    T doApiGetCall<T>(string url,
        string token = null,
        string tokenType = "Bearer",
        Dictionary<string, string> customHeaders = null)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        if (token != null || this.token != null)
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(tokenType, token ?? this.token);

        if (customHeaders != null)
            foreach (var item in customHeaders)
                client.DefaultRequestHeaders.Add(item.Key, item.Value);

        return client
            .GetFromJsonAsync<T>($"{baseUrl}{url}")
            .ContinueWith(responseTask =>
            {
                if (responseTask.IsFaulted)
                    throw new HttpRequestException($"Error fetching data from {baseUrl}{url}: {responseTask.Exception?.Message}");
                return responseTask.Result;
            })
            .Result;
    }

    TResponse doApiPostCall<TRequest, TResponse>(string url, TRequest payload,
        string token = null,
        string tokenType = "Bearer",
        Dictionary<string, string> customHeaders = null)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        if (token != null || this.token != null)
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(tokenType, token ?? this.token);

        if (customHeaders != null)
            foreach (var item in customHeaders)
                client.DefaultRequestHeaders.Add(item.Key, item.Value);

        var response = client.PostAsJsonAsync($"{baseUrl}{url}", payload).Result;

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = response.Content.ReadAsStringAsync().Result;
            throw new HttpRequestException($"API call to {baseUrl}{url} failed with status code {(int)response.StatusCode}: {response.ReasonPhrase}\n{errorContent}");
        }

        return response.Content.ReadFromJsonAsync<TResponse>().Result;

    }

    Dictionary<string, string> getInstanceIdHeaders(int instanceId)
    {
        return new Dictionary<string, string>
        {
            { "instance_id", instanceId.ToString() }
        };
    }

    public KbsClient InitializeToken()
    {
        if (token != null) return this; // Token already initialized

        token = doApiGetCall<Credentials>(
            $"/kgs/get-token-against-email?email={email}",
            tokenType: "Basic",
            token: KhojiConstants.KhojiXBasicCreds
         ).Token;

        return this;
    }

    public bool SyncStarted(ILogger logger, int instanceId, JsonElement payload, out string jobId)
    {
        jobId = null;

        var response = doApiPostCall<JsonElement, JsonElement>("/sync/submit", payload,
            customHeaders: getInstanceIdHeaders(instanceId));
        //logger.LogInformation($"[KbsClient::/sync/submit] {response}");
        /*
         * {
         *   "job_id": "5912af77-30d9-45c6-87bc-bf40af9af255",
         *   "status": "pending",
         *   "message": "Job 5912af77-30d9-45c6-87bc-bf40af9af255 submitted successfully",
         *   "submitted_at": "2025-11-17T06:07:46.760769"
         * }
         */
        if (response.ValueKind == JsonValueKind.Object &&
            response.TryGetProperty("job_id", out JsonElement job))
        {
            jobId = job.GetString();
            return true;
        }

        return false;
    }

    public bool SyncJobStatus(ILogger logger, int instanceId, string jobId, out string jobType)
    {
        jobType = null;

        var response = doApiGetCall<JsonElement>(
            $"/sync/status?jobId={jobId}",
            customHeaders: getInstanceIdHeaders(instanceId));
        //logger.LogInformation($"[KbsClient::/sync/status/{jobId}] {response}");
        /*
         * {
         *   "jobId": "5912af77-30d9-45c6-87bc-bf40af9af255",
         *   "status": "running",
         *   "jobType": "sprints_list_sync",
         *   "progress": null,
         *   "createdAt": "2025-11-17T06:07:46.688893",
         *   "startedAt": "2025-11-17T06:07:46.815107",
         *   "completedAt": null
         * }
         */

        if (response.ValueKind == JsonValueKind.Object &&
            response.TryGetProperty("status", out JsonElement statusElement) && statusElement.ValueKind == JsonValueKind.String
                && statusElement.ToString() == "success"
            && response.TryGetProperty("jobType", out JsonElement jobTypeElement) && jobTypeElement.ValueKind == JsonValueKind.String)
        {
            jobType = jobTypeElement.ToString();
            return !string.IsNullOrWhiteSpace(jobType);
        }

        return false;
    }

    public Credentials GetCalendarCredentials(int instanceId)
    {
        return doApiGetCall<Credentials>(
            "/kgs/get-aad-token",
            customHeaders: getInstanceIdHeaders(instanceId)
        );
    }

    public JiraCredentials GetJiraCredentials(int instanceId)
    {
        return doApiGetCall<JiraCredentials>(
            $"/kgs/get-updated-jira-access-token",
            customHeaders: getInstanceIdHeaders(instanceId));
    }

    public ScrumResponse GetUserScrumUpdate(int instanceId)
    {
        var today = DateTime.Today;
        var lastWorkingDay = today.LastWorkingDay();

        return doApiPostCall<object, ScrumResponse>($"/generate/scrum-updates", new
        {
            todayDate = today.ToIsoDateString(),
            yesterdayDate = lastWorkingDay.ToIsoDateString()
        },
        customHeaders: getInstanceIdHeaders(instanceId));
    }

    public WeeklyRetroResponse GetUserWeeklyRetro(int instanceId)
    {
        // request body
        var today = DateTime.UtcNow;
        var weekRange = today.ToWeekDateRangeStrings();

        var response = doApiPostCall<object, WeeklyRetroResponse>(
            $"/generate/current-summary",
            new { dateRange = new[] { weekRange[0], weekRange[1] } },
            customHeaders: getInstanceIdHeaders(instanceId));

        response.DateRange = $"{DateTime.Parse(weekRange[0]):MMM d} - {DateTime.Parse(weekRange[1]):MMM d}";

        return response;
    }

    public GenerateAIWorkLogResponse GenerateAIWorkLog(int instanceId,
        string date = null, int hours = 8)
    {
        // hoursToGenerate will be ignored for now, KBS will fetch and use values accordingly
        // KBS::WorkLogHandler.java::235-237


        if (string.IsNullOrEmpty(date)) date = DateTime.UtcNow.ToIsoDateString();


        return doApiPostCall<object, GenerateAIWorkLogResponse>(
            $"/worklog/generate",
            new
            {
                hoursToGenerate = hours,
                requestedDate = date
            },
            customHeaders: getInstanceIdHeaders(instanceId));
    }

    public string PostAiGeneratedWorklogsOnSource(List<WorkLogAIDetails> logs, string identifier, int instanceId)
    {
        var response = doApiPostCall<object, WorkLogsPostResponse>(
            $"/kgs/post/worklogs",
            new
            {
                uniqueIdentifier = identifier,
                workLogs = logs
            },
            customHeaders: getInstanceIdHeaders(instanceId));

        var successfulSubmissions = response.SubmissionDetails.Where(sd => sd.Submitted).ToList();

        if (successfulSubmissions.Count > 0)
        {
            if (successfulSubmissions.Count == response.SubmissionDetails.Count)
                return "Your work logs are added on source.";
            else
            {
                var failedResponseIds = string.Join(",", response.SubmissionDetails.Where(sd => !sd.Submitted).Select(sd => sd.TicketId));
                return $"Failed to submit worklogs for these tickets {failedResponseIds}";
            }
        }

        return "Failed to add the work logs on source";
    }
}
