// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using System.Net.Http.Headers;

namespace KhojiGenAIServer.Services;

class TimeZoneClient
{
    HttpClient client = new();

    T doApiGetCall<T>(
        string url
    )
    {
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        return client
            .GetFromJsonAsync<T>($"{url}")
            .ContinueWith(responseTask =>
            {
                if (responseTask.IsFaulted)
                {
                    throw new HttpRequestException($"Error fetching data from {url}: {responseTask.Exception?.Message}");
                }
                return responseTask.Result;
            })
            .Result;
    }

    public List<string> GetAllAvailableTimeZones()
    {
        return doApiGetCall<List<string>>(
            $"https://timeapi.io/api/timezone/availabletimezones"
         );
    }
}
