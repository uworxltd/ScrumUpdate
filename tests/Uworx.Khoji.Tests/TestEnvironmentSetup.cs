// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace Uworx.Khoji.Tests;

/// <summary>
/// Supplies the environment variables KGS now requires (and fails fast without)
/// for the whole test run. Fixtures that construct <c>KGSDbContext</c> or read
/// the basic-auth credentials need these; without them the process would
/// terminate instead of running the tests. Tests that assert the fail-fast
/// behaviour overwrite/unset these variables per-test and restore them after.
/// </summary>
[SetUpFixture]
public class TestEnvironmentSetup
{
    [OneTimeSetUp]
    public void SetRequiredEnvironmentVariables()
    {
        // Any non-blank value works for the in-memory provider used by unit tests.
        SetIfMissing("ConnectionStrings__DefaultConnection",
            "Server=localhost;Port=5432;Username=test;Password=test;Database=test");
        // Mirrors the docker-compose defaults so KGS constants resolve in tests.
        SetIfMissing("KHOJIX_BASE_URL", "https://app.scrumupdate.com");
        SetIfMissing("KHOJIX_BUSINESS_SERVER_URL", "http://kbs:4243");
        SetIfMissing("KHOJI_BASICAUTHUSERNAME", "test@example.com");
        SetIfMissing("KHOJI_BASICAUTHUSERPASSWORD", "test-password");
    }

    static void SetIfMissing(string name, string value)
    {
        // Respect values already provided by the environment (e.g. CI or a dev shell).
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(name)))
            Environment.SetEnvironmentVariable(name, value);
    }
}