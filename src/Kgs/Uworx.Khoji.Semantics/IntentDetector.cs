// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using System.Numerics.Tensors;

namespace Uworx.Khoji.Semantics;

public class IntentDetector
{
    public enum SupportedIntents { Greeting, ScrumUpdate, WeeklyRetro };

    record SentenceVector(string Intent, string Sentence, float[] Embedding);

    static bool initialized = false;
    static IEnumerable<SentenceVector> intentSentences = null;

    static void initialize(string intentsFolder)
    {
        if (!initialized && Directory.Exists(intentsFolder))
        {
            using OnnxEncoder encoder = new();
            var txtFiles = Directory.EnumerateFiles(
                intentsFolder, "*.txt", SearchOption.TopDirectoryOnly);
            var allLinesWithFile = txtFiles
                .SelectMany(file => File.ReadAllLines(file)
                    .Select(line => new
                    {
                        FileName = Path.GetFileNameWithoutExtension(file),
                        Line = line
                    }))
                .ToArray();
            intentSentences = allLinesWithFile.Select(
                s => new SentenceVector(s.FileName, s.Line, encoder.Encode(s.Line))).ToArray();
            // we need intentsentences to be materialized as encoder will be disposed

            initialized = true;
        }
    }

    IntentDetector() { }

    public static IntentDetector LoadIntentsFrom(string intentsFolder)
    {
        IntentDetector.initialize(intentsFolder);
        return new IntentDetector();
    }

    public bool MatchesIntent(string question, string forIntent = null)
    {
        using OnnxEncoder encoder = new();
        if (question is null || question.Length < 2)                    // atleast a Hi
            return false;                                               // early fail

        var input = encoder.Encode(question);
        var query = intentSentences.Select(v => new
        {
            v.Intent,
            v.Sentence,
            Similarity = TensorPrimitives.CosineSimilarity(input, v.Embedding)
        });

        if (!string.IsNullOrEmpty(forIntent))
            query = query.Where(i => i.Intent.Equals(forIntent, StringComparison.InvariantCultureIgnoreCase));

        var mostMatched = query.OrderByDescending(v => v.Similarity).FirstOrDefault();      // most matched
        return mostMatched != null && mostMatched.Similarity > 0.6f;                        // similarity threshold
    }
}
