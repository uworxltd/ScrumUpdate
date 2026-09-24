// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer;
using KhojiGenAIServer.Chat.Teams;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Features;
using KhojiGenAIServer.Infrastructure;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Hosting.AspNetCore;
using Microsoft.Agents.Storage;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.FileProviders;
using Microsoft.TeamsFx.Conversation;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using PostHog;
using System.Text.Json;
using TickerQ.DependencyInjection;
using TickerQ.EntityFrameworkCore.DbContextFactory;
using TickerQ.EntityFrameworkCore.DependencyInjection;
using Unleash;
using Uworx.Khoji.Infrastructure;

var otlpEndpoint = Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT") ?? "http://localhost:4318";
var ringTraceExporter = new RingBufferTraceExporter(maxSize: 100);
var ringMetricExporter = new RingBufferMetricExporter(maxSize: 100);
var ringLogExporter = new RingBufferLogExporter(maxSize: 100);

// https://learn.microsoft.com/en-us/agent-framework/tutorials/agents/enable-observability
//using var tracerProvider = Sdk.CreateTracerProviderBuilder()
//    .AddSource("agents-telemetry-source")
//    .AddConsoleExporter()
//    .Build();

var tracerProviderBuilder = Sdk.CreateTracerProviderBuilder()                       // Setup tracing with resource
    .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("KGS", serviceVersion: "1.0.0"))
    .AddSource("agents-telemetry-source")                                   // Our custom activity source
    .AddSource("*Microsoft.Agents.AI")                                      // Agent Framework telemetry
    .AddHttpClientInstrumentation();                                        // Capture HTTP calls to LLM

if (UseAspireDashboard())
    tracerProviderBuilder
        .AddConsoleExporter()
        .AddOtlpExporter(o => o.Endpoint = new Uri(otlpEndpoint));
else
    tracerProviderBuilder.AddProcessor(new SimpleActivityExportProcessor(ringTraceExporter));

using var tracerProvider = tracerProviderBuilder.Build();

var meterProviderBuilder = Sdk.CreateMeterProviderBuilder()                         // Setup metrics with resource and instrument name filtering
    .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("KGS", serviceVersion: "1.0.0"))
    .AddMeter("KGS")                                                        // Our custom meter
    .AddMeter("*Microsoft.Agents.AI")                                       // Agent Framework metrics
    .AddHttpClientInstrumentation()                                         // HTTP client metrics
    .AddRuntimeInstrumentation();                                           // .NET runtime metrics

if (UseAspireDashboard())
    meterProviderBuilder.AddOtlpExporter(options => options.Endpoint = new Uri(otlpEndpoint));
else
    meterProviderBuilder.AddReader(new PeriodicExportingMetricReader(
        ringMetricExporter, exportIntervalMilliseconds: 5000));

using var meterProvider = meterProviderBuilder.Build();

var serviceCollection = new ServiceCollection();
serviceCollection.AddLogging(loggingBuilder =>
{
    loggingBuilder.SetMinimumLevel(LogLevel.Warning);

    loggingBuilder.AddOpenTelemetry(options =>
    {
        options.SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("KGS", serviceVersion: "1.0.0"));

        options.IncludeScopes = true;
        options.IncludeFormattedMessage = true;

        if (UseAspireDashboard())
            options.AddOtlpExporter(otlpOptions => otlpOptions.Endpoint = new Uri(otlpEndpoint));
        else
            options.AddProcessor(new SimpleLogRecordExportProcessor(ringLogExporter));
    });
});

//using var activitySource = new ActivitySource("KGS");
//using var meter = new Meter("KGS");
//var interactionCounter = meter.CreateCounter<int>("agent_interactions_total", description: "Total number of agent interactions");
//var responseTimeHistogram = meter.CreateHistogram<double>("agent_response_time_seconds", description: "Agent response time in seconds");

var builder = WebApplication.CreateBuilder(args);

// this needs to be as early as possible, so we have all needed configs and environment variables in place
// for services that are being added to the container
Console.WriteLine("Scanning Docker Secrets...");
DockerSecretsManager.LoadAndApplySecrets(builder);

// Seed the standard connection string (appsettings.json ConnectionStrings:DefaultConnection /
// user-secrets) as a fallback for UworxConstants.DatabaseConnectionString. The
// ConnectionStrings__DefaultConnection environment variable still takes precedence there.
KhojiConstants.InitializeDatabaseConnectionString(
    builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty);

// Fail fast with a clear message if mandatory config is missing,
// instead of failing deep at runtime with an obscure Npgsql / ArgumentNullException.
try
{
    _ = KhojiConstants.DatabaseConnectionString;
    _ = KhojiConstants.KhojiXBaseUrl;
    _ = KhojiConstants.KhojiXBusinessServerUrl;
    _ = KhojiConstants.KhojiXBasicAuthUsername;
    _ = KhojiConstants.KhojiXBasicAuthPassword;
}
catch (InvalidOperationException ex)
{
    Console.Error.WriteLine(ex.Message);
    Environment.Exit(1);
}

