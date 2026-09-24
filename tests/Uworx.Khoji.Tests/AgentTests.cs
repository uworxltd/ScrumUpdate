// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Moq;
using Uworx.Khoji.Agile.AI;
using static Uworx.Khoji.Tests.NUnitConstants;

#nullable enable

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Unit)]
public class DefaultToolRegistryTests
{
    class MockAITool : AITool
    {
        public override string Name { get; }
        public override string Description { get; }

        public MockAITool(string name, string description)
        {
            Name = name;
            Description = description;
        }
    }

    DefaultToolRegistry registry = null!;

    [SetUp]
    public void Setup()
    {
        var logger = new NUnitLogger<DefaultToolRegistry>();
        registry = new DefaultToolRegistry(logger);
    }

    [Test]
    public void RegisterTool_AddsToolToRegistry()
    {
        // Arrange
        var tool = new MockAITool("test_tool", "A test tool");

        // Act
        registry.RegisterTool(tool);

        // Assert
        var tools = registry.GetAvailableTools();
        Assert.That(tools.Count, Is.EqualTo(1));
        Assert.That(tools[0].Name, Is.EqualTo("test_tool"));
    }

    [Test]
    public void RegisterTool_DuplicateName_ThrowsInvalidOperationException()
    {
        // Arrange
        var tool1 = new MockAITool("tool", "Description");
        var tool2 = new MockAITool("tool", "Different description");


        // Act & Assert
        registry.RegisterTool(tool1);
        var ex = Assert.Throws<InvalidOperationException>(() => registry.RegisterTool(tool2));
        Assert.That(ex?.Message, Contains.Substring("already registered"));
    }

    [Test]
    public void GetAvailableTools_ReturnsRegisteredTools()
    {
        // Arrange
        var tool = new MockAITool("tool1", "Description");
        registry.RegisterTool(tool);

        // Act
        var tools = registry.GetAvailableTools();

        // Assert
        Assert.That(tools, Is.InstanceOf<IReadOnlyList<AITool>>());
        Assert.That(tools.Count, Is.EqualTo(1));
        Assert.That(tools[0].Name, Is.EqualTo("tool1"));
    }

    [Test]
    public void Clear_RemovesAllTools()
    {
        // Arrange
        registry.RegisterTool(new MockAITool("tool1", "Desc"));
        registry.RegisterTool(new MockAITool("tool2", "Desc"));

        // Act
        registry.Clear();

        // Assert
        Assert.That(registry.GetAvailableTools(), Is.Empty);
    }
}

[TestFixture, Category(TestCatory.Unit)]
public class InMemoryAgentMemoryTests
{
    [Test]
    public async Task LoadRelevantContextAsync_ReturnsEmptyList()
    {
        // Arrange
        var memory = new InMemoryAgentMemory();

        // Act
        var context = await memory.LoadRelevantContextAsync("any input");

        // Assert
        Assert.That(context, Is.Empty);
    }

    [Test]
    public async Task PersistAsync_CompletesWithoutError()
    {
        // Arrange
        var memory = new InMemoryAgentMemory();
        var state = new AgentState();
        state.Messages.Add(new(ChatRole.User, "Test"));

        // Act & Assert
        Assert.DoesNotThrowAsync(() => memory.PersistAsync(state));
    }

    [Test]
    public async Task PersistAsync_IdempotentMultipleCalls()
    {
        // Arrange
        var memory = new InMemoryAgentMemory();
        var state = new AgentState();

        // Act
        await memory.PersistAsync(state);
        await memory.PersistAsync(state);
        await memory.PersistAsync(state);

        // Assert
        // No exception thrown
    }
}

[TestFixture, Category(TestCatory.Unit)]
public class AgentIntegrationTests
{
    class MockAITool : AITool
    {
        public override string Name { get; }
        public override string Description { get; }

        public MockAITool(string name, string description)
        {
            Name = name;
            Description = description;
        }
    }

    class TestObserver : IAgentObserver
    {
        private readonly List<string> _events;

        public TestObserver(List<string> events) => _events = events;

        public Task OnIterationAsync(AgentState state)
        {
            _events.Add("OnIteration");
            return Task.CompletedTask;
        }

        public Task OnToolExecutedAsync(ToolExecutionRecord toolExecution)
        {
            _events.Add("OnToolExecuted");
            return Task.CompletedTask;
        }

