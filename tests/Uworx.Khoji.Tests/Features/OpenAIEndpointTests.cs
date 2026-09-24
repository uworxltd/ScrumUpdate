// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using KhojiGenAIServer.Features;
using AIExtensions = Microsoft.Extensions.AI;

namespace Uworx.Khoji.Tests.Features;

[TestFixture, Category(NUnitConstants.TestCatory.Unit)]
class OpenAIEndpointTests
{
    #region ChatCompletionRequest Record Tests

    [Test]
    public void ChatCompletionRequest_CreatesWithRequiredFields()
    {
        var messages = new[] { new OpenAIEndpoint.ChatMessage("user", "Hello") };
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", messages);

        Assert.That(request.Model, Is.EqualTo("gpt-4"));
        Assert.That(request.Messages, Is.EqualTo(messages));
        Assert.That(request.Stream, Is.False);
        Assert.That(request.Temperature, Is.Null);
    }

    [Test]
    public void ChatCompletionRequest_CreatesWithAllFields()
    {
        var messages = new[] { new OpenAIEndpoint.ChatMessage("user", "Hello") };
        var tools = new[] { new OpenAIEndpoint.Tool("function", new OpenAIEndpoint.FunctionDefinition("testFunc")) };
        var request = new OpenAIEndpoint.ChatCompletionRequest(
            "gpt-4", messages,
            0.7f,
            100,
            0.9f,
            0.5f,
            0.5f,
            new[] { "END" },
            true,
            tools,
            "auto",
            User: "user123"
        );

        Assert.That(request.Model, Is.EqualTo("gpt-4"));
        Assert.That(request.Temperature, Is.EqualTo(0.7f));
        Assert.That(request.MaxTokens, Is.EqualTo(100));
        Assert.That(request.TopP, Is.EqualTo(0.9f));
        Assert.That(request.FrequencyPenalty, Is.EqualTo(0.5f));
        Assert.That(request.PresencePenalty, Is.EqualTo(0.5f));
        Assert.That(request.Stop, Has.Length.EqualTo(1));
        Assert.That(request.Stream, Is.True);
        Assert.That(request.Tools, Has.Length.EqualTo(1));
        Assert.That(request.ToolChoice, Is.EqualTo("auto"));
        Assert.That(request.User, Is.EqualTo("user123"));
    }

    #endregion

    #region ChatMessage Record Tests

    [Test]
    public void ChatMessage_CreatesWithRoleAndContent()
    {
        var message = new OpenAIEndpoint.ChatMessage("user", "Hello");

        Assert.That(message.Role, Is.EqualTo("user"));
        Assert.That(message.Content, Is.EqualTo("Hello"));
        Assert.That(message.Name, Is.Null);
        Assert.That(message.ToolCalls, Is.Null);
        Assert.That(message.ToolCallId, Is.Null);
    }

    [Test]
    public void ChatMessage_CreatesWithToolCalls()
    {
        var toolCalls = new[] { new OpenAIEndpoint.ToolCall("call-1", "function", new OpenAIEndpoint.FunctionCall("testFunc", "{}")) };
        var message = new OpenAIEndpoint.ChatMessage("assistant", null, null, toolCalls);

        Assert.That(message.Role, Is.EqualTo("assistant"));
        Assert.That(message.Content, Is.Null);
        Assert.That(message.ToolCalls, Has.Length.EqualTo(1));
    }

    [Test]
    public void ChatMessage_CreatesWithToolCallId()
    {
        var message = new OpenAIEndpoint.ChatMessage("tool", "result", null, null, "call-1");

        Assert.That(message.Role, Is.EqualTo("tool"));
        Assert.That(message.Content, Is.EqualTo("result"));
        Assert.That(message.ToolCallId, Is.EqualTo("call-1"));
    }

    #endregion

    #region Tool and FunctionDefinition Tests

