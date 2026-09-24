// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#pragma warning disable CS8632

using KhojiGenAIServer.Data;
using Microsoft.Agents.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.TeamsFx.Conversation;
using System.Text.Json;

namespace KhojiGenAIServer.Chat.Teams;

class NotificationStore : IConversationReferenceStore
{
    public async Task<bool> Add(
        string key,
        ConversationReference reference,
        ConversationReferenceStoreAddOptions options,
        CancellationToken cancellationToken = default
    )
    {
        var json = JsonSerializer.Serialize(reference);

        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
        var entity = await db.ConversationReferences
            .FirstOrDefaultAsync(x => x.Key == key, cancellationToken);

        if (entity != null)
        {
            // Already exists
            if (options?.Overwrite == true)
            {
                entity.ReferenceJson = json;
                await db.SaveChangesAsync(cancellationToken);
                return true;
            }
            return false;
        }

        entity = new ConversationReferenceEntity
        {
            Key = key,
            ReferenceJson = json
        };

        db.ConversationReferences.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<PagedData<ConversationReference>> List(
        int? pageSize = null,
        string continuationToken = null,
        CancellationToken cancellationToken = default
    )
    {
        int size = pageSize ?? 50;
        int skip = 0;

        if (!string.IsNullOrEmpty(continuationToken) &&
            int.TryParse(continuationToken, out var parsed))
        {
            skip = parsed;
        }

        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
        var entities = await db.ConversationReferences
            .OrderBy(x => x.Key)
            .Skip(skip)
            .Take(size)
            .ToListAsync(cancellationToken);

        var results = entities
            .Select(e => JsonSerializer.Deserialize<ConversationReference>(e.ReferenceJson)!)
            .ToList();

        string newContinuationToken = entities.Count == size
            ? (skip + size).ToString()
            : null;

        return new PagedData<ConversationReference>
        {
            Data = [.. results],
            ContinuationToken = newContinuationToken
        };
    }

    public async Task<bool> Remove(
        string key,
        ConversationReference reference,
        CancellationToken cancellationToken = default
    )
    {
        using var db = new KGSDbContext(KhojiConstants.DatabaseConnectionString);
        var entity = await db.ConversationReferences
            .FirstOrDefaultAsync(x => x.Key == key, cancellationToken);

        if (entity == null) return false;

        db.ConversationReferences.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
