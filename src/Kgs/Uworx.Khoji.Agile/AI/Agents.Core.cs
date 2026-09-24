// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using Microsoft.Extensions.AI;

namespace Uworx.Khoji.Agile.AI;

/// <summary>
/// Execution policy for bounded reasoning.
/// 
/// Contract:
/// - MaxIterations MUST be enforced by runtime
/// - AllowToolCalls = false prevents any tool invocation
/// - RequireStructuredOutput = true forces JSON output format (future)
/// 
/// Design Note:
/// Policies are immutable and designed to be composable.
/// Default values provide a reasonable starting point.
/// </summary>
public record AgentExecutionPolicy
{
    /// <summary>
    /// Maximum reasoning iterations before forced termination.
    /// 
    /// One iteration = one LLM call + optional tool execution.
    /// Runtime MUST stop and return partial result if exceeded.
    /// 
    /// Default: 5 (reasonable for interactive use; prevents runaway)
    /// PoC requirement: Must enforce this limit strictly.
    /// </summary>
    public int MaxIterations { get; init; } = 5;

    /// <summary>
    /// Whether tool calls are permitted.
    /// 
    /// If false:
    /// - Tools registered but not invoked
    /// - Tools not advertised to LLM
    /// - Used for "think only" executions
    /// 
    /// Default: true
    /// </summary>
    public bool AllowToolCalls { get; init; } = true;

    /// <summary>
    /// Whether final output must be JSON-formatted.
    /// 
    /// If true:
    /// - LLM instructed to output structured JSON
    /// - Runtime validates JSON format
    /// - Non-JSON output treated as error
    /// 
    /// Default: false (accept any text response for PoC)
    /// Future: true for structured API responses
    /// </summary>
    public bool RequireStructuredOutput { get; init; } = false;
}

/// <summary>
/// Execution context for an agent run.
/// 
/// Contract:
/// - Contains all configuration needed for one agent execution
/// - Immutable (records)
/// - Conversation history grows during execution
/// 
/// Design Note:
/// This captures the "dependency injection" pattern for a single run:
/// which tools are available, what memory is accessible, what policy applies.
/// </summary>
public record AgentContext
{
    /// <summary>
    /// Conversation history for the session.
    /// Starts with prior messages; grows as orchestration loop executes.
    /// </summary>
    public required IList<ChatMessage> ConversationHistory { get; init; }

    /// <summary>
    /// Registry of available tools for this execution.
    /// </summary>
    public required IToolRegistry ToolRegistry { get; init; }

    /// <summary>
    /// Memory provider for context loading and state persistence.
    /// </summary>
    public required IAgentMemory Memory { get; init; }

    /// <summary>
    /// Execution policy (iteration limits, tool call permissions, etc.)
    /// </summary>
    public required AgentExecutionPolicy ExecutionPolicy { get; init; }

    /// <summary>
    /// Optional observer for instrumentation / logging.
    /// If null, no observability events emitted.
    /// </summary>
    public IAgentObserver? Observer { get; init; }
}

/// <summary>
/// Input request for agent execution.
/// 
/// Contract:
/// - Input is the user query or task
/// - Context provides execution configuration (tools, memory, policy)
/// </summary>
public record AgentRequest
{
    /// <summary>
    /// User input / task / query.
    /// </summary>
    public required string Input { get; init; }

    /// <summary>
    /// Execution context (tools, memory, policy, conversation history).
    /// </summary>
    public required AgentContext Context { get; init; }
}

/// <summary>
/// Record of a single tool execution during orchestration.
/// 
/// Contract:
/// - Immutable
/// - Captures full execution context for audit trail
/// - Includes timing for performance analysis
/// 
/// Usage:
/// Included in AgentResult.ToolExecutions to provide
/// complete trace of agent reasoning.
/// </summary>
public record ToolExecutionRecord
{
    /// <summary>
    /// Name of tool executed.
    /// </summary>
    public required string ToolName { get; init; }

    /// <summary>
    /// Input arguments (JSON string) passed to tool.
    /// </summary>
    public required string Arguments { get; init; }

    /// <summary>
    /// Output/result from tool.
    /// May be empty string if tool produced no output.
    /// </summary>
    public required string Output { get; init; }

    /// <summary>
    /// Whether tool execution succeeded.
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Error message if execution failed.
    /// Null if Success is true.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Timestamp when tool execution started.
    /// </summary>
    public DateTime ExecutedAt { get; init; }

    /// <summary>
    /// How long tool execution took.
    /// </summary>
    public TimeSpan Duration { get; init; }

