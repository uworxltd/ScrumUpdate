// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using System.Text;

namespace KhojiGenAIServer.Features;

static class RequestsLogging
{
    static async Task<string> allocateLogNumber(string absolutePath, string toWrite)
    {
        Directory.CreateDirectory(absolutePath);

        var files = Directory.GetFiles(absolutePath, "*.http");
        int nextNumber = 1;
        if (files.Length > 0)
        {
            var max = files
                .Select(f => Path.GetFileNameWithoutExtension(f)) // "0049"
                .Select(name => int.TryParse(name, out var n) ? n : 0)
                .DefaultIfEmpty(0)
                .Max();

            nextNumber = max + 1;
        }

        var number = $"{nextNumber:D4}";
        var filename = Path.Combine(absolutePath, $"{number}.http");
        //await File.WriteAllTextAsync(filename, requestBody);

        await File.WriteAllTextAsync(filename, toWrite);

        return number;
    }

    static async Task<string> saveRequestAsHttpFileAsync(HttpContext context, string absolutePath, string requestBody)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"{context.Request.Method} {context.Request.Path + context.Request.QueryString} HTTP/1.1");
        foreach (var header in context.Request.Headers)
            sb.AppendLine($"{header.Key}: {header.Value}");

        sb.AppendLine(); // Blank lines between headers and body
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(requestBody))
            sb.AppendLine(requestBody);

        return await allocateLogNumber(absolutePath, sb.ToString());
    }

    public static async Task<string> LogRequestAsync(this IWebHostEnvironment environment, HttpContext context)
    {
        if (!Globals.IsDebugging) return "0000"; // Skip logging in production or non-debug mode

        context.Request.EnableBuffering(); // Enable buffering so we can read the body multiple times
        using var reader = new StreamReader(context.Request.Body, leaveOpen: true); // Read body as string
        var bodyText = await reader.ReadToEndAsync();
        context.Request.Body.Position = 0; // Reset stream position so JSON deserialization still works

        var absolutePath = Path.Combine(environment.ContentRootPath, "requests");
        return await saveRequestAsHttpFileAsync(context, absolutePath, bodyText); // Log / save body
    }

    public static async Task<string?> AllocateLogNumber()
    {
        if (!Globals.IsDebugging || string.IsNullOrWhiteSpace(Globals.RequestsFolderAbsolutePath)) return null;
        return await allocateLogNumber(Globals.RequestsFolderAbsolutePath, "DUMMY");
    }

    public static async Task<string?> LogLlmRequestAsync(string logNumber, string content)
    {
        if (!Globals.IsDebugging || string.IsNullOrWhiteSpace(Globals.RequestsFolderAbsolutePath)) return null;
        var toReturn = $"{logNumber}-llm-request.txt";
        var absolutePath = Path.Combine(Globals.RequestsFolderAbsolutePath, toReturn);
        await File.WriteAllTextAsync(absolutePath, content);
        return toReturn;
    }

    public static async Task<string?> LogLlmResponseAsync(string logNumber, string content)
    {
        if (!Globals.IsDebugging || string.IsNullOrWhiteSpace(Globals.RequestsFolderAbsolutePath)) return null;
        var toReturn = $"{logNumber}-llm-response.txt";
        var absolutePath = Path.Combine(Globals.RequestsFolderAbsolutePath, toReturn);
        await File.WriteAllTextAsync(absolutePath, content);
        return toReturn;
    }

    public static async Task<string?> LogLlmRequestAsync(this IWebHostEnvironment environment, string logNumber, string content)
    {
        if (environment == null || !Globals.IsDebugging) return null;
        var toReturn = $"{logNumber}-llm-request.txt";
        var absolutePath = Path.Combine(environment.ContentRootPath, "requests", toReturn);
        await File.WriteAllTextAsync(absolutePath, content);
        return toReturn;
    }

    public static async Task<string?> LogLlmResponseAsync(this IWebHostEnvironment environment, string logNumber, string content)
    {
        if (environment == null || !Globals.IsDebugging) return null;
        var toReturn = $"{logNumber}-llm-response.txt";
        var absolutePath = Path.Combine(environment.ContentRootPath, "requests", toReturn);
        await File.WriteAllTextAsync(absolutePath, content);
        return toReturn;
    }

    public static async Task<string?> LogExtractedJsonAsync(this IWebHostEnvironment environment, string logNumber, string content)
    {
        if (environment == null || !Globals.IsDebugging) return null;
        var toReturn = $"{logNumber}-llm.json";
        var absolutePath = Path.Combine(environment.ContentRootPath, "requests", toReturn);
        await File.WriteAllTextAsync(absolutePath, content);
        return toReturn;
    }
}
