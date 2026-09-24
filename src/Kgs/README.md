Khoji GenAI Server (KGS) is a comprehensive AI-powered platform that integrates with Microsoft Teams
and provides GenAI services to the Khoji ecosystem. The system serves as both a Teams bot and an API
server for AI-driven agile project management. The bot is developed using M365 Agent SDK and GenAI
services are developed using Microsoft AI Extensions and Semantic Kernel.

# The Bigger Picture

```
     +-----+    +------+    +-----+
     | KSS |--->| PGDB | -->| KAS |
     +-----+    +------+    +-----+
                   |         | |
                   +-----------+
                   | +-------+ |
                   v v         v
+-------+     +-------+     +-----+
| Teams | --> |**KGS**| --> | KBS |
+-------+     +-------+     +-----+
                   |
                   |
                   v
                +-----+
                | LLM |
                +-----+
```

# Core Components

- **Teams Bot Integration**: Microsoft Teams bot using M365 Agent SDK with adaptive cards and proactive messaging
- **LLM Wrapper**: Multi-LLM support (OpenAI, Claude, Ollama) with caching and prompt management
- **Analytics Engine**: YAML-based workflow runner for sprint analysis and scrum automation
- **Data Integration**: PostgreSQL database with Entity Framework, Jira integration via Dapplo.Jira
- **Web Chat Backend**: Public API endpoints for web-based chat interfaces

# Key Features

- Semantic Kernel agents with plugins for scrum updates and sprint analysis
- Model Context Protocol (MCP) client for Jira integration
- Intent detection using sentence transformers
- Distributed caching and job scheduling
- Proactive subscription management
- OpenAI-compatible API endpoints

The system is designed to enhance agile workflows through AI-powered insights, automated scrum updates,
and intelligent project analytics.

# 🧠 What's KGS?

## LLM Wrapper: KIA vs KGS

- ✅ Prompts
    - XML and TXT
- ✅ LLMs
    - Open AI and Claude
    - KIA Migrated Endpoints
    - Caching

## Teams Bot

- ✅ Bot / LLM Agents
- ✅ Adaptive Cards
- ✅ Proactive Messaging

## GenAI / Chatbot?

- ✅ Microsoft AI Extensions
    - Open AI and Claude
- ✅ Semantic Kernel
    - Semantic Kernel Agent
    - Semantic Kernel Plugins
    - MCP Client

## Analytics Server

- ✅ YAML / Sequence Steps Runner
    - LLM Integration
    - Distributed Caching
    - Sprint Analysis
- 🚀 Question Classifier
- 🚀 Workflow Engine

## Server

- 🚧 Rest/API Endpoints
    - ✅ LLM Integration
    - 🚧 Web Chat Backend
    - 🚀 OpenAI Compatible Endpoint
- ✅ Static File Server
    - Requests Files
- ✅ Sentence Transformer
    - Onnx / MiniML
    - Intent Detection
- ✅ Data Access
    - PostgreSQL
        - ✅ Migrations enabled Data Store / Entity Framework
        - ✅ KSS and KBS Database Knowledge
        - ✅ Proactive Subscriptions
        - ✅ Database Dictionaries
            - What's Changed Since
    - Jira
        - ✅ Object Oriented Jira access through Dapplo.Jira
- ✅ Distributed Caching
- ✅ Job Scheduler
    - Sync / Trigger + Auto
    - Proactive Subscriptions
    - AI Worklogs
    - Periodic Analytics

# Technology Stack

## Framework & Runtime
- **.NET 9.0** (main server) / **.NET 8.0** (libraries)
- **ASP.NET Core** web application with Kestrel server
- **C#** with implicit usings and nullable reference types enabled

## Key Dependencies
- **Microsoft Agents SDK** - Teams bot framework
- **Microsoft Semantic Kernel** - AI orchestration
- **Entity Framework Core** with **PostgreSQL** (Npgsql)
- **Anthropic SDK** and **OpenAI connectors** for LLM integration
- **Model Context Protocol** for external integrations
- **WorkflowCore** for workflow orchestration
- **TickerQ** for job scheduling
- **YamlDotNet** for configuration management

## Database & Caching
- **PostgreSQL** as primary database with custom schema (`kgs`)
- **Entity Framework Core** migrations with custom history table
- **Distributed caching** via PostgreSQL implementation
- Connection string resolved via `UworxConstants.DatabaseConnectionString` from either the
  standard configuration (`ConnectionStrings:DefaultConnection` in appsettings.json /
  user-secrets) or the `ConnectionStrings__DefaultConnection` environment variable
  (env var wins). KGS fail-fast terminates at startup with a `[FATAL]` message when
  neither source provides a value; there is no in-code fallback