    /// <summary>
    /// Iteration number when this tool was called.
    /// First iteration = 1.
    /// </summary>
    public int IterationNumber { get; init; }
}

/// <summary>
/// Structured result from agent execution.
/// 
/// Contract:
/// - Always returns, even on errors
/// - Contains final output + metadata
/// - Metadata includes execution trace
/// 
/// Design Note:
/// This enables post-execution analysis, auditing, and observability.
/// </summary>
public record AgentResult
{
    /// <summary>
    /// Final output from agent.
    /// May be partial if MaxIterationsReached is true.
    /// </summary>
    public required string FinalOutput { get; init; }

    /// <summary>
    /// Whether execution was terminated due to hitting MaxIterations.
    /// 
    /// If true:
    /// - Result is incomplete
    /// - More iterations would have been useful
    /// - Consider increasing MaxIterations or simplifying task
    /// </summary>
    public bool MaxIterationsReached { get; init; }

    /// <summary>
    /// Complete record of all tool executions during this run.
    /// 
    /// Use for:
    /// - Audit trails
    /// - Debugging tool invocation sequences
    /// - Metrics (which tools used, how long each took)
    /// </summary>
    public IReadOnlyList<ToolExecutionRecord> ToolExecutions { get; init; } = [];

    /// <summary>
    /// Total iterations executed.
    /// Useful for understanding complexity of task.
    /// </summary>
    public int TotalIterations { get; init; }

    /// <summary>
    /// Execution status.
    /// Indicates how execution concluded.
    /// </summary>
    public AgentExecutionStatus Status { get; init; } = AgentExecutionStatus.Completed;
}

/// <summary>
/// Status of agent execution.
/// </summary>
public enum AgentExecutionStatus
{
    /// <summary>
    /// Execution completed normally (no more tool calls, response generated).
    /// </summary>
    Completed,

    /// <summary>
    /// Execution terminated due to hitting MaxIterations limit.
    /// Result is partial; more iterations would have been useful.
    /// </summary>
    MaxIterationsReached,

    /// <summary>
    /// Execution terminated due to unrecoverable error.
    /// </summary>
    Failed,

    /// <summary>
    /// Execution was cancelled by caller.
    /// </summary>
    Cancelled
}

/// <summary>
/// Runtime state for an agent execution.
/// 
/// Mutable during execution; passed to observers for observability.
/// 
/// Contract:
/// - Tracks messages, iteration count, completion status
/// - Grows as orchestration loop executes
/// - Passed to IAgentMemory.PersistAsync() for state capture
/// </summary>
public class AgentState
{
    /// <summary>
    /// Conversation messages (grows during execution).
    /// </summary>
    public List<ChatMessage> Messages { get; } = [];

    /// <summary>
    /// Current iteration count (1-indexed).
    /// Incremented at start of each loop iteration.
    /// </summary>
    public int IterationCount { get; set; }

    /// <summary>
    /// Whether orchestration loop has concluded.
    /// Set to true when:
    /// - LLM returns non-tool-call response, OR
    /// - MaxIterations exceeded, OR
    /// - Error occurs
    /// </summary>
    public bool IsComplete { get; set; }
}