    [Test]
    public void Tool_CreatesWithFunctionDefinition()
    {
        var funcDef = new OpenAIEndpoint.FunctionDefinition("testFunc", "A test function", new { key = "value" });
        var tool = new OpenAIEndpoint.Tool("function", funcDef);

        Assert.That(tool.Type, Is.EqualTo("function"));
        Assert.That(tool.Function.Name, Is.EqualTo("testFunc"));
        Assert.That(tool.Function.Description, Is.EqualTo("A test function"));
    }

    [Test]
    public void FunctionDefinition_CreatesWithMinimalFields()
    {
        var funcDef = new OpenAIEndpoint.FunctionDefinition("testFunc");

        Assert.That(funcDef.Name, Is.EqualTo("testFunc"));
        Assert.That(funcDef.Description, Is.Null);
        Assert.That(funcDef.Parameters, Is.Null);
    }

    #endregion

    #region ToolCall and FunctionCall Tests

    [Test]
    public void ToolCall_CreatesSuccessfully()
    {
        var funcCall = new OpenAIEndpoint.FunctionCall("testFunc", @"{""arg"":""value""}");
        var toolCall = new OpenAIEndpoint.ToolCall("call-1", "function", funcCall);

        Assert.That(toolCall.Id, Is.EqualTo("call-1"));
        Assert.That(toolCall.Type, Is.EqualTo("function"));
        Assert.That(toolCall.Function.Name, Is.EqualTo("testFunc"));
    }

    #endregion

    #region ChatCompletionResponse Tests

    [Test]
    public void ChatCompletionResponse_CreatesWithAllFields()
    {
        var message = new OpenAIEndpoint.ChatMessage("assistant", "Response");
        var choice = new OpenAIEndpoint.Choice(0, message, "stop");
        var usage = new OpenAIEndpoint.Usage(10, 20, 30);
        var response = new OpenAIEndpoint.ChatCompletionResponse("id-123", "chat.completion", 123456, "gpt-4", new[] { choice }, usage);

        Assert.That(response.Id, Is.EqualTo("id-123"));
        Assert.That(response.Object, Is.EqualTo("chat.completion"));
        Assert.That(response.Created, Is.EqualTo(123456));
        Assert.That(response.Model, Is.EqualTo("gpt-4"));
        Assert.That(response.Choices, Has.Length.EqualTo(1));
        Assert.That(response.Usage?.PromptTokens, Is.EqualTo(10));
        Assert.That(response.Usage?.CompletionTokens, Is.EqualTo(20));
        Assert.That(response.Usage?.TotalTokens, Is.EqualTo(30));
    }

    [Test]
    public void Choice_CreatesSuccessfully()
    {
        var message = new OpenAIEndpoint.ChatMessage("assistant", "Response");
        var choice = new OpenAIEndpoint.Choice(0, message, "stop");

        Assert.That(choice.Index, Is.EqualTo(0));
        Assert.That(choice.Message, Is.EqualTo(message));
        Assert.That(choice.FinishReason, Is.EqualTo("stop"));
    }

    [Test]
    public void Usage_CreatesSuccessfully()
    {
        var usage = new OpenAIEndpoint.Usage(10, 20, 30);

        Assert.That(usage.PromptTokens, Is.EqualTo(10));
        Assert.That(usage.CompletionTokens, Is.EqualTo(20));
        Assert.That(usage.TotalTokens, Is.EqualTo(30));
    }

    #endregion

    #region ConversionExtensions Tests

    [Test]
    public void ToAIChatMessage_ConvertsUserMessage()
    {
        var message = new OpenAIEndpoint.ChatMessage("user", "Hello");
        var aiMessage = message.ToAIChatMessage();

        Assert.That(aiMessage.Role, Is.EqualTo(AIExtensions.ChatRole.User));
        Assert.That(aiMessage.Text, Is.EqualTo("Hello"));
    }

    [Test]
    public void ToAIChatMessage_ConvertsSystemMessage()
    {
        var message = new OpenAIEndpoint.ChatMessage("system", "You are helpful");
        var aiMessage = message.ToAIChatMessage();

        Assert.That(aiMessage.Role, Is.EqualTo(AIExtensions.ChatRole.System));
        Assert.That(aiMessage.Text, Is.EqualTo("You are helpful"));
    }

