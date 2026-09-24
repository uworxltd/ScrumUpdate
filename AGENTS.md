# AGENTS.md

## Repo

Polyglot monorepo — Scrum/Agile platform. 4 languages, 9 source projects.

## Guiding Principle

This codebase inherited a lot of unnecessary complexity. When making changes, strip out what's not needed. No custom Docker networks, no over-engineered configs, no dead abstractions. If a default works, use the default.

## Build

| Project | Command |
|---------|---------|
| Kgs (.NET 10) | `dotnet build src/Kgs/KhojiGenAIServer/KhojiGenAIServer.csproj` |
| KBS (Java 21) | `cd src/khoji-business-server && mvn package -DskipTests` |

> **Java 21 required for Maven builds.** Ensure `JAVA_HOME` points to (or is momentarily set to) a
> JDK 21 install before running Maven. Newer JDKs break the Lombok annotation processor, e.g.
> `java.lang.ExceptionInInitializerError: com.sun.tools.javac.code.TypeTag :: UNKNOWN` on JDK 25.
> Check with `mvn -version` (look at the `Java version` line, not `java -version` on PATH).
| Angular | `cd src/khoji-angular && yarn install && yarn build` |
| KSS (Python) | `cd src/kss && pip install -r requirements.txt` |
| Analytics (Python) | `cd src/khoji-analytics/backend && pip install -r requirements.txt` |

## Test

| Project | Command |
|---------|---------|
| .NET unit | `dotnet test tests/Uworx.Khoji.Tests --filter TestCategory=Unit` |
| .NET all | `dotnet test tests/Uworx.Khoji.Tests` |
| Java | `cd src/khoji-business-server && mvn test` |
| Angular | `cd src/khoji-angular && yarn test -- --runInBand [<path>]` |
| Python (KAS) | `cd src/khoji-analytics/backend && pytest` |
| Python (KSS) | `cd src/kss && pytest` |
| E2E (Playwright) | `cd tests/khoji-cloud-automation && npx playwright test --project=chromium` |

> **.NET unit vs all.** Fixtures are tagged `[Category(TestCatory.Unit)]` or
> `[Category(TestCatory.Integration)]` (constants in
> `tests/Uworx.Khoji.Tests/NUnitConstants.cs`). `--filter TestCategory=Unit` runs only the
> unit fixtures and skips the Integration ones (Analytics, Python bridge, WatchesIntegration,
> Gateway, Dapplo Jira). Use that filter for fast feedback before each commit; `.NET all` is
> the full suite and may need external services.

> **Python (KAS/KSS).** Tests live in `src/khoji-analytics/backend/tests/` (KAS) and
> `src/kss/tests/` (KSS). `src/kss/requirements.txt` does **not** include pytest — run
> `pip install pytest` once per venv before `pytest` there.

> **Angular (Jest).** The `angular` package runs **Jest** (via `jest` script), not Karma.
> The binary is hoisted to `src/khoji-angular/node_modules`, so run from the workspace root
> (`src/khoji-angular`) — e.g. `yarn test -- --runInBand` or single spec
> `yarn test -- --runInBand src/app/app.component.spec.ts`. `--runInBand` avoids a long
> `--runInBand`-less parallel Karma-style hang; Jest runs headless in CI (`--ci`).

## Lint

| Project | Command |
|---------|---------|
| Angular | No lint script configured (root `yarn lint` fails — `khoji-angular` package has no `lint` script) |
| .NET | `dotnet format src/Kgs/KhojiGenAIServer` |
| Java | No lint configured |

## Code Conventions

- **C#**: 4-space indent, PascalCase types/methods, camelCase locals/params. `.editorconfig` enforced.
- **Java**: 2-space indent, Lombok, Spring Boot 3.3. Maven multi-module. Parent POM at `src/khoji-business-server/pom.xml`.
- **TypeScript/Angular**: 2-space indent, single quotes, semicolons, PrimeNG components, NgRx state.
- **Python**: FastAPI + Celery + Redis. psycopg2/asyncpg for Postgres.

## Infrastructure

- Single `docker compose up` at repo root brings up everything
- Shared Postgres (TimescaleDB), Redis
- All Java services use `eclipse-temurin:21-jre-alpine` runtime
- KGS uses `mcr.microsoft.com/dotnet/aspnet:10.0-noble` (non-chiseled, with curl installed in the Dockerfile) so it can run an in-container `HEALTHCHECK`
- `.env` at repo root is checked in and is the single source of truth (no `example.env`). It may contain a few ids and secrets. Keys blank there but required at runtime (notably `CLAUDE_API_KEY`) can come from the machine environment; Compose prefers the shell over `.env`.

## Gotchas

- `kss` uses Celery workers — requires Redis running.
- Angular is a Yarn workspaces monorepo with `angular/` and `express/` packages.
- `.NET Aspire` host at `src/Khoji.AspireHost/` orchestrates local dev.
- Feature flags via Unleash (Angular + KGS).
- When creating GitHub issues or PR bodies, always write the body to a temp file and pass it with `gh ... --body-file` (or `gh ... --body-file` for PRs). Never inline a multi-line body with `--body "-"` + a here-string — PowerShell mangles heredoc/`@-` and backticks, silently truncating or corrupting the text.
- PowerShell `ConvertFrom-Json` chokes on `src/khoji-angular/angular/src/assets/config/translations/en_GB-translations.json` because it has duplicate case-insensitive keys (`workLog`/`worklog`). Validate JSON with `node -e "JSON.parse(require('fs').readFileSync('<file>'))"` or `python -m json.tool` instead.
