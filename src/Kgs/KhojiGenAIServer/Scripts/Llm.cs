using Microsoft.Extensions.AI;
using Anthropic;
using OpenAI;
using System.ClientModel;
using System.IO;                            // we need this to make this work in Notebook
using ChatMessage = Microsoft.Extensions.AI.ChatMessage;
                                            // this file is being loaded as a script in Notebook
//namespace KhojiGenAIServer.Scripts;       // .NET Interactive doesnt support namespace when loading script

static class Llm
{
    // Setting up Chat Completition
    static IChatClient chatClient = null;

    static Llm()
    {
        var llmApi = Environment.GetEnvironmentVariable("LLM_API")?.ToLowerInvariant() ?? "claude";
        if (llmApi == "openai")
        {
            var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            var apiUrl = Environment.GetEnvironmentVariable("OPENAI_API_URL");
            var model = Environment.GetEnvironmentVariable("OPENAI_MODEL");

            if (!string.IsNullOrWhiteSpace(model) && !string.IsNullOrWhiteSpace(apiUrl) && !string.IsNullOrWhiteSpace(apiKey))
            {
                var options = new OpenAIClientOptions
                {
                    Endpoint = new Uri(apiUrl)
                };
                var openAIClient = new OpenAIClient(new ApiKeyCredential(apiKey), options);
                chatClient = openAIClient.GetChatClient(model).AsIChatClient();
            }
        }
        else
        {
            var apiKey = Environment.GetEnvironmentVariable("CLAUDE_API_KEY");
            var model = Environment.GetEnvironmentVariable("CLAUDE_MODEL");

            if (!string.IsNullOrEmpty(model) && !string.IsNullOrWhiteSpace(apiKey))
            {
                var client = new AnthropicClient() { ApiKey = apiKey };
                var chatClientBuilder = client.AsIChatClient(model)
                    .AsBuilder()
                    .ConfigureOptions(options =>
                    {
                        options.MaxOutputTokens = 8192; //aligned with KIA
                    });

                chatClient = chatClientBuilder.Build();
            }
        }
    }

    public static void InvokPrompt(string prompt, string input)
    {
        if (string.IsNullOrEmpty(prompt) || string.IsNullOrEmpty(input))
        {
            Console.WriteLine("Prompt or input cannot be empty.");
            return;
        }

        if (chatClient == null)
        {
            Console.WriteLine("Chat client is not initialized.");
            return;
        }

        List<ChatMessage> messages = new();

        var promptsFolder = Path.Combine(Directory.GetCurrentDirectory(), "..", "src", "KhojiGenAIServer", "Prompts");
        var xmlFile = Path.Combine(promptsFolder, $"{prompt}.xml");
        if (File.Exists(xmlFile))
        {
            var systemPrompt = File.ReadAllText(xmlFile);
            messages.Add(new ChatMessage(ChatRole.System, systemPrompt));
            messages.Add(new ChatMessage(ChatRole.User, input));
        }
        else
        {
            var file = Path.Combine(promptsFolder, $"{prompt}.txt");
            if (!File.Exists(file))
                Console.WriteLine($"Couldnt find the Prompt file (XML/TXT) in {promptsFolder}");

            var systemPrompt = File.ReadAllText(file);
            if (systemPrompt.Contains("{input}"))
                messages.Add(new ChatMessage(ChatRole.User, systemPrompt.Replace("{input}", input)));
            else
            {
                messages.Add(new ChatMessage(ChatRole.System, systemPrompt));
                messages.Add(new ChatMessage(ChatRole.User, input));
            }
        }

        try
        {
            var response = chatClient.GetResponseAsync(messages).Result;

            if (response != null)
            {
                Console.WriteLine($"Input Tokens: {response.Usage.InputTokenCount}");
                Console.WriteLine($"Output Tokens: {response.Usage.OutputTokenCount}");
                Console.WriteLine($"Total Tokens Used: {response.Usage.TotalTokenCount}");

                if (response.Messages.Count > 0)
                {
                    foreach (var message in response.Messages)
                        Console.WriteLine($"{message.Role}: {message.Text}");
                }
            }
            else
                Console.WriteLine("No response received from the chat client.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error invoking prompt: {ex.Message}");
        }
    }
}