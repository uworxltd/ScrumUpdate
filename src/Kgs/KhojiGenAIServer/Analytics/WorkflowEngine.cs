// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Features;
using KhojiGenAIServer.Infrastructure;
using KhojiGenAIServer.Services;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Caching.Distributed;
using Npgsql;
using System.Reflection;
using System.Text;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using static KhojiGenAIServer.Features.LlmIntegration;

namespace KhojiGenAIServer.Analytics;

// public because of tests
public class WorkflowEngine
{
    readonly ILogger logger;
    readonly string connectionString;

    public WorkflowEngine(ILogger logger, string connectionString)
    {
        this.logger = logger;
        this.connectionString = connectionString;
    }

    WorkflowDefinition loadWorkflow(string yamlFilePath, bool isAbsolute)
    {
        if (!isAbsolute)
        {
            var metricsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Analytics");
            yamlFilePath = Path.Combine(metricsFolder, $"{yamlFilePath}.yaml");
        }

        if (!File.Exists(yamlFilePath)) throw new ArgumentException($"{yamlFilePath} doesnt exist");

        var yaml = File.ReadAllText(yamlFilePath);
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        return deserializer.Deserialize<WorkflowDefinition>(yaml);
    }

    Dictionary<string, object> resolveInputs(Dictionary<string, InputParameter> inputDefs, Dictionary<string, object> runtimeInputs)
    {
        var resolved = new Dictionary<string, object>();
        runtimeInputs ??= new Dictionary<string, object>();

        foreach (var inputDef in inputDefs)
        {
            if (runtimeInputs.ContainsKey(inputDef.Key))
                resolved[inputDef.Key] = runtimeInputs[inputDef.Key];
            else
                resolved[inputDef.Key] = inputDef.Value.Default;
        }

        return resolved;
    }

    #region workflow

    async Task<object> executeWorkflowStepAsync(int instanceId, WorkflowStep step, WorkflowContext parentContext)
    {
        ArgumentNullException.ThrowIfNull(step.Workflow);

        // Resolve inputs using parent context
        var workflowInputs = new Dictionary<string, object>();
        if (step.Inputs != null)
        {
            foreach (var input in step.Inputs)
            {
                var value = input.Value;
                if (value is string strValue)
                {
                    // Check if it's a reference to parent context
                    if (strValue.Contains("{") && strValue.Contains("}"))
                    {
                        var key = strValue.Trim('{', '}');
                        if (parentContext.TryGetVariable<object>(key, out var contextValue))
                            value = contextValue;
                    }
                }
                workflowInputs[input.Key] = value;
            }
        }

        // Execute the sub-workflow
        return await ExecuteWorkflowAsync(instanceId, step.Workflow, isAbsolute: false, workflowInputs);
    }

    async Task<StepResult> executeStepAsync(int instanceId, WorkflowStep step, object previousResult, WorkflowContext context)
    {
        try
        {
            object result = step.Type?.ToLower() switch
            {
                "sql" => await executeSqlStepAsync(instanceId, step, context),
                "function" => executeFunctionStep(instanceId, step, previousResult, context),
                "llm" => await executeLlmStepAsync(instanceId, step, previousResult, context),
                "workflow" => await executeWorkflowStepAsync(instanceId, step, context),
                _ => throw new NotSupportedException($"Step type '{step.Type}' is not supported")
            };

            // Store result in context if Variable is specified
            if (!string.IsNullOrEmpty(step.Output))
                context.SetVariable(step.Output, result);

            return new StepResult { StepId = step.Id, Data = result, Success = true };
        }
        catch (Exception ex)
        {
            return new StepResult { StepId = step.Id, Success = false, Error = ex.Message };
        }
    }

    #endregion

    #region sql

    string substituteParameters(string template, IReadOnlyDictionary<string, object> parameters)
    {
        var result = template;

        foreach (var param in parameters)
            result = result.Replace($"{{{param.Key}}}", param.Value?.ToString());

        return result;
    }

    IEnumerable<FieldDef> parseReturnType(string toParse)
    {
        var inner = toParse.Trim().Trim('(', ')'); // we can have leading and ending newlines
        var parts = inner.Split(',');

        foreach (var part in parts)
        {
            var tokens = part.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (tokens.Length != 2)
                throw new FormatException($"Invalid field definition: {part}");

            var typeName = tokens[0];
            var fieldName = tokens[1];

            var type = typeName switch
            {
                "json" => typeof(string),
                "jsonb" => typeof(string),
                //"json" => typeof(JsonDocument),
                //"jsonb" => typeof(JsonDocument),
                "string" => typeof(string),
                "int" => typeof(int),
                "bool" => typeof(bool),
                "DateTime" => typeof(DateTime),
                "double" => typeof(double),
                "long" => typeof(long),
                "float" => typeof(float),
                _ => typeof(object)
            };

            yield return new FieldDef(fieldName, type);
        }
    }

    async Task<DynamicTable> readToTableAsync(NpgsqlCommand command, IReadOnlyList<FieldDef> schema)
    {
        var rows = new List<object?[]>();

        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var values = new object?[schema.Count];

            for (int i = 0; i < schema.Count; i++)
            {
                var val = reader.IsDBNull(i) ? null : reader.GetValue(i);
                if (val != null && val.GetType() != schema[i].Type)
                    val = Convert.ChangeType(val, schema[i].Type);

                values[i] = val;
            }

            rows.Add(values);
        }

