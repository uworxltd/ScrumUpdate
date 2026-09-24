// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Microsoft.ML.Tokenizers;
using System.Reflection;

namespace Uworx.Khoji.Semantics;

class OnnxEncoder : IDisposable
{
    static string extractResourceToTempFile(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
            throw new Exception($"Resource not found: {resourceName}");

        string tempPath = Path.Combine(Path.GetTempPath(), resourceName);

        using var fileStream = new FileStream(tempPath, FileMode.Create, FileAccess.Write);
        stream.CopyTo(fileStream);

        return tempPath;
    }

    static float[] meanPooling(Tensor<float> tokenEmbeddings, Tensor<long> attentionMask)
    {
        int seqLen = tokenEmbeddings.Dimensions[1];
        int hiddenSize = tokenEmbeddings.Dimensions[2];

        float[] sentenceEmbedding = new float[hiddenSize];
        long count = 0;

        for (int i = 0; i < seqLen; i++)
        {
            if (attentionMask[0, i] == 1)
            {
                count++;
                for (int j = 0; j < hiddenSize; j++)
                    sentenceEmbedding[j] += tokenEmbeddings[0, i, j];
            }
        }

        for (int j = 0; j < hiddenSize; j++)
            sentenceEmbedding[j] /= count;

        return sentenceEmbedding;
    }

    static float[] generateEmbedding(string text, BertTokenizer tokenizer, InferenceSession session)
    {
        var encoded = tokenizer.EncodeToIds(text);
        int seqLen = encoded.Count;

        var inputIds = new DenseTensor<long>(new[] { 1, seqLen });
        var attentionMask = new DenseTensor<long>(new[] { 1, seqLen });
        var tokenTypeIds = new DenseTensor<long>(new[] { 1, seqLen });

        for (int i = 0; i < seqLen; i++)
        {
            inputIds[0, i] = encoded[i];
            attentionMask[0, i] = 1;
            tokenTypeIds[0, i] = 0;   // Always 0 for single-sentence input
        }

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIds),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask),
            NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIds)
        };

        using var results = session.Run(inputs);

        var output = results.First().AsTensor<float>();

        return meanPooling(output, attentionMask);
    }

    readonly BertTokenizer tokenizer = null;
    readonly InferenceSession session = null;

    public OnnxEncoder()
    {
        //foreach (var r in Assembly.GetExecutingAssembly().GetManifestResourceNames())
        //    logger.LogInformation(r);

        // from https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/tree/main
        string modelPath = extractResourceToTempFile("Uworx.Khoji.Semantics.Resources.MiniLM-L6-v2-qint8_avx512.onnx");
        string vocabPath = extractResourceToTempFile("Uworx.Khoji.Semantics.Resources.vocab.txt");
        tokenizer = BertTokenizer.Create(vocabPath); // toLowercase: true
        session = new InferenceSession(modelPath);
    }

    public float[] Encode(string sentence)
    {
        //string sentence = "I love natural language processing";
        float[] embedding = generateEmbedding(sentence, tokenizer, session);
        //logger.LogInformation($"Embedding Length: {embedding.Length}");
        //logger.LogInformation(string.Join(", ", embedding.Take(10)));
        return embedding;
    }

    public void Dispose()
    {
        session?.Dispose();
    }
}