    [Test]
    public void ToAIChatMessage_ConvertsAssistantMessage()
    {
        var message = new OpenAIEndpoint.ChatMessage("assistant", "I can help");
        var aiMessage = message.ToAIChatMessage();

        Assert.That(aiMessage.Role, Is.EqualTo(AIExtensions.ChatRole.Assistant));
        Assert.That(aiMessage.Text, Is.EqualTo("I can help"));
    }

    [Test]
    public void ToAIChatMessage_ConvertsToolMessage()
    {
        var message = new OpenAIEndpoint.ChatMessage("tool", "Tool result");
        var aiMessage = message.ToAIChatMessage();

        Assert.That(aiMessage.Role, Is.EqualTo(AIExtensions.ChatRole.Tool));
    }

    [Test]
    public void ToAIChatMessage_DefaultsToUserRole()
    {
        var message = new OpenAIEndpoint.ChatMessage("invalid", "Content");
        var aiMessage = message.ToAIChatMessage();

        Assert.That(aiMessage.Role, Is.EqualTo(AIExtensions.ChatRole.User));
    }

    [Test]
    public void ToAIChatMessage_HandlesNullContent()
    {
        var message = new OpenAIEndpoint.ChatMessage("user", null);
        var aiMessage = message.ToAIChatMessage();

        Assert.That(aiMessage.Text, Is.EqualTo(string.Empty));
    }

    [Test]
    public void ToAIChatMessage_ConvertsToolCalls()
    {
        var toolCalls = new[]
        {
            new OpenAIEndpoint.ToolCall("call-1", "function", new OpenAIEndpoint.FunctionCall("testFunc", @"{""key"":""value""}"))
        };
        var message = new OpenAIEndpoint.ChatMessage("assistant", null, null, toolCalls);
        var aiMessage = message.ToAIChatMessage();

        var functionCallContent = aiMessage.Contents.OfType<AIExtensions.FunctionCallContent>().FirstOrDefault();
        Assert.That(functionCallContent, Is.Not.Null);
        Assert.That(functionCallContent!.CallId, Is.EqualTo("call-1"));
        Assert.That(functionCallContent.Name, Is.EqualTo("testFunc"));
    }

    [Test]
    public void ToAIChatMessage_ConvertsToolCallIdResponse()
    {
        var message = new OpenAIEndpoint.ChatMessage("tool", "Tool response", null, null, "call-1");
        var aiMessage = message.ToAIChatMessage();

        var functionResultContent = aiMessage.Contents.OfType<AIExtensions.FunctionResultContent>().FirstOrDefault();
        Assert.That(functionResultContent, Is.Not.Null);
        Assert.That(functionResultContent!.CallId, Is.EqualTo("call-1"));
    }

    [Test]
    public void FromAIChatMessage_ConvertsToUserMessage()
    {
        var aiMessage = new AIExtensions.ChatMessage(AIExtensions.ChatRole.User, "Hello");
        var message = aiMessage.FromAIChatMessage();

        Assert.That(message.Role, Is.EqualTo("user"));
        Assert.That(message.Content, Is.EqualTo("Hello"));
    }

    [Test]
    public void FromAIChatMessage_ConvertsToAssistantMessage()
    {
        var aiMessage = new AIExtensions.ChatMessage(AIExtensions.ChatRole.Assistant, "Response");
        var message = aiMessage.FromAIChatMessage();

        Assert.That(message.Role, Is.EqualTo("assistant"));
        Assert.That(message.Content, Is.EqualTo("Response"));
    }

    [Test]
    public void FromAIChatMessage_ConvertsToSystemMessage()
    {
        var aiMessage = new AIExtensions.ChatMessage(AIExtensions.ChatRole.System, "System prompt");
        var message = aiMessage.FromAIChatMessage();

        Assert.That(message.Role, Is.EqualTo("system"));
        Assert.That(message.Content, Is.EqualTo("System prompt"));
    }