builder.Services.AddControllers();
builder.Services.AddHttpClient("LlmClient", client => client.Timeout = TimeSpan.FromSeconds(600));
builder.Services.AddHttpContextAccessor();
builder.Services.AddCloudAdapter();
builder.Logging.AddConsole();

// Add AspNet token validation
builder.Services.AddBotAspNetAuthentication(builder.Configuration);

// Register IStorage.  For development, MemoryStorage is suitable.
// For production Agents, persisted storage should be used so
// that state survives Agent restarts, and operate correctly
// in a cluster of Agent instances.
builder.Services.AddSingleton<IStorage, MemoryStorage>(); // we will implement a custom storage later

builder.Services.AddDbContext<KGSDbContext>(options =>
    options.UseNpgsql(KhojiConstants.DatabaseConnectionString, //builder.Configuration.GetConnectionString("DefaultConnection")
    npgsqlOptions =>
    {
        npgsqlOptions.MigrationsHistoryTable("__KGSMigrationsHistory", "kgs");
    }));

builder.AddPostHog();

DefaultUnleash unleash = null;
if (builder.Configuration["Unleash:ApiKey"] is { Length: > 0 } apiKey &&
    builder.Configuration["Unleash:HostUrl"] is { Length: > 0 } hostUrl)
{
    var settings = new UnleashSettings()
    {
        AppName = "kgs",
        UnleashApi = new Uri(hostUrl),
        CustomHttpHeaders = new Dictionary<string, string>()
        {
            { "Authorization", apiKey }
        }
    };

    unleash = new DefaultUnleash(settings);
    builder.Services.AddSingleton<IUnleash>(f => unleash);
}
else
    Console.WriteLine("[WARNING] Unleash is not configured, we need Unleash__ApiKey/Unleash__HostUrl environment variables and/or unleash-key/unleash-url secret");

builder.Services.AddTransient<IDistributedCache, PostgresDistributedCache>();

builder.Services.AddTickerQ(options =>
{
    options.SetExceptionHandler<TickerExceptionHandler>();

    // Set the max thread concurrency for Ticker (default: Environment.ProcessorCount).
    //opt.SetMaxConcurrency(maxConcurrency: ...);

    // Set fallback time out to check for missed jobs and execute.
    //opt.UpdateMissedJobCheckDelay(timeSpan: ...);

    //options.SetInstanceIdentifier("KGS"); // the default Environment.MachineName is causing issues across deployments/container restarts
    //options.AddOperationalStore<KGSDbContext>(efOpt =>
    //{
    //    efOpt.UseModelCustomizerForMigrations();    // Applies custom model customization only during EF Core migrations
    //    efOpt.CancelMissedTickersOnAppStart();      // Useful in distributed mode
    //});

    options.AddOperationalStore(efOptions =>
    {
        efOptions.UseTickerQDbContext<TickerQDbContext>(optionsBuilder =>
        {
            optionsBuilder.UseNpgsql(KhojiConstants.DatabaseConnectionString,
                cfg =>
                {
                    cfg.MigrationsAssembly("KhojiGenAIServer");
                    cfg.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), ["40P01"]);
                });
        });
    });
});

builder.Services.AddWorkflow(options =>
{
    options.UsePostgreSQL(KhojiConstants.DatabaseConnectionString,
        canCreateDB: true, canMigrateDB: true,
        schemaName: "kgs");
});

builder.Services.AddTransient<KhojiSubscription>();
builder.Services.AddLlmIntegration();