/// <summary>
/// Primary entry point for the KGS-Agents lightweight orchestration runtime.
/// 
/// Responsibilities:
/// - Orchestrate bounded agent reasoning loops
/// - Manage tool-calling execution
/// - Coordinate memory context injection
/// - Enforce execution policies
/// - Emit observability events
/// 
/// Contract:
/// - DETERMINISTIC: Same input + context yields predictable behavior
/// - BOUNDED: MaxIterations strictly enforced; no infinite loops
/// - EXPLICIT: No magic autonomy; all loops are visible and controllable
/// - OBSERVABLE: All iterations logged; all tool calls tracked
/// </summary>
public interface IAgentRuntime
{
    /// <summary>
    /// Execute an agent request with bounded reasoning loop.
    /// 
    /// Orchestration flow:
    /// 1. Load memory context for input
    /// 2. Call IChatClient with instructions + conversation history + tools
    /// 3. If tool calls detected:
    ///    a. Execute tool via IToolRegistry
    ///    b. Append tool result to conversation
    ///    c. Notify observers
    ///    d. Continue loop if under MaxIterations
    /// 4. Else:
    ///    a. Return structured result
    ///    b. Notify observers of completion
    /// 
    /// Guarantees:
    /// - Loop bounded by AgentExecutionPolicy.MaxIterations
    /// - CancellationToken respected at iteration boundaries
    /// - All exceptions logged before propagating
    /// </summary>
    /// <param name="request">Agent request with input and context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Structured agent result with final output and execution metadata</returns>
    /// <exception cref="ArgumentNullException">If request is null</exception>
    /// <exception cref="OperationCanceledException">If cancellation requested</exception>
    Task<AgentResult> RunAsync(
        AgentRequest request,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Observer hook for agent runtime events.
/// 
/// Responsibilities:
/// - Capture observability events (logging, metrics, tracing)
/// - Enable post-execution analysis
/// - Support audit trails
/// 
/// Contract:
/// - All observers notified after significant state changes
/// - Exceptions in observers do NOT fail orchestration (logged, then ignored)
/// - Optional; runtime works without observers
/// 
/// Usage:
/// Register in DI with IAgentObserver, then runtime will call hooks
/// at iteration and completion boundaries.
/// </summary>
public interface IAgentObserver
{
    /// <summary>
    /// Called after each iteration of the reasoning loop.
    /// 
    /// Iteration = one call to IChatClient + possible tool execution.
    /// 
    /// Use this to:
    /// - Log iteration details
    /// - Track token usage
    /// - Debug reasoning steps
    /// - Emit metrics (iteration count, time, etc.)
    /// </summary>
    /// <param name="state">Current agent state (messages, iteration count, etc.)</param>
    Task OnIterationAsync(AgentState state);

    /// <summary>
    /// Called after a tool is executed.
    /// 
    /// Use this to:
    /// - Log tool invocations
    /// - Track tool execution time
    /// - Audit tool calls (who called what with what arguments)
    /// - Emit metrics
    /// </summary>
    /// <param name="toolExecution">Record of tool execution with result details</param>
    Task OnToolExecutedAsync(ToolExecutionRecord toolExecution);

    /// <summary>
    /// Called when agent reaches final result.
    /// 
    /// Use this to:
    /// - Log final output
    /// - Close out spans/traces
    /// - Emit completion metrics
    /// - Trigger post-processing workflows
    /// </summary>
    /// <param name="result">Final structured result</param>
    Task OnCompletedAsync(AgentResult result);
}

/// <summary>
/// Memory abstraction for agent reasoning context.
/// 
/// Responsibilities:
/// - Load relevant context from conversation history
/// - Persist agent state (optional; PoC uses in-memory only)
/// - Abstract storage implementation (database, vector DB, etc.)
/// 
/// Contract:
/// - LoadRelevantContextAsync() returns messages to inject into next chat call
/// - PersistAsync() is idempotent (multiple calls safe)
/// - No vector similarity required for PoC (simple conversation history suffices)
/// 
/// Design Note:
/// This layer allows future migration to vector DB without changing orchestration logic.
/// For PoC, simple in-memory conversation history is sufficient.
/// </summary>
public interface IAgentMemory
{
    /// <summary>
    /// Load conversation context relevant to the current input.
    /// 
    /// For PoC implementation:
    /// - Return last N conversation turns (simple windowing)
    /// - No semantic similarity needed
    /// 
    /// For future implementation:
    /// - Use vector similarity to find relevant prior messages
    /// - Inject summaries of long-running context
    /// </summary>
    /// <param name="input">Current user input</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of chat messages to inject before next LLM call</returns>
    Task<IReadOnlyList<ChatMessage>> LoadRelevantContextAsync(
        string input,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Persist agent execution state for future sessions.
    /// 
    /// For PoC: No-op (in-memory only)
    /// For production: Write to database/vector DB
    /// 
    /// Called after each iteration to ensure state is captured.
    /// Idempotent: safe to call multiple times with same state.
    /// </summary>
    /// <param name="state">Current agent state to persist</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task PersistAsync(
        AgentState state,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Registry for explicit tool/function availability.
/// 
/// Responsibilities:
/// - Maintain catalog of available AITool instances
/// - Provide tools for LLM instruction generation
/// - Support tool execution via AIFunction.InvokeAsync()
/// 
/// Design Principle:
/// NO AUTO-DISCOVERY. Tools must be explicitly registered.
/// This ensures determinism and security; no reflection magic.
/// 
/// Implementation Note:
/// Replaces custom tool execution logic with Microsoft.Extensions.AI abstractions.
/// Tools are AIFunction instances that can be invoked directly.
/// The registry simply manages registration and retrieval.
/// </summary>
public interface IToolRegistry
{
    /// <summary>
    /// Get all currently available tools.
    /// These are Microsoft.Extensions.AI.AITool instances that can be
    /// advertised to LLMs and invoked directly.
    /// </summary>
    /// <returns>Read-only list of registered AITool instances</returns>
    IReadOnlyList<AITool> GetAvailableTools();
}