        public Task OnCompletedAsync(AgentResult result)
        {
            _events.Add("OnCompleted");
            return Task.CompletedTask;
        }
    }

    [Test]
    public async Task FullWorkflow_WithObserver_CapturesAllEvents()
    {
        // Arrange
        var events = new List<string>();
        var observer = new TestObserver(events);

        var mockChatClient = new Mock<IChatClient>();
        mockChatClient
            .Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new[] { new ChatMessage(ChatRole.Assistant, "Done") }));

        var toolRegistry = new DefaultToolRegistry(new Mock<ILogger<DefaultToolRegistry>>().Object);
        var memory = new InMemoryAgentMemory();
        var runtime = new AgentRuntime(mockChatClient.Object, new Mock<ILogger<AgentRuntime>>().Object);

        var context = new AgentContext
        {
            ConversationHistory = new List<ChatMessage>(),
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy(),
            Observer = observer
        };

        var request = new AgentRequest { Input = "Test", Context = context };

        // Act
        await runtime.RunAsync(request);

        // Assert
        Assert.That(events, Contains.Item("OnIteration"));
        Assert.That(events, Contains.Item("OnCompleted"));
    }
}

[TestFixture, Category(TestCatory.Unit)]
public class AgentTests
{
    Mock<IChatClient> mockChatClient = null!;
    DefaultToolRegistry toolRegistry = null!;
    InMemoryAgentMemory memory = null!;
    AgentRuntime runtime = null!;

    [SetUp]
    public void Setup()
    {
        mockChatClient = new Mock<IChatClient>();
        toolRegistry = new DefaultToolRegistry(new Mock<ILogger<DefaultToolRegistry>>().Object);
        memory = new InMemoryAgentMemory();
        var logger = new NUnitLogger<AgentRuntime>();
        runtime = new AgentRuntime(mockChatClient.Object, logger);
    }

    [Test]
    public async Task RunAsync_WithSimpleUserInput_ReturnsResult()
    {
        // Arrange
        var userInput = "Hello, agent!";
        var mockResponse = new ChatResponse(new[]
        {
            new ChatMessage(ChatRole.Assistant, "Hello! How can I help?")
        });

        mockChatClient
            .Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockResponse);

        var context = new AgentContext
        {
            ConversationHistory = new List<ChatMessage>(),
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy { MaxIterations = 5 }
        };

        var request = new AgentRequest { Input = userInput, Context = context };

