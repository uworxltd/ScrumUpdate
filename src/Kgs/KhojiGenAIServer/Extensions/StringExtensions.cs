// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using System.Text;

namespace KhojiGenAIServer.Extensions;

static class StringExtensions
{
    public static string? Left(this string? value, int n)
    {
        if (value == null)
            return null;

        if (n <= 0)
            return string.Empty;

        return value.Length <= n
            ? value
            : value.Substring(0, n);
    }

    public static bool HasText(this string? input) =>
        input?.Trim().Length > 0;

    public static string ReplaceDoubleBracesWithPercents(this string input)
    {
        StringBuilder result = new StringBuilder();
        int i = 0;

        while (i < input.Length)
        {
            // Look for opening {{
            if (i + 1 < input.Length && input[i] == '{' && input[i + 1] == '{')
            {
                int start = i + 2;
                int end = input.IndexOf("}}", start);

                if (end != -1) // Found closing }}
                {
                    string inside = input.Substring(start, end - start);
                    result.Append('%').Append(inside).Append('%');
                    i = end + 2; // Move past }}
                    continue;
                }
            }

            // If no match, copy current char
            result.Append(input[i]);
            i++;
        }

        return result.ToString();
    }

    public static string MaskSecret(this string s,
        int visibleStart = 4, int visibleEnd = 4,
        char maskChar = '*',
        bool preserveLength = true, bool preserveFormat = false)
    {
        if (string.IsNullOrEmpty(s)) return s;
        if (visibleStart < 0) visibleStart = 0;
        if (visibleEnd < 0) visibleEnd = 0;

        int len = s.Length;
        if (visibleStart + visibleEnd >= len) // If visible counts cover whole string, return original (no masking needed)
            return s;

        if (!preserveFormat)
        {
            int maskedCount = len - (visibleStart + visibleEnd);
            var sb = new StringBuilder(len);
            sb.Append(s.Substring(0, visibleStart));
            for (int i = 0; i < maskedCount; i++) sb.Append(maskChar);
            sb.Append(s.Substring(len - visibleEnd, visibleEnd));
            return sb.ToString();
        }
        else // preserveFormat: leave non-alphanumeric characters as-is; mask letters/digits where appropriate
        {
            var sb = new StringBuilder(len);
            int visibleLeft = visibleStart;
            int visibleRight = visibleEnd;

            var maskableIndices = new List<int>(); // maskable index list of positions that are letters/digits
            for (int i = 0; i < len; i++)
                if (char.IsLetterOrDigit(s[i])) maskableIndices.Add(i);

            if (visibleLeft + visibleRight >= maskableIndices.Count) // If not enough maskable chars to require masking, return original
                return s;

            // Determine which maskable indices should remain visible: the first visibleLeft maskable indices and last visibleRight maskable indices
            var visibleSet = new HashSet<int>();
            for (int i = 0; i < visibleLeft; i++)
                visibleSet.Add(maskableIndices[i]);
            for (int i = 0; i < visibleRight; i++)
                visibleSet.Add(maskableIndices[maskableIndices.Count - 1 - i]);

            foreach (var i in Enumerable.Range(0, len)) // Build output
            {
                char c = s[i];
                if (!char.IsLetterOrDigit(c))
                    sb.Append(c); // preserve formatting characters
                else
                {
                    if (visibleSet.Contains(i))
                        sb.Append(c); // keep visible characters
                    else
                        sb.Append(maskChar); // mask
                }
            }

            // If preserveLength==false, you may want shorter masked section — current preserveFormat always outputs same length as input.
            // (We keep preserveLength behavior consistent: preserveFormat implies preserving length.)
            return sb.ToString();
        }
    }

    public static string? SplitAndGiveNth(this string? input, string separator, int nth)
    {
        if (string.IsNullOrEmpty(input) || nth < 0)
            return null;

        var parts = input.Split(new string[] { separator }, StringSplitOptions.None);

        return nth < parts.Length ? parts[nth] : null;
    }
}
