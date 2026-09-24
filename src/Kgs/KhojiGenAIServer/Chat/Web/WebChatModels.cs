// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using System.Collections.Concurrent;
using System.Text.Json.Serialization;

namespace KhojiGenAIServer.Chat.Web;

record WebChatAction(string Type = "button", string Label = "", string Value = ""); // type is only button for now
[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]
[JsonDerivedType(typeof(WebChatMessage), "text")]
[JsonDerivedType(typeof(WebChatDataMessage), "data")]
[JsonDerivedType(typeof(WebChatCardMessage), "card")]
class WebChatMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Sender { get; set; } = "bot"; // "user" or "bot"
    public string Type { get; set; } = "text";
    public string Text { get; set; } = "";
}

class WebChatDataMessage : WebChatMessage
{
    public object? Data { get; set; }

    public WebChatDataMessage(object? data)
    {
        this.Type = "data";
        this.Data = data;
    }
}

class WebChatCardMessage : WebChatMessage
{
    public WebChatCardMessage()
    {
        this.Type = "card";
        this.Actions = new();
    }

    public List<WebChatAction> Actions { get; set; } // optional (buttons)
}

record WebConversation(Guid ConversationId, int InstanceId, int UserId, int SprintId, List<WebChatMessage> Messages);

static class WebChatStore
{
    static readonly ConcurrentDictionary<int, WebConversation> conversations = new();

    public static WebConversation InitiateConversation(int instanceId, int userId, int sprintId) =>
        conversations[userId] = new WebConversation(Guid.NewGuid(), instanceId, userId, sprintId, []);

    public static WebConversation? GetConversation(int userId) =>
        conversations.TryGetValue(userId, out var conversation) ? conversation : null;
}
