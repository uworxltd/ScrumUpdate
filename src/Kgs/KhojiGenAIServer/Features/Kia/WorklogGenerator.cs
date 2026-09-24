// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Features.Kia.Models;
using System.Collections;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace KhojiGenAIServer.Features.Kia
{
    public record LogEntry(string date, string key, float time, string summary, string reason);
    public record ResponseModel(string message, List<LogEntry> data = null);
    public record WorkLogAIResponse(ResponseModel generated_output, WorklogRequest processed_input);

    public class WorklogGenerator
    {
        static bool isAnyGenericList(object obj)
        {
            if (obj == null) return false;

            var type = obj.GetType();
            return type.GetInterfaces()
                .Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IList<>));
        }

        static bool isAnyDictionary(object obj)
        {
            if (obj == null) return false;

            var type = obj.GetType();

            // Check if the type itself is a generic Dictionary<>
            if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Dictionary<,>))
                return true;

            // Check if any of the implemented interfaces is a generic Dictionary<>
            return type.GetInterfaces()
                       .Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IDictionary<,>));
        }

        static bool isTraversableObject(object obj)
        {
            if (obj == null) return false;
            if (obj is IDictionary || obj is IList) return true;
            return isRecordType(obj.GetType());
        }

        // The compiler synthesizes a public <Clone>$ method on every record
        // (class and struct); user code cannot declare such an identifier.
        static bool isRecordType(Type type) =>
            type.GetMethod("<Clone>$", BindingFlags.Public | BindingFlags.Instance) != null;

        // Exact property name first (dictionaries, anonymous types), then a case-insensitive
        // scan (PascalCase record properties vs lowercase wire names), then JsonPropertyName
        // (e.g. "toString" → ToStringValue on ActivityChangeItem).
        static PropertyInfo findProperty(Type type, string name)
        {
            if (type == null) return null;

            var prop = type.GetProperty(name, BindingFlags.Public | BindingFlags.Instance);
            if (prop != null) return prop;

            prop = type.GetProperties()
                .FirstOrDefault(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase));
            if (prop != null) return prop;

            return type.GetProperties()
                .FirstOrDefault(p => string.Equals(
                    p.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name, name, StringComparison.Ordinal));
        }

        static void recursiveMask(object data, NameMasker masker)
        {
            if (data is IList list)
            {
                for (int i = 0; i < list.Count; i++)
                {
                    if (list[i] is string str)
                    {
                        if (masker.TryGetMasked(str, out var replacement))
                            list[i] = replacement;
                    }
                    else if (isTraversableObject(list[i]))
                    {
                        recursiveMask(list[i], masker);
                    }
                }
            }
            else
            {
                var props = getKeys(data);
                foreach (var prop in props)
                {
                    var value = GetValueByKey(data, prop);
                    if (value is null) continue;
                    if (value is string str)
                    {
                        if (masker.TryGetMasked(str, out var replacement))
                        {
                            // Set the masked value back to the property
                            var type = data.GetType();
                            if (data is IDictionary dictionary)
                            {
                                dictionary[prop] = replacement;
                            }
                            else
                            {
                                var propertyInfo = findProperty(type, prop.ToString());
                                if (propertyInfo != null && propertyInfo.CanWrite)
                                {
                                    propertyInfo.SetValue(data, replacement);
                                }
                            }
                        }
                    }
                    else if (isTraversableObject(value))
                        recursiveMask(value, masker);
                }
            }
        }

        static void recursiveExtract(object data, NameMasker masker)
        {
            if (data is null) return;

            if (isAnyGenericList(data))
            {
                foreach (var item in (IEnumerable)data)
                    recursiveExtract(item, masker);
            }
            else
            {
                foreach (var prop in getKeys(data))
                {
                    var value = GetValueByKey(data, prop);
                    if (value is null) continue;

                    // Extract from specific fields that may contain user names
                    var usernameKeys = new List<string> { "username", "reporter", "assignee", "user_name" };
                    if (usernameKeys.Contains(prop.ToString().ToLower()))
                    {
                        if (value is string name && !string.IsNullOrEmpty(name))
                            masker.GetMasked(name);
                    }

                    if (string.Equals(prop.ToString(), "changeLog", StringComparison.OrdinalIgnoreCase) &&
                        isTraversableObject(value) && hasProperty(value, "history"))
                    {
                        var histories = getPropertyValue(value, "history");
                        if (isAnyGenericList(histories))
                        {
                            foreach (var history in (IEnumerable)histories)
                            {

                                if (isTraversableObject(history) && hasProperty(history, "username"))
                                {
                                    var username = getPropertyValue(history, "username");
                                    masker.GetMasked(username?.ToString());
                                }

                                if (isTraversableObject(history) && hasProperty(history, "changeLog"))
                                {
                                    var changeLogs = GetValueByKey(history, "changeLog");
                                    if (isAnyGenericList(changeLogs))
                                    {
                                        foreach (var change in (IEnumerable)changeLogs)
                                        {
                                            if (GetValueByKey(change, "field").ToString() == "assignee")
                                            {
                                                if (isTraversableObject(change) && hasProperty(change, "fromString"))
                                                {
                                                    var fromString = getPropertyValue(change, "fromString");
                                                    if (fromString is string fromName && !string.IsNullOrEmpty(fromName))
                                                        masker.GetMasked(fromName);
                                                }

                                                if (isTraversableObject(change) && hasProperty(change, "toString"))
                                                {
                                                    var toString = getPropertyValue(change, "toString");
                                                    if (toString is string toName && !string.IsNullOrEmpty(toName))
                                                        masker.GetMasked(toName);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (isTraversableObject(value))
                        recursiveExtract(value, masker);
                }
            }
        }

        static NameMasker extractNames(object rawData)
        {
            try
            {
                var masker = new NameMasker();
                recursiveExtract(rawData, masker);
                return masker;
            }
            catch (Exception ex)
            {
                throw new Exception("Error extracting names", ex);
            }
        }

        static List<LogEntry> unmaskNames(List<LogEntry> logEntries, NameMasker masker)
        {
            if (masker is null) return logEntries;

            List<LogEntry> unmaskedEntries = new List<LogEntry>();

            foreach (var entry in logEntries)
            {
                string unmaskedSummary = entry.summary;
                foreach (var (masked, original) in masker.GetReplacements())
                    unmaskedSummary = unmaskedSummary.Replace(masked, original);

                unmaskedEntries.Add(entry with { summary = unmaskedSummary });
            }
            return unmaskedEntries;
        }

        static bool hasProperty(object obj, string propertyName)
        {
            if (obj == null) return false;

            return findProperty(obj.GetType(), propertyName) != null;
        }

        static object getPropertyValue(object obj, string propertyName)
        {
            if (obj == null) return null;

            return findProperty(obj.GetType(), propertyName)?.GetValue(obj);
        }

        static IEnumerable<object> getKeys(object obj)
        {
            var type = obj.GetType();

            // Check if object is a Dictionary (implements IDictionary)
            if (obj is IDictionary dictionary)
            {
                foreach (var key in dictionary.Keys)
                {
                    yield return key;
                }
                yield break;
            }

            // Otherwise treat as unknown object and return property names
            PropertyInfo[] properties = type.GetProperties();

            foreach (var property in properties)
            {
                yield return property.Name;
            }
        }

        static List<object> parseApiResponse(ILogger logger, object apiResponse)
        {
            if (apiResponse is IDictionary<string, object> dictResp)
            {
                object dataObj;
                if (dictResp.TryGetValue("data", out dataObj) && dataObj is JsonElement jsonElement)
                {
                    if (jsonElement.ValueKind == JsonValueKind.Array)
                    {
                        List<object> list = JsonSerializer.Deserialize<List<object>>(jsonElement.GetRawText());
                        return list;
                    }
                }

                // Handle the case where the response is a single log entry
                string[] logKeys = { "date", "key", "time", "summary", "reason" };
                if (logKeys.All(k => dictResp.ContainsKey(k)))
                {
                    return new List<object> { dictResp };
                }
            }
            else if (apiResponse is IList<object> listResp)
            {
                return listResp.ToList();
            }
            else if (apiResponse is string str)
            {
                var jsonString = str;
                try
                {
                    var parsed = JsonDocument.Parse(jsonString).RootElement;
                    return parseApiResponse(logger, parsed); // Recursively parse the JSON-decoded content
                }
                catch (JsonException)
                {
                    logger.LogError($"Failed to parse LLM API response as JSON: {jsonString}");
                }
            }

            logger.LogError($"Unexpected LLM API response format: {apiResponse?.GetType().Name ?? "null"}");
            throw new ArgumentException($"Unexpected LLM API response format");
        }

        static string extractDateFromTimestamp(string timestamp)
        {
            if (DateTime.TryParse(timestamp, out var dt))
            {
                return dt.ToString("yyyy-MM-dd");
            }
            return null;
        }

        static async Task<ResponseModel> processData(
            IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
            string logNumber, WorklogRequest data, NameMasker masker)
        {
            try
            {
                double remainingDouble = 0.0;
                int remainingHoursInt = 0;
                if (data.RemainingHours != null)
                {
                    remainingDouble = Convert.ToDouble(data.RemainingHours);
                    remainingHoursInt = (int)remainingDouble;
                }
                var searchDate = data.Date ?? "";
                var userName = data.UserName;
                var userRole = data.UserRole?.ToString() ?? "";
                var calendarEvents = data.CalendarEvents;
                var calendarTickets = data.CalendarTickets;
                var activityLogs = data.ActivityLogs;
                var externalReferences = data.ExternalReferences;
                var reason = "worklog generation";

                logger.LogInformation("Number of tickets: {Count}", activityLogs.Count());
                logger.LogInformation("Request for user {User} on date {Date} received successfully", userName, searchDate);

                string promptName = "kia_role";

                if (!ScrumUpdate.UserExists(userName, activityLogs) && !calendarEvents.Any())
                {
                    logger.LogWarning("User {User} does not exist in the logs and calendar events list is empty", userName);
                    return new ResponseModel("User does not exist in the logs and calendar events list is empty", []);
                }
                else if (calendarEvents.Any() && !ScrumUpdate.UserExists(userName, activityLogs))
                {
                    if (!calendarTickets.Any())
                    {
                        logger.LogWarning("User {User} does not exist in the logs, calendar events exist but we dont have any calendar ticket",
                            userName);
                        return new ResponseModel("User does not exist in the logs, calendar events exist but we dont have any calendar ticket",
                            []);
                    }

                    logger.LogInformation("Only calendar events are populated. Generating update for that.");

                    var messages = await LlmLayer.PrepareWorklogGenerationChatMessages(environment, logger,
                        logNumber, promptName,
                        searchDate, userName, userRole, remainingHoursInt, calendarEvents, calendarTickets);

                    logger.LogDebug("Messages: {Messages}", messages);

                    var apiResponse = await LlmLayer.WorklogGenerationChatCompletion(services, environment, logger,
                        logNumber, promptName, messages);

                    if (apiResponse is null || apiResponse.Count == 0)
                    {
                        logger.LogWarning("No update generated by LLM");
                        return new ResponseModel("No update generated by LLM", new List<LogEntry>());
                    }

                    if (apiResponse is IDictionary<string, object> dictResp && dictResp.ContainsKey("error"))
                    {
                        logger.LogError("Error in API response: {Error}", dictResp["error"]);
                        throw new InvalidOperationException("Error in LLM response");
                    }

                    var parsed = parseApiResponse(logger, apiResponse);
                    var logEntries = new List<LogEntry>();
                    foreach (var entry in parsed)
                    {
                        if (entry is JsonElement singleEntryElement)
                        {
                            if (singleEntryElement.ValueKind == JsonValueKind.Object)
                            {
                                try
                                {
                                    var logEntry = singleEntryElement.Deserialize<LogEntry>();
                                    if (logEntry != null)
                                    {
                                        logEntries.Add(logEntry);
                                    }
                                }
                                catch (Exception ex)
                                {
                                    logger.LogError(ex, $"Error creating LogEntry");
                                    throw new InvalidOperationException($"Problematic entry: {JsonSerializer.Serialize(entry)}");
                                }
                            }
                        }
                    }
                    logger.LogInformation($"Successfully generated {logEntries.Count} log entries using LLM");
                    return new ResponseModel("Worklog generated successfully", logEntries);
                }

                // Case 3: user not in logs
                if (!ScrumUpdate.UserExists(userName, activityLogs))
                {
                    logger.LogWarning($"User {userName} does not exist in the logs");
                    return new ResponseModel("User does not exist in the logs", []);
                }
                // Case 4: user exists in logs
                var (keys, logActivities) = ScrumUpdate.GetUserActivityOnDate(logger, logNumber, reason, activityLogs, userName, searchDate);
                logger.LogInformation($"[{logNumber}] Extracted {keys.Count} keys and {logActivities.Count} activities for user {userName} on date {searchDate}");
                var external_ref_activities = ExtractActivitiesByDate(
                    externalReferences as Dictionary<string, object> ?? new Dictionary<string, object>(),
                    keys, searchDate, userName);
                var calendar_events = calendarEvents;

                Dictionary<string, object> externalRefActivities = external_ref_activities
                    .ToDictionary(kvp => kvp.Key, kvp => (object)kvp.Value);

                var messagesFull = await LlmLayer.PrepareWorklogGenerationChatMessages(
                    environment,
                    logger,
                    logNumber, promptName,
                    searchDate,
                    userName,
                    userRole,
                    remainingHoursInt,
                    calendar_events,
                    calendarTickets,
                    logActivities,
                    "",
                    externalRefActivities
                );

                var apiResponseFull = await LlmLayer.WorklogGenerationChatCompletion(services, environment, logger,
                    logNumber, promptName, messagesFull);

                if (apiResponseFull is null || apiResponseFull.Count == 0)
                {
                    logger.LogWarning($"[{logNumber}] No logs generated by LLM");
                    return new ResponseModel("No logs generated", []);
                }

                if (apiResponseFull is IDictionary<string, object> dictResp2 && dictResp2.ContainsKey("error"))
                {
                    logger.LogError($"[{logNumber}] Error in API response: {dictResp2["error"]}");
                    throw new InvalidOperationException($"Error in LLM response");
                }

                var parsedResponse = parseApiResponse(logger, apiResponseFull);

                var logEntries2 = new List<LogEntry>();
                foreach (var entry in parsedResponse)
                {
                    if (entry is JsonElement entryJson)
                    {
                        if (entryJson.ValueKind == JsonValueKind.Object)
                        {
                            try
                            {
                                var date = entryJson.TryGetProperty("date", out var dateObj) ? dateObj.ToString() ?? "" : "";
                                var key = entryJson.TryGetProperty("key", out var keyObj) ? keyObj.ToString() ?? "" : "";
                                var time = entryJson.TryGetProperty("time", out var timeObj) && float.TryParse(timeObj.ToString(),
                                    out var timeFloat) ? timeFloat : 0.0f;
                                var summary = entryJson.TryGetProperty("summary", out var summaryObj) ? summaryObj.ToString() ?? "" : "";
                                var reasonStr = entryJson.TryGetProperty("reason", out var reasonObj) ? reasonObj.ToString() ?? "" : "";
                                logEntries2.Add(new LogEntry(date, key, time, summary, reasonStr));
                            }
                            catch (Exception ex)
                            {
                                logger.LogError(ex, $"Error creating LogEntry");
                                throw new InvalidOperationException($"Problematic entry: {JsonSerializer.Serialize(entry)}");
                            }

                        }
                    }
                    else if (entry is IDictionary<string, object> logDict)
                    {
                        try
                        {
                            var date = logDict.TryGetValue("date", out var dateObj) ? dateObj?.ToString() ?? "" : "";
                            var key = logDict.TryGetValue("key", out var keyObj) ? keyObj?.ToString() ?? "" : "";
                            var time = logDict.TryGetValue("time", out var timeObj) && float.TryParse(timeObj?.ToString(),
                                out var timeFloat) ? timeFloat : 0.0f;
                            var summary = logDict.TryGetValue("summary", out var summaryObj) ? summaryObj?.ToString() ?? "" : "";
                            var reasonStr = logDict.TryGetValue("reason", out var reasonObj) ? reasonObj?.ToString() ?? "" : "";
                            logEntries2.Add(new LogEntry(date, key, time, summary, reasonStr));
                        }
                        catch (Exception ex)
                        {
                            logger.LogError(ex, $"Error creating LogEntry");
                            throw new InvalidOperationException($"Problematic entry: {JsonSerializer.Serialize(entry)}");
                        }
                    }
                }
                logger.LogInformation($"Successfully generated {logEntries2.Count} log entries using LLM");
                return new ResponseModel("Worklog generated successfully", logEntries2);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"[{logNumber}] Error converting raw data to target format");
                throw;
            }
        }

        internal static NameMasker MaskNames(ILogger logger, object rawData)
        {
            try
            {
                var masker = extractNames(rawData);
                logger.LogInformation($"Masked names: {masker}");
                recursiveMask(rawData, masker);
                return masker;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error converting raw data to target format");
                throw;
            }
        }

        public static object GetValueByKey(object obj, object key)
        {
            if (obj == null || key == null)
                return null;

            var type = obj.GetType();

            // Check if object is a dictionary
            if (obj is IDictionary dictionary)
            {
                if (dictionary.Contains(key))
                {
                    return dictionary[key];
                }
                return null; // key not found
            }


            // Otherwise treat as unknown object, get property value by name
            return findProperty(type, key.ToString())?.GetValue(obj);
        }

        public static Dictionary<string, List<Dictionary<string, object>>> ExtractActivitiesByDate(
            Dictionary<string, object> external_references, List<string> keys,
            string target_date, string user_name)
        {
            var activitiesByKey = new Dictionary<string, List<Dictionary<string, object>>>();

            // Initialize dictionary with empty lists for each key
            foreach (var key in keys)
            {
                activitiesByKey[key] = new List<Dictionary<string, object>>();
            }

            if (external_references.TryGetValue("submittedHours", out var submittedHoursObj) &&
                submittedHoursObj is List<object> submittedHours)
            {
                foreach (var hourEntryObj in submittedHours)
                {
                    if (hourEntryObj is Dictionary<string, object> hourEntry)
                    {
                        // Extract and normalize the logged date
                        var loggedDate = hourEntry.ContainsKey("date")
                            ? extractDateFromTimestamp(hourEntry["date"].ToString())
                            : null;

                        if (hourEntry.TryGetValue("entries", out var entriesObj) &&
                            entriesObj is List<object> entries)
                        {
                            foreach (var entryObj in entries)
                            {
                                if (entryObj is Dictionary<string, object> entry &&
                                    entry.TryGetValue("issueKey", out var issueKeyObj))
                                {
                                    var issueKey = issueKeyObj.ToString();

                                    // Check if logged date and user match
                                    if (loggedDate == target_date &&
                                        entry.TryGetValue("user", out var userObj) &&
                                        userObj is Dictionary<string, object> userDict &&
                                        userDict.TryGetValue("name", out var nameObj) &&
                                        nameObj.ToString() == user_name)
                                    {
                                        if (!activitiesByKey.ContainsKey(issueKey))
                                        {
                                            activitiesByKey[issueKey] = new List<Dictionary<string, object>>();
                                        }

                                        activitiesByKey[issueKey].Add(entry);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return activitiesByKey;
        }

        internal static async Task<ResponseModel> GenerateWorklog(
            IServiceProvider services, IWebHostEnvironment environment, ILogger logger,
            string logNumber, WorklogRequest targetData, NameMasker masker)
        {
            try
            {
                var response = await processData(services, environment, logger, logNumber, targetData, masker);
                return response;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"[{logNumber}] Error calling AI model for worklog generation");
                throw;
            }
        }

        internal static ResponseModel PostProcess(ILogger logger, ResponseModel aiResponse, NameMasker masker)
        {
            if (aiResponse?.data == null)
            {
                logger.LogWarning("aiResponse data is null or empty.");
                return aiResponse with { };
            }

            // sort the entries by time
            var sortedData = aiResponse.data.OrderByDescending(logEntry => logEntry.time).ToList();

            // removing any duplicate keys
            var combinedEntries = new Dictionary<string, LogEntry>();
            foreach (var entry in sortedData)
            {
                if (!string.IsNullOrEmpty(entry.key))
                {
                    if (combinedEntries.ContainsKey(entry.key))
                    {
                        var existingEntry = combinedEntries[entry.key];
                        existingEntry = existingEntry with
                        {

                            time = (float)Math.Round(existingEntry.time + entry.time, 2),
                            summary = $"{existingEntry.summary} | {entry.summary}"
                        };
                        combinedEntries[entry.key] = existingEntry;
                    }
                    else
                    {
                        combinedEntries[entry.key] = entry with
                        {
                            time = (float)Math.Round(entry.time, 2)
                        };
                    }
                }
            }

            var combinedData = combinedEntries.Values.ToList();
            var generatedHours = combinedData.Sum(entry => entry.time);
            logger.LogInformation($"Generated hours: {generatedHours}");

            // make sure that none of the entries have a negative value
            var adjustedData = combinedData
                .Select(entry => entry with { time = Math.Max(0, entry.time) })
                .ToList();

            var unmaskedData = unmaskNames(adjustedData, masker);

            return aiResponse with { data = unmaskedData };
        }
    }
}