builder.Services.AddCors(options =>
{
    options.AddPolicy("WebChat", policy =>
    {
        policy.WithOrigins("http://localhost:4241", KhojiConstants.KhojiXBaseUrl)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Add AgentApplicationOptions from config.
builder.AddAgentApplicationOptions();

// Add the ConversationBot as a singleton
builder.Services.AddTransient(sp =>
{
    var options = new ConversationOptions()
    {
        Adapter = sp.GetService<CloudAdapter>(),
        Notification = new NotificationOptions
        {
            BotAppId = builder.Configuration["Connections:BotServiceConnection:Settings:ClientId"],
            Store = new NotificationStore(),
        },
    };

    return new ConversationBot(options);
});


// Add the bot (which is transient)
builder.AddAgent<AgileBot>();
builder.AddAgent<OpsBot>();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();

builder.WebHost.ConfigureKestrel(o =>
{
    o.ListenAnyIP(5130); // protected - internal
    o.ListenAnyIP(9090); // protected - internal

    o.ListenAnyIP(8080); // public
});

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 209_71_5200; // 200 MB
});

var app = builder.Build();

// Apply migrations during startup & run XtimeSheetJob on startup
using (var scope = app.Services.CreateScope())
{
    Console.WriteLine("[INFO] Applying KGS migrations....");
    var db = scope.ServiceProvider.GetRequiredService<KGSDbContext>();
    db.Database.Migrate(); // Runs all pending migrations

    Console.WriteLine("[INFO] Applying TickerQ migrations....");
    var dbJobs = scope.ServiceProvider.GetRequiredService<TickerQDbContext>();
    dbJobs.Database.Migrate();

    Console.WriteLine("[INFO] Cleaning up jobs....");
    var dataAccess = new PgDataAccess(KhojiConstants.DatabaseConnectionString);
    dataAccess.ExecuteNonQuery("delete from ticker.\"CronTickerOccurrences\"");
    dataAccess.ExecuteNonQuery("delete from ticker.\"CronTickers\"");

#if DEBUG
#else
    // run tickerQ XTimeSheetJob
    var xTimeSheetJob = new KhojiGenAIServer.Jobs.XTimeSheetJob(
        scope.ServiceProvider.GetRequiredService<ILogger<KhojiGenAIServer.Jobs.XTimeSheetJob>>(),
        scope.ServiceProvider.GetRequiredService<ConversationBot>()
    );
    await xTimeSheetJob.ExecuteJobAsync();
#endif
}

#if DEBUG
#else
app.UseTickerQ();
#endif

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

var protectedEndpoints = app.MapGroup("/")
    .WithGroupName("protected")
    .RequireHost("*:9090");
var publicEndpoints = app.MapGroup("/public")
    .WithGroupName("public")
    .RequireHost("*:8080", "*");

publicEndpoints.MapPost("/api/messages", async (HttpRequest request, HttpResponse response, IAgentHttpAdapter adapter, IAgent agent, CancellationToken cancellationToken) =>
{
    await adapter.ProcessAsync(request, response, agent, cancellationToken);
});
protectedEndpoints.MapPost("/api/messages", async (HttpRequest request, HttpResponse response, IAgentHttpAdapter adapter, IAgent agent, CancellationToken cancellationToken) =>
{
    await adapter.ProcessAsync(request, response, agent, cancellationToken);
});

protectedEndpoints.MapPost("/api/analytics/{yamlFilePath}", async (string yamlFilePath, HttpRequest request, HttpResponse response) =>
    await AnalyticsFeature.HandleAsync(app.Services, yamlFilePath, request, response));

protectedEndpoints.MapPost("/api/llm/invoke", async (IWebHostEnvironment environment, HttpContext context, HttpRequest request, HttpResponse response) =>
//LlmIntegration.LlmRequest model) =>
{
    var logNumber = await environment.LogRequestAsync(context);
    var model = await JsonSerializer.DeserializeAsync<LlmIntegration.LlmRequest>(context.Request.Body); // Deserializing model manually

    using var scope = app.Services.CreateScope();
    return await LlmIntegration.HandleAsync(/*app.Services*/ scope, environment, context, request, response, logNumber, model);
});

protectedEndpoints.MapPost("/v1/chat/completions", async (HttpRequest request, OpenAIEndpoint.ChatCompletionRequest chat) =>
    await OpenAIEndpoint.HandleAsync(app.Services, request, chat));
publicEndpoints.MapPost("/v1/chat/completions", async (HttpRequest request, OpenAIEndpoint.ChatCompletionRequest chat) =>
    await OpenAIEndpoint.HandleAsync(app.Services, request, chat));

publicEndpoints.MapGet("/test", () =>
{
    try
    {
        return $"Version: {Environment.Version} ran successfully";
    }
    catch
    {
        return "Something bad happened";
    }
});
protectedEndpoints.MapGet("/test", () =>
{
    try
    {
        return $"MachineName: {Environment.MachineName}, OSVersion: {Environment.OSVersion}, IsPrivilegedProcess: {Environment.IsPrivilegedProcess}, Version: {Environment.Version} ran successfully";
    }
    catch (Exception ex)
    {
        return ex.Message;
    }
});

protectedEndpoints.MapPost("/api/notification", async (HttpRequest request, HttpResponse response, ConversationBot conversation, CancellationToken cancellationToken) =>
{
    try
    {
        await conversation.SendMessageToAllInstallations("This is a proActive message to all the installations", cancellationToken);
        return Results.Ok(new { status = "sent" });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Playground")
{
    protectedEndpoints.MapGet("/", () => "KhojiGenAIServer");
    app.UseDeveloperExceptionPage();
    //app.MapControllers().AllowAnonymous();
}
//else
//{
//    app.MapControllers();
//}

app.MapKiaFeatureEndpoints();

if (Globals.IsDebugging)
{
    var requestsFolder = Path.Combine(builder.Environment.ContentRootPath, "requests");
    Globals.RequestsFolderAbsolutePath = requestsFolder;

    Directory.CreateDirectory(requestsFolder);

    var provider = new FileExtensionContentTypeProvider();
    provider.Mappings[".http"] = "text/plain";

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(requestsFolder),
        ContentTypeProvider = provider,
        RequestPath = "/requests"
    });
}

bool agentsFlag = false;
if (unleash != null) agentsFlag = unleash.IsEnabled("scrum-assistant", false);
if (Environment.GetEnvironmentVariable("KGS-AGENTS").HasText()) agentsFlag = true;

if (agentsFlag)
{
    app.MapWebChatFeatureEndpoints();
    app.AddAgentsIntegration();
}

await app.RunAsync();

unleash?.Dispose();

static bool UseAspireDashboard()
{
#if DEBUG
    return true;
#else
    return false;
#endif
}
