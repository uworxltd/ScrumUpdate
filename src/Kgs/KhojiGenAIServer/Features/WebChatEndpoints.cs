// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Web;
using KhojiGenAIServer.Data;

namespace KhojiGenAIServer.Features;

static class WebChatEndpoints
{
    public static void MapWebChatFeatureEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/public/api/chat")
            .WithGroupName("public")
            .RequireHost("*:8080", "*")
            .WithTags(nameof(WebChatEndpoints))
            .RequireCors("WebChat");

        group.MapPut("{instanceId}/user/{userId}/sprint/{sprintId}", (ILogger<KbsGateway> logger,
            int instanceId, int userId, int sprintId) =>
        {
            if (userId <= 0) return Results.BadRequest();
            if (instanceId <= 0) return Results.BadRequest();
            if (sprintId <= 0) return Results.BadRequest();     // validate?

            var g = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
            if (!g.VerifyWebChatUser(instanceId, userId, out string _, out string message)) return Results.BadRequest(message);

            return Results.Ok(WebChatStore.InitiateConversation(instanceId, userId, sprintId));
        })
        .WithName("Initiate a Conversation");

        group.MapGet("{instanceId}/user/{userId}/conversation/{conversationId}", (ILogger<KbsGateway> logger,
            int instanceId, int userId, Guid conversationId) =>
        {
            if (userId <= 0) return Results.BadRequest();
            if (instanceId <= 0) return Results.BadRequest();
            if (conversationId == Guid.Empty) return Results.BadRequest();

            var g = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
            if (!g.VerifyWebChatUser(instanceId, userId, out string _, out string message)) return Results.BadRequest(message);

            var conversation = WebChatStore.GetConversation(userId);
            if (null == conversation) return Results.NotFound();
            if (conversation.ConversationId != conversationId) return Results.NotFound();

            return Results.Ok(conversation);
        })
        .WithName("Gets Conversation Messages");

        group.MapPost("{instanceId}/user/{userId}/conversation/{conversationId}", (IServiceProvider service,
            int instanceId, int userId, Guid conversationId, WebChatMessage userMessage) =>
            {
                if (userId <= 0) return Results.BadRequest();
                if (instanceId <= 0) return Results.BadRequest();
                if (conversationId == Guid.Empty) return Results.BadRequest();

                var g = new KbsGateway(service.GetService<ILogger<KbsGateway>>(), KhojiConstants.DatabaseConnectionString);
                if (!g.VerifyWebChatUser(instanceId, userId, out string email, out string message)) return Results.BadRequest(message);

                var conversation = WebChatStore.GetConversation(userId);
                if (null == conversation) return Results.NotFound();
                if (conversation.ConversationId != conversationId) return Results.NotFound();

                return Results.Ok(WebChatBot.MessageReceived(service, email, conversation, userMessage));
            })
            .WithName("Sends a User message to the conversation");
    }
}