    [Test]
    public void FromAIChatMessage_ConvertsFunctionCall()
    {
        var aiMessage = new AIExtensions.ChatMessage(AIExtensions.ChatRole.Assistant, string.Empty);
        aiMessage.Contents.Add(new AIExtensions.FunctionCallContent("call-1", "testFunc", new Dictionary<string, object?> { ["key"] = "value" }));

        var message = aiMessage.FromAIChatMessage();

        Assert.That(message.ToolCalls, Is.Not.Null);
        Assert.That(message.ToolCalls, Has.Length.GreaterThan(0));
        Assert.That(message.ToolCalls![0].Id, Is.EqualTo("call-1"));
        Assert.That(message.ToolCalls[0].Function.Name, Is.EqualTo("testFunc"));
    }

    [Test]
    public void FromAIChatMessage_ConvertsFunctionResult()
    {
        var aiMessage = new AIExtensions.ChatMessage(AIExtensions.ChatRole.Tool, string.Empty);
        aiMessage.Contents.Add(new AIExtensions.FunctionResultContent("call-1", "Result data"));

        var message = aiMessage.FromAIChatMessage();

        Assert.That(message.ToolCallId, Is.EqualTo("call-1"));
        Assert.That(message.Content, Is.EqualTo("Result data"));
    }

    [Test]
    public void ToAIChatOptions_ConvertsTemperature()
    {
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", Array.Empty<OpenAIEndpoint.ChatMessage>(), 0.7f);
        var options = request.ToAIChatOptions();

        Assert.That(options.Temperature, Is.EqualTo(0.7f));
    }

    [Test]
    public void ToAIChatOptions_ConvertsMaxTokens()
    {
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", Array.Empty<OpenAIEndpoint.ChatMessage>(), null, 100);
        var options = request.ToAIChatOptions();

        Assert.That(options.MaxOutputTokens, Is.EqualTo(100));
    }

    [Test]
    public void ToAIChatOptions_ConvertsTopP()
    {
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", Array.Empty<OpenAIEndpoint.ChatMessage>(), null, null, 0.9f);
        var options = request.ToAIChatOptions();

        Assert.That(options.TopP, Is.EqualTo(0.9f));
    }

    [Test]
    public void ToAIChatOptions_ConvertsFrequencyPenalty()
    {
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", Array.Empty<OpenAIEndpoint.ChatMessage>(), null, null, null, 0.5f);
        var options = request.ToAIChatOptions();

        Assert.That(options.FrequencyPenalty, Is.EqualTo(0.5f));
    }

    [Test]
    public void ToAIChatOptions_ConvertsPresencePenalty()
    {
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", Array.Empty<OpenAIEndpoint.ChatMessage>(), null, null, null, null, 0.5f);
        var options = request.ToAIChatOptions();

        Assert.That(options.PresencePenalty, Is.EqualTo(0.5f));
    }

    [Test]
    public void ToAIChatOptions_ConvertsStopSequences()
    {
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", Array.Empty<OpenAIEndpoint.ChatMessage>(), null, null, null, null, null, new[] { "END", "STOP" });
        var options = request.ToAIChatOptions();

        Assert.That(options.StopSequences, Has.Count.EqualTo(2));
        Assert.That(options.StopSequences, Does.Contain("END"));
        Assert.That(options.StopSequences, Does.Contain("STOP"));
    }

    [Test]
    public void ToAIChatOptions_IgnoresNullValues()
    {
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", Array.Empty<OpenAIEndpoint.ChatMessage>(), null, null, null);
        var options = request.ToAIChatOptions();

        Assert.That(options.Temperature, Is.Null);
        Assert.That(options.MaxOutputTokens, Is.Null);
        Assert.That(options.TopP, Is.Null);
    }

    [Test]
    public void ToAIChatOptions_IgnoresEmptyStopSequences()
    {
        var request = new OpenAIEndpoint.ChatCompletionRequest("gpt-4", Array.Empty<OpenAIEndpoint.ChatMessage>(), null, null, null, null, null, Array.Empty<string>());
        var options = request.ToAIChatOptions();

        Assert.That(options.StopSequences, Is.Null.Or.Empty);
    }

    #endregion
}
