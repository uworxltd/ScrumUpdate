// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Agents;
using KhojiGenAIServer.Features;

namespace KhojiGenAIServer.Chat.Web;

static class WebChatBot
{
    public static WebChatMessage MessageReceived(IServiceProvider service,
        string userEmail,
        WebConversation conversation, WebChatMessage userMessage)
    {
        var webAgent = service.CreateWebChatAgent(conversation, userEmail);

        userMessage.Sender = "user";
        conversation.Messages.Add(userMessage);

        //if (webAgent is WebChatAgent webChatAgent) // will not work as WebChatAgent inherits from SK base class
        //    return webChatAgent.InvokeAgent(userEmail, conversation, userMessage);
        //else
        if (webAgent is BaseFrameworkAgent aiAgent)
            return new WebChatMessage
            {
                Text = aiAgent.Invoke(conversation.ConversationId.ToString(), userMessage.Text).Result
            };

        return null;
    }
}