        return new DynamicTable(schema, rows);
    }

    async Task<object> executeSqlStepAsync(int instanceId, WorkflowStep step, WorkflowContext context)
    {
        var schemaName = $"tenant_{instanceId}";
        var query = substituteParameters(step.Query, context.Inputs);

        using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        using var cmdSchema = connection.CreateCommand();
        cmdSchema.CommandText = $"SET search_path TO \"{schemaName}\"";
        cmdSchema.ExecuteNonQuery();

        var schema = parseReturnType(step.Returns).ToList();
        using var command = new NpgsqlCommand(query, connection);
        var table = await readToTableAsync(command, schema);

        return table;
    }

    #endregion

    #region function

    MethodInfo resolveMethod(string methodPath)
    {
        // Parse "App.Processors.Generic.SummariseWorklog" format
        var parts = methodPath.Split('.');
        var methodName = parts.Last();
        var typeName = string.Join(".", parts.Take(parts.Length - 1));

        var type = Type.GetType(typeName) ??
                   AppDomain.CurrentDomain.GetAssemblies()
                       .SelectMany(a => a.GetTypes())
                       .FirstOrDefault(t => t.FullName == typeName);

        if (type == null) throw new InvalidOperationException($"Type '{typeName}' not found");

        var method = type.GetMethod(methodName, BindingFlags.Static | BindingFlags.Public);
        if (method == null) throw new InvalidOperationException($"Static method '{methodName}' not found in type '{typeName}'");

        return method;
    }

    object executeFunctionStep(int tenantId, WorkflowStep step, object previousResult, WorkflowContext context)
    {
        var methodInfo = resolveMethod(step.Method);
        var parameters = new List<object> { previousResult };
        var methodParams = methodInfo.GetParameters(); // Add workflow context as additional parameter if method expects it

        if (methodParams.Length > 1) parameters.Add(context);

        return methodInfo.Invoke(null, parameters.ToArray());
    }

    #endregion

    #region llm

    async Task<string> invokePromptAsync(string logNumber, string llm, string prompt, string input)
    {
        ArgumentNullException.ThrowIfNullOrEmpty(prompt);
        ArgumentNullException.ThrowIfNullOrEmpty(input);

        IChatClient client = new LlmConfigs().CreateChatClient(llm);
        if (client == null) throw new ArgumentException($"Failed to create ChatClient for {llm}");

        List<ChatMessage> messages = new();
        if (!messages.AddPromptAndMessage(prompt, input))
            throw new ArgumentException($"Failed to find {prompt} prompt file");

        var sb = new StringBuilder();
        messages.ForEach(m =>
        {
            sb.AppendLine($"{m.Role}");
            sb.AppendLine(m.Text);
            sb.AppendLine();
        });

        await RequestsLogging.LogLlmRequestAsync(logNumber, sb.ToString());

        var llmResponse = await LlmIntegration.MakeAICallAsync(logger, client,
            prompt, messages,
            logNumber: logNumber);

        await RequestsLogging.LogLlmResponseAsync(logNumber, llmResponse.Text);

        return llmResponse.Text;
    }

    async Task<object> executeLlmStepAsync(int tenantId, WorkflowStep step, object previousResult, WorkflowContext context)
    {
        ArgumentNullException.ThrowIfNull(previousResult);
        var table = previousResult as DynamicTable;
        ArgumentNullException.ThrowIfNull(table);

        var csvData = table.ToCsv();
        if (csvData is null) throw new ApplicationException("Failed to serialize previousResult");

        var sb = new StringBuilder();
        if (context.TryGetVariable<string>("additionalInfo", out var additionalInfo) && !string.IsNullOrEmpty(additionalInfo))
            sb.Append($"Additional Information: {additionalInfo}{Environment.NewLine}{Environment.NewLine}");
        sb.Append(csvData);

        var llmInput = sb.ToString();
        IDistributedCache cache = new PostgresDistributedCache(this.connectionString);

        return await cache.GetOrSetStringAsync(
            getCacheKey: () => LlmCaching.GenerateCacheKey(tenantId, step.Llm, step.Prompt, llmInput),
            notFound: options =>
            {
                //options.SlidingExpiration = TimeSpan.FromHours(4);
                var duration = TimeSpan.FromHours(24);
                if (step.Cache.HasValue && step.Cache.Value > 0)
                    duration = TimeSpan.FromSeconds(step.Cache.Value);

                options.AbsoluteExpirationRelativeToNow = duration;
                string logNumber = RequestsLogging.AllocateLogNumber().Result;
                return invokePromptAsync(logNumber, step.Llm, step.Prompt, llmInput).Result;
            });
    }

    #endregion

    public async Task<object> ExecuteWorkflowAsync(int instanceId, string yamlFilePath,
        bool isAbsolute = false,
        Dictionary<string, object> runtimeInputs = null)
    {
        var workflow = loadWorkflow(yamlFilePath, isAbsolute);
        var workflowInputs = resolveInputs(workflow.Inputs, runtimeInputs);
        var context = new WorkflowContext(workflowInputs);

        logger.LogInformation("Starting workflow: {WorkflowName}", workflow.Name);

        object previousResult = null;

        foreach (var step in workflow.Steps)
        {
            logger.LogInformation("Executing step: {StepId} ({StepType})", step.Id, step.Type);

            var result = await executeStepAsync(instanceId, step, previousResult, context);

            if (!result.Success)
            {
                logger.LogError("Step {StepId} failed: {Error}", step.Id, result.Error);
                throw new InvalidOperationException($"Step {step.Id} failed: {result.Error}");
            }

            previousResult = result.Data;
            logger.LogInformation("Step {StepId} completed successfully", step.Id);
        }

        logger.LogInformation("Workflow {WorkflowName} completed successfully", workflow.Name);
        return previousResult;
    }
}
