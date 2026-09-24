// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Abstractions;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

public enum TestIntent { Foo, Bar }

[TestFixture, Category(TestCatory.Unit)]
class StrategyMapTests
{
    [Test]
    public void Register_NullHandler_ThrowsArgumentNullException()
    {
        var map = new StrategyMap<TestIntent, string>();
        Assert.Throws<ArgumentNullException>(() => map.Register(TestIntent.Foo, null));
    }

    [Test]
    public void Register_ValidHandler_ReturnsSelf()
    {
        var map = new StrategyMap<TestIntent, string>();
        var result = map.Register(TestIntent.Foo, evt => Task.CompletedTask);
        Assert.That(result, Is.SameAs(map));
    }

    [Test]
    public async Task Trigger_NoHandler_ReturnsNotFound()
    {
        var map = new StrategyMap<TestIntent, string>();
        var result = await map.Trigger(TestIntent.Foo, "payload");
        Assert.That(result.Found, Is.False);
        Assert.That(result.Success, Is.False);
        Assert.That(result.Exception, Is.Null);
    }

    [Test]
    public async Task Trigger_HandlerExecutesSuccessfully_ReturnsSuccess()
    {
        var map = new StrategyMap<TestIntent, string>();
        bool called = false;
        map.Register(TestIntent.Foo, evt => { called = true; return Task.CompletedTask; });
        var result = await map.Trigger(TestIntent.Foo, "payload");
        Assert.That(called, Is.True);
        Assert.That(result.Found, Is.True);
        Assert.That(result.Success, Is.True);
        Assert.That(result.Exception, Is.Null);
    }

    [Test]
    public async Task Trigger_HandlerThrowsException_ReturnsFailure()
    {
        var map = new StrategyMap<TestIntent, string>();
        map.Register(TestIntent.Foo, evt => throw new InvalidOperationException("fail"));
        var result = await map.Trigger(TestIntent.Foo, "payload");
        Assert.That(result.Found, Is.True);
        Assert.That(result.Success, Is.False);
        Assert.That(result.Exception, Is.TypeOf<InvalidOperationException>());
    }

    [Test]
    public void OrderedRegister_NullMatchPredicate_ThrowsArgumentNullException()
    {
        var map = new OrderedStrategyMap<TestIntent, string>();
        Assert.Throws<ArgumentNullException>(() => map.Register(TestIntent.Foo, (Func<string, bool>)null, evt => Task.CompletedTask));
        Assert.Throws<ArgumentNullException>(() => map.Register(TestIntent.Foo, (Func<string, Task<bool>>)null, evt => Task.CompletedTask));
    }

    [Test]
    public void OrderedRegister_NullHandler_ThrowsArgumentNullException()
    {
        var map = new OrderedStrategyMap<TestIntent, string>();
        Assert.Throws<ArgumentNullException>(() => map.Register(TestIntent.Foo, s => true, null));
        Assert.Throws<ArgumentNullException>(() => map.Register(TestIntent.Foo, s => Task.FromResult(true), null));
    }

    [Test]
    public void OrderedRegister_ValidHandlers_ReturnsSelf()
    {
        var map = new OrderedStrategyMap<TestIntent, string>();
        var result1 = map.Register(TestIntent.Foo, s => true, evt => Task.CompletedTask);
        var result2 = map.Register(TestIntent.Foo, s => Task.FromResult(true), evt => Task.CompletedTask);
        Assert.That(result1, Is.SameAs(map));
        Assert.That(result2, Is.SameAs(map));
    }

    [Test]
    public async Task OrderedTrigger_NoMatch_ReturnsNotFound()
    {
        var map = new OrderedStrategyMap<TestIntent, string>();
        map.Register(TestIntent.Foo, s => false, evt => Task.CompletedTask);
        var result = await map.Trigger("payload");
        Assert.That(result.Found, Is.False);
        Assert.That(result.Success, Is.False);
        Assert.That(result.Exception, Is.Null);
    }

    [Test]
    public async Task OrderedTrigger_MatchPredicateThrows_ReturnsFailure()
    {
        var map = new OrderedStrategyMap<TestIntent, string>();
        // Explicitly cast to Func<string, bool> to resolve ambiguity
        map.Register(TestIntent.Foo, (Func<string, bool>)(s => throw new InvalidOperationException("fail")), evt => Task.CompletedTask);
        var result = await map.Trigger("payload");
        Assert.That(result.Found, Is.True);
        Assert.That(result.Success, Is.False);
        Assert.That(result.Exception, Is.TypeOf<InvalidOperationException>());
    }

    [Test]
    public async Task OrderedTrigger_HandlerThrows_ReturnsFailure()
    {
        var map = new OrderedStrategyMap<TestIntent, string>();
        map.Register(TestIntent.Foo, s => true, evt => throw new InvalidOperationException("fail"));
        var result = await map.Trigger("payload");
        Assert.That(result.Found, Is.True);
        Assert.That(result.Success, Is.False);
        Assert.That(result.Exception, Is.TypeOf<InvalidOperationException>());
    }

    [Test]
    public async Task OrderedTrigger_MatchAndHandlerSuccess_ReturnsSuccess()
    {
        var map = new OrderedStrategyMap<TestIntent, string>();
        bool called = false;
        map.Register(TestIntent.Foo, s => true, evt => { called = true; return Task.CompletedTask; });
        var result = await map.Trigger("payload");
        Assert.That(called, Is.True);
        Assert.That(result.Found, Is.True);
        Assert.That(result.Success, Is.True);
        Assert.That(result.Exception, Is.Null);
    }
}
