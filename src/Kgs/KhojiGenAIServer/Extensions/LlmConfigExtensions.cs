// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Anthropic;
using Google.GenAI;
using KhojiGenAIServer.Infrastructure;
using Microsoft.Extensions.AI;
using OpenAI;
using System.ClientModel;

namespace KhojiGenAIServer.Extensions;

static class LlmConfigExtensions
{
    // BaseSKAgent
    internal static string ExpandEntry(string value) =>
        Environment.ExpandEnvironmentVariables(value);

    public static IChatClient CreateChatClient(this LlmConfigs config, string llm,
        int? maxOutputTokens = 8192) //aligned with KIA
    {
        if (config.GetClaudeEntry(llm) is { } claudeEntry &&
            claudeEntry.Key.HasText() && claudeEntry.Model.HasText())
        {
            var key = ExpandEntry(claudeEntry.Key);
            var model = ExpandEntry(claudeEntry.Model);

            var client = new AnthropicClient() { ApiKey = key };
            var chatClientBuilder = client.AsIChatClient(model)
                .AsBuilder()
                .ConfigureOptions(c =>
                {
                    if (maxOutputTokens.HasValue) c.MaxOutputTokens = maxOutputTokens;
                });

            return chatClientBuilder.Build();
        }
        else if (config.GetOpenAIEntry(llm) is { } openaiEntry &&
            openaiEntry.BaseUrl.HasText() && openaiEntry.Key.HasText() && openaiEntry.Model.HasText())
        {
            var baseUrl = ExpandEntry(openaiEntry.BaseUrl);
            var key = ExpandEntry(openaiEntry.Key);
            var model = ExpandEntry(openaiEntry.Model);

            var options = new OpenAIClientOptions
            {
                Endpoint = new Uri(baseUrl)
            };
            var openAIClient = new OpenAIClient(new ApiKeyCredential(key), options);
            return openAIClient.GetChatClient(model).AsIChatClient();
        }
        else if (config.GetGeminiEntry(llm) is { } geminiEntry &&
            geminiEntry.Key.HasText() && geminiEntry.Model.HasText())
        {
            var key = ExpandEntry(geminiEntry.Key);
            var model = ExpandEntry(geminiEntry.Model);

            var client = new Client(apiKey: key);
            var chatClientBuilder = client.AsIChatClient(model).AsBuilder().ConfigureOptions(c =>
            {
                if (maxOutputTokens.HasValue) c.MaxOutputTokens = maxOutputTokens;
            });

            return chatClientBuilder.Build();
        }

        return null;
    }
}
