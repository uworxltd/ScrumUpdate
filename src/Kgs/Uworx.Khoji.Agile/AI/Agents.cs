// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Uworx.Khoji.Agile.AI;

/// <summary>
/// Default implementation of tool registry.
/// 
/// Responsibilities:
/// - Store registered AITool instances
/// - Provide tool listing for LLM instructions
/// 
/// Design:
/// Now simply wraps AITool instances from Microsoft.Extensions.AI.
/// Tool execution is handled by AIFunction.InvokeAsync() or FunctionInvokingChatClient.
/// This registry's job is only to manage registration and retrieval.
/// </summary>
public class DefaultToolRegistry : IToolRegistry
{
    readonly Dictionary<string, AITool> toolsById;
    readonly ILogger<DefaultToolRegistry> logger;

    public DefaultToolRegistry(ILogger<DefaultToolRegistry> logger)
    {
        ArgumentNullException.ThrowIfNull(logger);

        toolsById = new Dictionary<string, AITool>(StringComparer.Ordinal);
        this.logger = logger;
    }

    /// <summary>
    /// Register a tool for availability.
    /// </summary>
    /// <param name="tool">AITool to register</param>
    /// <exception cref="ArgumentNullException">If tool is null</exception>
    /// <exception cref="InvalidOperationException">If tool with same name already registered</exception>
    public void RegisterTool(AITool tool)
    {
        ArgumentNullException.ThrowIfNull(tool);

        if (toolsById.ContainsKey(tool.Name))
        {
            throw new InvalidOperationException(
                $"Tool with name '{tool.Name}' is already registered");
        }

        toolsById[tool.Name] = tool;
        logger.LogInformation("Tool registered: {ToolName}", tool.Name);
    }

    /// <summary>
    /// Register multiple tools at once.
    /// </summary>
    public void RegisterTools(IEnumerable<AITool> tools)
    {
        ArgumentNullException.ThrowIfNull(tools);

        foreach (var tool in tools)
        {
            RegisterTool(tool);
        }
    }

    /// <summary>
    /// Get all registered tools.
    /// </summary>
    public IReadOnlyList<AITool> GetAvailableTools()
    {
        return toolsById.Values.ToList();
    }

    /// <summary>
    /// Clear all registered tools.
    /// Useful for testing.
    /// </summary>
    public void Clear()
    {
        toolsById.Clear();
        logger.LogInformation("Tool registry cleared");
    }
}

/// <summary>
/// In-memory implementation of agent memory for PoC.
/// 
/// Responsibilities:
/// - Store conversation history in memory
/// - Provide simple windowing of recent context
/// - No persistence (ephemeral)
/// - No vector similarity (simple recency-based)
/// 
/// Design:
/// This is a minimal PoC implementation. Production would:
/// - Persist to database
/// - Use vector similarity for relevance
/// - Implement summarization for long conversations
/// - Handle multi-user sessions
/// 
/// For now: Single in-memory buffer, windowing by recency.
/// </summary>
public class InMemoryAgentMemory : IAgentMemory
{
    readonly int windowSize;
    readonly ILogger<InMemoryAgentMemory> logger;

    /// <summary>
    /// Create in-memory memory with optional context window.
    /// </summary>
    /// <param name="windowSize">How many recent messages to return as context (0 = all)</param>
    public InMemoryAgentMemory(int windowSize = 0, ILogger<InMemoryAgentMemory>? logger = null)
    {
        this.windowSize = Math.Max(0, windowSize);
        this.logger = logger ?? new Microsoft.Extensions.Logging.Abstractions.NullLogger<InMemoryAgentMemory>();
    }

    /// <summary>
    /// Load relevant context (for PoC: returns empty list).
    /// 
    /// In future, this would:
    /// - Search vector DB for semantically similar messages
    /// - Return summarized context for long conversations
    /// - Filter by relevance threshold
    /// 
    /// For now: Just return empty list and let conversation history handle context.
    /// This keeps the conversation thread coherent in state.Messages.
    /// </summary>
    public Task<IReadOnlyList<ChatMessage>> LoadRelevantContextAsync(
        string input,
        CancellationToken cancellationToken = default)
    {
        // PoC: No-op - orchestration loop already maintains full conversation history
        // Vector DB and semantic search can be added

        logger.LogDebug("LoadRelevantContextAsync called (PoC: returns empty)");

        return Task.FromResult<IReadOnlyList<ChatMessage>>(new List<ChatMessage>());
    }

