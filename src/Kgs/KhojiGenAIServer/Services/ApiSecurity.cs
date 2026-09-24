// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Services;

/// <summary>
/// Guards the bearer bypass used for inter-service/scoped auth calls.
/// The expected key is <c>base64(KHOJI_BASICAUTHUSERNAME:KHOJI_BASICAUTHUSERPASSWORD)</c> —
/// the same value as <see cref="KhojiConstants.KhojiXBasicCreds"/> — derived from the shared
/// inter-service credential contract (see KBS KhojiUsersConfig / KSS source_token_refresh_service).
/// </summary>
static class ApiSecurity
{
    static string ExpectedKey => KhojiConstants.KhojiXBasicCreds;

    public static bool CheckForSecurityKey(string key) =>
        string.Equals(ExpectedKey, key?.Trim(), StringComparison.Ordinal);
}