## Build & Development Commands

### Local Development
```bash
# Run with Visual Studio - use "Multiple Startup Projects" configuration
# Requires PostgreSQL running locally — connection (host, port, DB name, user)
# is configured via the standard ConnectionStrings:DefaultConnection setting
# (appsettings.json / user-secrets) or the ConnectionStrings__DefaultConnection
# environment variable (see launchSettings.json). KGS requires it and terminates
# at startup with a [FATAL] message if neither source provides a value. The DB name
# is whatever you configure — via POSTGRES_DB in docker-compose/.env, or directly
# in your connection string. KHOJIX_BASE_URL (browser-facing URL) and
# KHOJIX_BUSINESS_SERVER_URL (server-to-server KBS URL — the compose service name
# `kbs`, not localhost) are also required, as are KHOJI_BASICAUTHUSERNAME /
# KHOJI_BASICAUTHUSERPASSWORD (used for the inter-service KBS basic-auth call).

# Apply migrations (automatic on startup)
dotnet ef database update

# Build solution
dotnet build

# Run tests (if any)
dotnet test
```

### Docker Operations

**This is not working and not supported**

Please use Docker Compose arrangement from /devops folder

Note: To test prompts / intents when running via docker, externalize the volume: see e.g: devops\Local\docker-compose.yml (KGS Section)

```bash
# Build Docker image
docker-build.bat

# Push to registry
docker-push.bat

# Run with Docker Compose
docker compose up
```

- Simple test: http://localhost:9090/test
- Simple test: http://localhost:8080/public/test

### API Testing
- Test endpoints: `http://localhost:9090/test` (protected), `http://localhost:8080/public/test` (public)
- Use `.http` files in requests folder for API testing
- Swagger available in development mode

## Configuration
- **Environment variables** for LLM configuration (KIA-compatible)
- **llms.yaml** for multi-LLM setup
- **Docker secrets** support via `DockerSecretsManager`
- **Feature flags** via Unleash integration
- **Analytics** via PostHog integration

## Port Configuration
- **5130**: Internal protected endpoints
- **8080**: Public endpoints  
- **9090**: Protected internal endpoints

# Project Structure

## Solution Organization

The solution follows a modular architecture with clear separation of concerns:

```
├── KhojiGenAIServer/         # Main web application (ASP.NET Core)
├── Dapplo.Jira/              # Jira integration library
├── Uworx.Khoji/              # Core shared library
├── Uworx.Khoji.Agile/        # Agile-specific functionality
```

## Main Application Structure (KhojiGenAIServer)

### Core Directories
- **`Abstractions/`** - Interface definitions and contracts
- **`Analytics/`** - YAML workflow definitions and analytics engine
- **`Chat/`** - Teams bot implementation and chat handlers
- **`Data/`** - Entity Framework DbContext and data models
- **`Extensions/`** - Extension methods and service configurations
- **`Features/`** - Feature-specific implementations (WebChat, Analytics, etc.)
- **`Infrastructure/`** - Cross-cutting concerns (caching, logging, etc.)
- **`Intents/`** - Intent detection and classification
- **`Jobs/`** - Background job implementations
- **`Migrations/`** - Entity Framework database migrations
- **`Prompts/`** - LLM prompt templates (XML and TXT formats)
- **`Services/`** - Business logic and service implementations

### Configuration Files
- **`appsettings.json`** - Application configuration
- **`llms.yaml`** - Multi-LLM configuration
- **`.http` files** - API testing requests

## Project Dependencies

### Dependency Flow
```
KhojiGenAIServer
├── Dapplo.Jira (Jira API integration)
├── Uworx.Khoji.Agile (depends on Dapplo.Jira + Uworx.Khoji)
└── Uworx.Khoji (core shared library)
```

## Naming Conventions

- **Namespaces**: Follow project structure (`KhojiGenAIServer.Features.WebChat`)
- **Files**: PascalCase for classes, descriptive names for features
- **Configuration**: Use structured appsettings with environment variable overrides
- **Database**: Custom schema `kgs` with migration history table `__KGSMigrationsHistory`

## Content Files

Content files are copied to output directory and include:
- **Analytics workflows** (`Analytics/*.yaml`)
- **Chat instructions** (`Instructions/*.txt`)
- **Intent definitions** (`Intents/*.txt`)
- **Prompt templates** (`Prompts/*.xml`, `Prompts/*.txt`)
- **Skills** (`Skills/*`, `Skills/*`)

## Docker & Deployment

- **`Dockerfile`** - Container definition
- **`docker-compose.yml`** - Multi-service orchestration
- **`docker-build.bat`** / **`docker-push.bat`** - Build automation scripts