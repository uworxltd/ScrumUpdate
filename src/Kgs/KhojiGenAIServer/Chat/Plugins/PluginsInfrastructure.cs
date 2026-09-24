// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Chat.Plugins;

record PluginPayload(CancellationToken Token, string Member, string Email, int InstanceId, bool IsSupervisor);

class PluginException : ApplicationException
{
    public PluginException() : base() { }
    public PluginException(string message) : base(message) { }
    public PluginException(string message, Exception inner) : base(message, inner) { }
}