    /// <summary>
    /// Persist agent state (for PoC: no-op).
    /// 
    /// In future, this would:
    /// - Write conversation to database
    /// - Index messages in vector DB
    /// - Update session metadata
    /// - Handle cleanup of old sessions
    /// 
    /// For now: All state is ephemeral (in memory).
    /// </summary>
    public Task PersistAsync(
        AgentState state,
        CancellationToken cancellationToken = default)
    {
        // PoC: No-op - state stays in memory
        logger.LogDebug(
            "PersistAsync called (PoC: no-op) - Iteration {Iteration}, Messages {Count}",
            state.IterationCount,
            state.Messages.Count);

        return Task.CompletedTask;
    }
}


/// <summary>
/// Core implementation of the agent orchestration runtime.
/// 
/// Responsibilities:
/// - Execute bounded reasoning loop with IChatClient
/// - Detect and execute tool calls
/// - Manage conversation history
/// - Enforce execution policies (MaxIterations, tool permissions)
/// - Emit observability events
/// 
/// Contract:
/// - Loop is STRICTLY bounded by AgentExecutionPolicy.MaxIterations
/// - All tool execution is logged and observable
/// - Deterministic: same input yields predictable behavior
/// - All exceptions caught and result returned (never throws)
/// </summary>
public class AgentRuntime : IAgentRuntime
{
    /// <summary>
    /// Extract final text output from conversation messages.
    /// </summary>
    static string extractFinalOutput(List<ChatMessage> messages)
    {
        // Find last assistant message and extract text
        for (int i = messages.Count - 1; i >= 0; i--)
        {
            var message = messages[i];
            if (message.Role == ChatRole.Assistant)
            {
                var textContent = message.Contents
                    .OfType<TextContent>()
                    .FirstOrDefault();

                if (textContent != null)
                {
                    return textContent.Text;
                }
            }
        }

        return string.Empty;
    }

    /// <summary>
    /// Determine final execution status.
    /// </summary>
    static AgentExecutionStatus determineStatus(AgentState state, AgentExecutionPolicy policy)
    {
        if (!state.IsComplete && state.IterationCount >= policy.MaxIterations)
        {
            return AgentExecutionStatus.MaxIterationsReached;
        }

        return state.IsComplete ? AgentExecutionStatus.Completed : AgentExecutionStatus.Failed;
    }

    /// <summary>
    /// Check if messages already contain the user input.
    /// </summary>
    static bool hasUserMessage(List<ChatMessage> messages, string input)
    {
        return messages.Any(m =>
            m.Role == ChatRole.User &&
            m.Contents.OfType<TextContent>().Any(tc => tc.Text == input));
    }

    readonly IChatClient chatClient;
    readonly ILogger<AgentRuntime> logger;

    public AgentRuntime(IChatClient chatClient, ILogger<AgentRuntime> logger)
    {
        ArgumentNullException.ThrowIfNull(chatClient);
        ArgumentNullException.ThrowIfNull(logger);

        this.chatClient = chatClient;
        this.logger = logger;
    }

