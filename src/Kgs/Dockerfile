FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY KhojiGenAIServer/KhojiGenAIServer.csproj KhojiGenAIServer/
COPY Uworx.Khoji/Uworx.Khoji.csproj Uworx.Khoji/
COPY Uworx.Khoji.Agile/Uworx.Khoji.Agile.csproj Uworx.Khoji.Agile/
# SEMANTICS COPY Uworx.Khoji.Semantics/Uworx.Khoji.Semantics.csproj Uworx.Khoji.Semantics/

RUN dotnet restore KhojiGenAIServer/KhojiGenAIServer.csproj
# SEMANTICS RUN dotnet restore KhojiGenAIServer/KhojiGenAIServer.csproj -r linux-x64

COPY . .

WORKDIR /src/KhojiGenAIServer
RUN dotnet publish -c Release -r linux-x64 -o /app/out
# SEMANTICS RUN dotnet publish -c Release -r linux-x64 --self-contained true -o /app/out

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
# SEMANTICS FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
# SEMANTICS RUN apt-get update && apt-get install -y libgomp1 && rm -rf /var/lib/apt/lists/*

# curl for the in-container Docker healthcheck (chiseled images have no shell/curl).
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# SEMANTICS COPY --from=build /app/out/libonnxruntime.so .
COPY --from=build /app/out .

COPY KhojiGenAIServer/Intents ./Intents
COPY KhojiGenAIServer/Instructions ./Instructions
COPY KhojiGenAIServer/Prompts ./Prompts
COPY KhojiGenAIServer/Skills ./Skills

EXPOSE 8080
EXPOSE 9090
# Self-report health to Docker: /public/test is the anonymous public-group
# liveness endpoint (binds 8080 in-container, regardless of published ports).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["curl", "--fail", "http://localhost:8080/public/test"]
ENTRYPOINT ["dotnet", "KhojiGenAIServer.dll"]