        // Act
        var result = await runtime.RunAsync(request);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Status, Is.EqualTo(AgentExecutionStatus.Completed));
        Assert.That(result.FinalOutput, Contains.Substring("Hello"));
    }

    [Test]
    public async Task RunAsync_WithToolCall_ExecutesToolAndContinues()
    {
        // Arrange
        var userInput = "What's the weather?";

        // First response: tool call
        var toolCallResponse = new ChatResponse(new[]
        {
            new ChatMessage(ChatRole.Assistant, new[]
            {
                new FunctionCallContent(
                    callId: "call-1",
                    name: "get_weather",
                    arguments: new Dictionary<string, object?> { { "location", "Seattle" } })
            })
        });

        // Second response: final answer
        var finalResponse = new ChatResponse(new[]
        {
            new ChatMessage(ChatRole.Assistant, "The weather in Seattle is sunny and 72°F.")
        });

        mockChatClient
            .SetupSequence(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(toolCallResponse)
            .ReturnsAsync(finalResponse);

        var context = new AgentContext
        {
            ConversationHistory = new List<ChatMessage>(),
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy { MaxIterations = 5, AllowToolCalls = true }
        };

        var request = new AgentRequest { Input = userInput, Context = context };

        // Act
        var result = await runtime.RunAsync(request);

        // Assert
        Assert.That(result.Status, Is.EqualTo(AgentExecutionStatus.Completed));
        Assert.That(result.TotalIterations, Is.GreaterThan(1)); // At least 2 iterations
        Assert.That(result.FinalOutput, Contains.Substring("72°F"));
    }

    [Test]
    public async Task RunAsync_BoundedByMaxIterations_StopsAtLimit()
    {
        // Arrange
        var userInput = "Query";
        var maxIterations = 3;

        var toolCallResponse = new ChatResponse(new[]
        {
            new ChatMessage(ChatRole.Assistant, new[]
            {
                new FunctionCallContent(
                    callId: "call-1",
                    name: "tool_a",
                    arguments: new Dictionary<string, object?>())
            })
        });

        mockChatClient
            .Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(toolCallResponse);

        var context = new AgentContext
        {
            ConversationHistory = new List<ChatMessage>(),
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy { MaxIterations = maxIterations, AllowToolCalls = true }
        };

        var request = new AgentRequest { Input = userInput, Context = context };

        // Act
        var result = await runtime.RunAsync(request);

        // Assert
        Assert.That(result.MaxIterationsReached, Is.True);
        Assert.That(result.TotalIterations, Is.EqualTo(maxIterations));
        Assert.That(result.Status, Is.EqualTo(AgentExecutionStatus.MaxIterationsReached));
    }

    [Test]
    public async Task RunAsync_ToolCallsDisabled_IgnoresToolCalls()
    {
        // Arrange
        var userInput = "Query";

        var toolCallResponse = new ChatResponse(new[]
        {
            new ChatMessage(ChatRole.Assistant, new[]
            {
                new FunctionCallContent(
                    callId: "call-1",
                    name: "get_weather",
                    arguments: new Dictionary<string, object?>())
            })
        });

        mockChatClient
            .Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(toolCallResponse);

        var context = new AgentContext
        {
            ConversationHistory = new List<ChatMessage>(),
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy { MaxIterations = 5, AllowToolCalls = false }
        };

        var request = new AgentRequest { Input = userInput, Context = context };

        // Act
        var result = await runtime.RunAsync(request);

        // Assert
        Assert.That(result.Status, Is.EqualTo(AgentExecutionStatus.Completed));
        Assert.That(result.ToolExecutions, Is.Empty);
    }

    [Test]
    public async Task RunAsync_CallsChatClientWithFullHistory()
    {
        // Arrange
        var initialHistory = new List<ChatMessage>
        {
            new(ChatRole.System, "You are helpful"),
            new(ChatRole.User, "Previous message")
        };

        mockChatClient
            .Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new[] { new ChatMessage(ChatRole.Assistant, "Response") }));

        var context = new AgentContext
        {
            ConversationHistory = initialHistory,
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy()
        };

        var request = new AgentRequest { Input = "New message", Context = context };

        // Act
        await runtime.RunAsync(request);

        // Assert
        mockChatClient.Verify(
            x => x.GetResponseAsync(
                It.Is<IEnumerable<ChatMessage>>(msgs => msgs.Count() >= 2),
                It.IsAny<ChatOptions>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Test]
    public async Task RunAsync_CallsObserverOnIteration()
    {
        // Arrange
        var mockObserver = new Mock<IAgentObserver>();

        mockChatClient
            .Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new[] { new ChatMessage(ChatRole.Assistant, "Response") }));

        var context = new AgentContext
        {
            ConversationHistory = new List<ChatMessage>(),
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy(),
            Observer = mockObserver.Object
        };

        var request = new AgentRequest { Input = "Query", Context = context };

        // Act
        await runtime.RunAsync(request);

        // Assert
        mockObserver.Verify(x => x.OnIterationAsync(It.IsAny<AgentState>()), Times.AtLeastOnce);
        mockObserver.Verify(x => x.OnCompletedAsync(It.IsAny<AgentResult>()), Times.Once);
    }

    [Test]
    public async Task RunAsync_ThrowsOnCancellation_ReturnsCancelledStatus()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        cts.Cancel();

        var context = new AgentContext
        {
            ConversationHistory = new List<ChatMessage>(),
            ToolRegistry = toolRegistry,
            Memory = memory,
            ExecutionPolicy = new AgentExecutionPolicy()
        };

        var request = new AgentRequest { Input = "Query", Context = context };

        // Act
        var result = await runtime.RunAsync(request, cts.Token);

        // Assert
        Assert.That(result.Status, Is.EqualTo(AgentExecutionStatus.Cancelled));
    }

    [Test]
    public void RunAsync_NullRequest_ThrowsArgumentNullException()
    {
        // Assert
        Assert.ThrowsAsync<ArgumentNullException>(() => runtime.RunAsync(null!));
    }
}

