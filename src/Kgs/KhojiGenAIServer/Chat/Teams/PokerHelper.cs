// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Chat.Teams;

class PokerHelper
{
    static Dictionary<string, Dictionary<string, decimal>> Pokers = new();

    public static Dictionary<string, decimal> GetPokerResults(string key)
    {
        if (!Pokers.ContainsKey(key))
            Pokers.Add(key, new Dictionary<string, decimal>());

        return Pokers[key];
    }

    public static void ClearPoker(string key)
    {
        if (Pokers.ContainsKey(key))
            Pokers[key].Clear();
    }
}