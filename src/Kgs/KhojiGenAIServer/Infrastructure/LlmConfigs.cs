// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace KhojiGenAIServer.Infrastructure;

record OpenAiLlmConfig
{
    public string Name { get; init; }
    public string Model { get; init; }
    public string Key { get; init; }
    public string BaseUrl { get; init; }
}

record ClaudeLlmConfig
{
    public string Name { get; init; }
    public string Model { get; init; }
    public string Key { get; init; }
}

record GeminiLlmConfig
{
    public string Name { get; init; }
    public string Model { get; init; }
    public string Key { get; init; }
}

record ConfigFile
{
    public List<OpenAiLlmConfig> OpenAi { get; init; } = new();
    public List<ClaudeLlmConfig> Anthropic { get; init; } = new();
    public List<GeminiLlmConfig> Gemini { get; init; } = new();
}

class LlmConfigs
{
    string filePath = null;

    public LlmConfigs()
    {
        filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "llms.yaml");
    }

    IDeserializer Deserializer =>
        new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

    ISerializer Serializer =>
        new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

    ConfigFile load() =>
        File.Exists(filePath)
            ? new DeserializerBuilder()
                .WithNamingConvention(UnderscoredNamingConvention.Instance)
                .IgnoreUnmatchedProperties()
                .Build()
                .Deserialize<ConfigFile>(File.ReadAllText(filePath))
            : new() { Anthropic = new(), OpenAi = new(), Gemini = new() };

    void save(ConfigFile config) =>
        File.WriteAllText(filePath, Serializer.Serialize(config));

    public List<OpenAiLlmConfig> GetOpenAIEntries() =>
        load().OpenAi;

    public OpenAiLlmConfig GetOpenAIEntry(string name) =>
        load().OpenAi.FirstOrDefault(e => e.Name == name);

    public void SaveOpenAIEntry(OpenAiLlmConfig config)
    {
        var configs = load();

        var updated = configs.OpenAi.Where(e => e.Name != config.Name).Append(config).ToList();

        save(configs with { OpenAi = updated });
    }

    public List<ClaudeLlmConfig> GetClaudeEntries() =>
        load().Anthropic;

    public ClaudeLlmConfig GetClaudeEntry(string name) =>
        load().Anthropic.FirstOrDefault(e => e.Name == name);

    public void SaveClaudeEntry(ClaudeLlmConfig config)
    {
        var configs = load();

        var updated = configs.Anthropic.Where(e => e.Name != config.Name).Append(config).ToList();

        save(configs with { Anthropic = updated });
    }

    public List<GeminiLlmConfig> GetGeminiEntries() =>
        load().Gemini;

    public GeminiLlmConfig GetGeminiEntry(string name) =>
        load().Gemini.FirstOrDefault(e => e.Name == name);

    public void SaveGeminiEntry(GeminiLlmConfig config)
    {
        var configs = load();

        var updated = configs.Gemini.Where(e => e.Name != config.Name).Append(config).ToList();

        save(configs with { Gemini = updated });
    }
}
