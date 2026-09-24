// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

#nullable enable

using Microsoft.Kiota.Abstractions.Authentication;

namespace KhojiGenAIServer.Infrastructure;

public class StaticTokenProvider : IAccessTokenProvider
{
    readonly string accessToken;

    public StaticTokenProvider(string accessToken) =>
        this.accessToken = accessToken;

    public AllowedHostsValidator AllowedHostsValidator => new AllowedHostsValidator();

    public Task<string> GetAuthorizationTokenAsync(Uri uri,
        Dictionary<string, object>? additionalAuthenticationContext = null,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(accessToken);
}
