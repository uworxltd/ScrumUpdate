// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Features.Kia;

internal class NameMasker
{
    // using two dictionaries to keep things O(n)
    readonly Dictionary<string, string> originalToMasked = [];
    readonly Dictionary<string, string> maskedToOriginal = [];
    int counter = 1;

    public string GetMasked(string originalName)
    {
        if (string.IsNullOrWhiteSpace(originalName)) return originalName;

        if (originalToMasked.TryGetValue(originalName, out var masked))
            return masked;

        masked = $"Masked_Name_{counter++}";

        originalToMasked[originalName] = masked;
        maskedToOriginal[masked] = originalName;

        return masked;
    }

    public IEnumerable<KeyValuePair<string, string>> GetReplacements()
        => maskedToOriginal.OrderByDescending(kvp => kvp.Key.Length);

    public bool TryGetValue(string masked, out string original)
        => maskedToOriginal.TryGetValue(masked, out original);

    public bool TryGetMasked(string original, out string masked)
        => originalToMasked.TryGetValue(original, out masked);

    public string Unmask(string maskedName)
    {
        if (string.IsNullOrWhiteSpace(maskedName)) return maskedName;

        return maskedToOriginal.TryGetValue(maskedName, out var original)
            ? original
            : null;
    }

    public override string ToString()
        => string.Join(", ", originalToMasked);
}