    /// <summary>
    /// Core orchestration loop implementation.
    /// </summary>
    async Task<AgentResult> executeAgentLoopAsync(
        AgentRequest request,
        CancellationToken cancellationToken)
    {
        var state = new AgentState();
        foreach (var msg in request.Context.ConversationHistory)
        {
            state.Messages.Add(msg);
        }

        var toolExecutions = new List<ToolExecutionRecord>();
        var policy = request.Context.ExecutionPolicy;

        logger.LogInformation(
            "Starting agent execution: MaxIterations={MaxIterations}, AllowTools={AllowTools}",
            policy.MaxIterations,
            policy.AllowToolCalls);

        // Orchestration loop: iterate until completion or max iterations
        while (state.IterationCount < policy.MaxIterations)
        {
            cancellationToken.ThrowIfCancellationRequested();

            state.IterationCount++;
            logger.LogDebug("Agent iteration {Iteration} starting", state.IterationCount);

            // Step 1: Load memory context
            var memoryContext = await request.Context.Memory
                .LoadRelevantContextAsync(request.Input, cancellationToken);

            logger.LogDebug("Loaded {ContextCount} memory messages", memoryContext.Count);

            // Step 2: Inject memory + input into conversation
            var messagesForCall = new List<ChatMessage>(state.Messages);
            messagesForCall.AddRange(memoryContext);

            // Add current user input if not already in history
            if (state.IterationCount == 1 && !hasUserMessage(messagesForCall, request.Input))
            {
                messagesForCall.Add(new(ChatRole.User, request.Input));
            }

            // Step 3: Create chat options with tools (if allowed)
            var chatOptions = new ChatOptions();
            if (policy.AllowToolCalls && request.Context.ToolRegistry.GetAvailableTools().Count > 0)
            {
                chatOptions.Tools = request.Context.ToolRegistry.GetAvailableTools().ToList();

                logger.LogDebug("Advertising {ToolCount} tools to LLM", chatOptions.Tools.Count);
            }

            // Step 4: Call LLM
            logger.LogDebug("Calling IChatClient for iteration {Iteration}", state.IterationCount);

            ChatResponse response;
            try
            {
                response = await chatClient.GetResponseAsync(
                    messagesForCall,
                    chatOptions,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "IChatClient call failed");
                throw;
            }

            // Step 5: Process response
            if (response.Messages == null || response.Messages.Count == 0)
            {
                logger.LogWarning("Empty response from IChatClient");
                state.IsComplete = true;
                break;
            }

            // Add response messages to state
            foreach (var message in response.Messages)
            {
                state.Messages.Add(message);
            }

            // Step 6: Check for tool calls
            var hasToolCalls = false;
            var lastMessage = response.Messages.LastOrDefault();

            if (lastMessage != null && policy.AllowToolCalls)
            {
                foreach (var content in lastMessage.Contents)
                {
                    if (content is FunctionCallContent functionCall)
                    {
                        hasToolCalls = true;
                        await executeToolCallAsync(
                            functionCall,
                            state,
                            request.Context,
                            toolExecutions,
                            cancellationToken);
                    }
                }
            }

            // Step 7: Notify observer of iteration
            if (request.Context.Observer != null)
            {
                try
                {
                    await request.Context.Observer.OnIterationAsync(state);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Observer.OnIterationAsync failed");
                    // Don't fail orchestration due to observer error
                }
            }

            // Step 8: Persist state
            try
            {
                await request.Context.Memory.PersistAsync(state, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to persist agent state");
                // Don't fail orchestration due to persistence error
            }

            // Step 9: Check completion
            if (!hasToolCalls)
            {
                state.IsComplete = true;
                logger.LogInformation("Agent completed (no more tool calls)");
                break;
            }

            logger.LogDebug("Tool calls executed, continuing loop");
        }

        // Step 10: Extract final output
        var finalOutput = extractFinalOutput(state.Messages);

        var result = new AgentResult
        {
            FinalOutput = finalOutput,
            MaxIterationsReached = !state.IsComplete && state.IterationCount >= policy.MaxIterations,
            ToolExecutions = toolExecutions,
            TotalIterations = state.IterationCount,
            Status = determineStatus(state, policy)
        };

        logger.LogInformation(
            "Agent execution complete: Status={Status}, Iterations={Iterations}, ToolsCalled={ToolCount}",
            result.Status,
            result.TotalIterations,
            result.ToolExecutions.Count);

        // Step 11: Notify observer of completion
        if (request.Context.Observer != null)
        {
            try
            {
                await request.Context.Observer.OnCompletedAsync(result);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Observer.OnCompletedAsync failed");
            }
        }

        return result;
    }

    /// <summary>
    /// Execute a single tool call and append result to conversation.
    /// </summary>
    async Task executeToolCallAsync(
        FunctionCallContent functionCall,
        AgentState state,
        AgentContext context,
        List<ToolExecutionRecord> toolExecutions,
        CancellationToken cancellationToken)
    {
        var toolName = functionCall.Name;
        var arguments = functionCall.Arguments ?? new Dictionary<string, object>();
        var executedAt = DateTime.UtcNow;

        logger.LogDebug("Executing tool: {ToolName}", toolName);

        // Serialize arguments to JSON
        var argumentsJson = JsonSerializer.Serialize(arguments);

        // Execute tool
        /// <summary>
        /// Execute a single tool call and append result to conversation.
        /// </summary>
        async Task executeToolCallAsync(
            FunctionCallContent functionCall,
            AgentState state,
            AgentContext context,
            List<ToolExecutionRecord> toolExecutions,
            CancellationToken cancellationToken)
        {
            var toolName = functionCall.Name;
            var arguments = functionCall.Arguments ?? new Dictionary<string, object>();
            var executedAt = DateTime.UtcNow;

            logger.LogDebug("Executing tool: {ToolName}", toolName);

            // Serialize arguments to JSON
            var argumentsJson = JsonSerializer.Serialize(arguments);

            // For now, we create a placeholder result since tool execution
            // is delegated to AIFunction.InvokeAsync() in real implementations.
            // The orchestration loop detects FunctionCallContent and lets the
            // application layer (or FunctionInvokingChatClient) handle invocation.
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var toolOutput = $"Tool '{toolName}' executed with arguments: {argumentsJson}";
            var success = true;
            stopwatch.Stop();

            logger.LogDebug(
                "Tool {ToolName} completed: Success={Success}, Duration={Duration}ms",
                toolName,
                success,
                stopwatch.ElapsedMilliseconds);

            // Create tool result message and add to conversation
            var resultContent = new FunctionResultContent(
                callId: functionCall.CallId,
                result: toolOutput);

            var resultMessage = new ChatMessage(ChatRole.Tool, [resultContent]);
            state.Messages.Add(resultMessage);

            // Record execution
            var record = new ToolExecutionRecord
            {
                ToolName = toolName,
                Arguments = argumentsJson,
                Output = toolOutput,
                Success = success,
                ErrorMessage = null,
                ExecutedAt = executedAt,
                Duration = stopwatch.Elapsed,
                IterationNumber = state.IterationCount
            };

            toolExecutions.Add(record);

            // Notify observer
            if (context.Observer != null)
            {
                try
                {
                    await context.Observer.OnToolExecutedAsync(record);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Observer.OnToolExecutedAsync failed for tool {ToolName}", toolName);
                }
            }
        }
    }

    /// <summary>
    /// Execute agent with bounded reasoning loop.
    /// </summary>
    public async Task<AgentResult> RunAsync(
        AgentRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(request.Context);

        try
        {
            return await executeAgentLoopAsync(request, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Agent execution cancelled");
            return new AgentResult
            {
                FinalOutput = "Agent execution was cancelled",
                Status = AgentExecutionStatus.Cancelled
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception in agent execution");
            return new AgentResult
            {
                FinalOutput = $"Error: {ex.Message}",
                Status = AgentExecutionStatus.Failed
            };
        }
    }
}

/// <summary>
/// Proof of Concept demonstration of orchestration.
/// 
/// Shows:
/// - Bounded execution loop (MaxIterations enforced)
/// - Tool call detection and execution
/// - Memory context injection
/// - Observability events
/// - Deterministic behavior
/// </summary>
class SimpleAgentPoC
{
    /// <summary>
    /// Mock AITool for testing.
    /// </summary>
    class MockAITool : AITool
    {
        public override string Name { get; }
        public override string Description { get; }
        public string SchemaJson { get; }

        public MockAITool(string name, string description, string schema)
        {
            Name = name;
            Description = description;
            SchemaJson = schema;
        }
    }

    /// <summary>
    /// Mock IChatClient that simulates LLM responses.
    /// </summary>
    class MockChatClient : IChatClient
    {
        readonly ILogger logger;
        int callCount;

        public MockChatClient(ILogger logger)
        {
            this.logger = logger;
            callCount = 0;
        }

        public async Task<ChatResponse> GetResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            CancellationToken cancellationToken = default)
        {
            callCount++;
            logger.LogDebug("MockChatClient call #{CallCount}", callCount);

            // Simulate different responses
            if (callCount == 1)
            {
                // First call: request a tool
                return await Task.FromResult(new ChatResponse(new[]
                {
                    new ChatMessage(ChatRole.Assistant, new[]
                    {
                        new FunctionCallContent(
                            callId: "call-1",
                            name: "get_weather",
                            arguments: new Dictionary<string, object?>
                            {
                                { "location", "Seattle" }
                            })
                    })
                }));
            }

            // Subsequent calls: return final response
            return await Task.FromResult(new ChatResponse(new[]
            {
                new ChatMessage(ChatRole.Assistant, "The weather in Seattle is sunny and 72°F.")
            }));
        }

        public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            CancellationToken cancellationToken = default)
        {
            yield return new ChatResponseUpdate(ChatRole.Assistant,
                new[] { new TextContent("Streaming not implemented in PoC") });
            await Task.CompletedTask;
        }

        public TService? GetService<TService>(object? options = null) where TService : class
        {
            return null;
        }

        public object? GetService(Type serviceType, object? options = null)
        {
            return null;
        }

        public void Dispose() { }
    }

    /// <summary>
    /// Observer for capturing execution events.
    /// </summary>
    class TestObserver : IAgentObserver
    {
        readonly ILogger logger;
        readonly List<string> log;

        public TestObserver(ILogger logger, List<string> log)
        {
            this.logger = logger;
            this.log = log;
        }

        public Task OnIterationAsync(AgentState state)
        {
            var entry = $"[Iteration {state.IterationCount}] Messages: {state.Messages.Count}, Complete: {state.IsComplete}";
            log.Add(entry);
            logger.LogDebug(entry);
            return Task.CompletedTask;
        }

        public Task OnToolExecutedAsync(ToolExecutionRecord toolExecution)
        {
            var entry = $"[Tool] {toolExecution.ToolName}: {(toolExecution.Success ? "OK" : "FAILED")} in {toolExecution.Duration.TotalMilliseconds}ms";
            log.Add(entry);
            logger.LogDebug(entry);
            return Task.CompletedTask;
        }

        public Task OnCompletedAsync(AgentResult result)
        {
            var entry = $"[Complete] Status: {result.Status}, Iterations: {result.TotalIterations}";
            log.Add(entry);
            logger.LogDebug(entry);
            return Task.CompletedTask;
        }
    }

    readonly IAgentRuntime runtime;
    readonly IToolRegistry toolRegistry;
    readonly ILogger<SimpleAgentPoC> logger;
    readonly List<string> executionLog;

    public SimpleAgentPoC(
        IAgentRuntime runtime,
        IToolRegistry toolRegistry,
        ILogger<SimpleAgentPoC> logger)
    {
        ArgumentNullException.ThrowIfNull(runtime);
        ArgumentNullException.ThrowIfNull(toolRegistry);
        ArgumentNullException.ThrowIfNull(logger);

        this.runtime = runtime;
        this.toolRegistry = toolRegistry;
        this.logger = logger;
        executionLog = new List<string>();
    }

    void registerTestTools()
    {
        logger.LogDebug("Registering test tools");

        var tools = new List<AITool>
        {
            createTestTool("get_weather",
                "Get weather for a location",
                new { location = "string" }),
            createTestTool("get_time",
                "Get current time",
                new { timezone = "string" })
        };

        foreach (var tool in tools)
        {
            if (toolRegistry is DefaultToolRegistry registry)
            {
                registry.RegisterTool(tool);
            }
        }
    }

    AITool createTestTool(string name, string description, object schema)
    {
        var schemaJson = JsonSerializer.Serialize(schema);
        return new MockAITool(name, description, schemaJson);
    }

    IChatClient createMockChatClient()
    {
        return new MockChatClient(logger);
    }

    void logExecutionTrace()
    {
        if (executionLog.Count > 0)
        {
            logger.LogInformation("=== Execution Trace ===");
            foreach (var entry in executionLog)
            {
                logger.LogInformation(entry);
            }
        }
    }

    /// <summary>
    /// Run PoC agent with test tools.
    /// </summary>
    public async Task<AgentResult> RunPoCAsync(
        string userInput,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("=== KGS-AGENTS PoC START ===");
        logger.LogInformation("User Input: {Input}", userInput);

        // Register test tools
        registerTestTools();

        // Create memory
        var memory = new InMemoryAgentMemory();

        // Create observer for logging
        var observer = new TestObserver(logger, executionLog);

        // Create mock chat client (for demo)
        var chatClient = createMockChatClient();

        // Create request
        var context = new AgentContext
        {
            ConversationHistory = new List<ChatMessage>
            {
                new(ChatRole.System, "You are a helpful assistant.")
            },
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy
            {
                MaxIterations = 5,
                AllowToolCalls = true
            },
            Observer = observer
        };

        var request = new AgentRequest
        {
            Input = userInput,
            Context = context
        };

        // Execute
        var result = await runtime.RunAsync(request, cancellationToken);

        logger.LogInformation("=== KGS-AGENTS PoC RESULT ===");
        logger.LogInformation("Status: {Status}", result.Status);
        logger.LogInformation("Iterations: {Iterations}", result.TotalIterations);
        logger.LogInformation("Tools Called: {ToolCount}", result.ToolExecutions.Count);
        logger.LogInformation("Output: {Output}", result.FinalOutput);

        logExecutionTrace();

        return result;
    }
}
