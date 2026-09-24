# Development Environment Setup (khoji-angular Workspace)

## Prerequisites
- Node.js v18.20.6 or higher
- Yarn v1.22.0 or higher

## Workspace Structure

This project uses a **Yarn Workspace** with two packages:
- **khoji-angular**: Angular frontend application
- **khoji-express**: Express.js backend server

## Installation & Setup

### 1. Install Dependencies (Root Level)

```bash
cd khoji-angular
yarn install
```

This will install dependencies for both `angular/` and `express/` packages.

### 2. Development Mode

Run both Angular frontend and Express backend concurrently:

```bash
yarn dev
```

This will start:
- Angular dev server on `http://localhost:4241/khoji`
- Express server on the configured port

### 3. Build for Production

Build both packages for production:

```bash
yarn build
```

This will:
- Build Angular with `ng build --configuration production`
- Compile Express TypeScript with `tsc`

### 4. Other Common Commands

```bash
# Start servers (different from dev - uses compiled/production builds)
yarn start

# Run tests (Angular)
yarn test

# Watch mode tests
yarn test:watch

# Lint code (Angular)
yarn lint

# Clean all build artifacts
yarn clean

# Run specific workspace command
yarn workspace khoji-angular dev
yarn workspace khoji-express dev
```

### 5. Individual Workspace Commands

If you want to work with a single package:

```bash
# Angular only
cd angular
yarn dev
yarn build
yarn test

# Express only
cd express
yarn dev
yarn build
```

# Khoji For Agile

## Project Introduction

KHOJI is a game-changing project management solution that transform the ways you manage your projects. With a more transparent & agile approach we help enterprises unlock the hidden potentials & fuel their business growth. Key features include:

- **Visibility:** Managers can track team and supplier progress.
- **Analytics:** Real-time data analytics for data-driven decisions.
- **Profitability:** Agile software companies can increase profitability and reduce operational costs.

Khoji for Agile helps businesses:
- Unlock hidden potential
- Fuel business growth
- Predict problems before they happen

## Technology Stacks

The frontend of the Khoji application is a single-page application built on the Angular framework.
- Angular: Initially built on version 11, upgraded to version 14.
- Apache Echarts: Version 4.2.1 for visuals.
- Ngrx: Version 14 for state management.
- Node.js: Recommended version 14.15.0 || ^16.10.0
- TypeScript: Recommended version >= 4.6.4 < 4.8.0.

For actively supported versions, refer to [Angular Versions](https://angular.io/guide/versions).

## Docker Environment Variables

### Server Configuration
- **NG_SERVER_NAME**: Server hostname or name for the backend connection
- **NG_SERVER_PORT**: Port number for the server (usually not needed on production)
- **NG_APP_PORT**: Application port number (usually not needed on production)

### Support & Communication
- **NG_JIRA_ISSUE_COLLECTOR_LINK**: URL link to Jira issue collector for issue reporting
- **NG_SUPPORT_EMAIL**: Support email address for user inquiries

### Request Panel
- **NG_REQUEST_PANEL_VISIBILITY**: Flag to control visibility of the request panel in the UI

### User Tracking & Analytics
- **NG_TRACKING_PROVIDER**: Tracking provider name (e.g., analytics service provider)
- **NG_TRACKING_API_TOKEN**: API token for authentication with the tracking service
- **NG_TRACKING_API_HOST**: Host URL for the tracking API endpoint
- **NG_TRACKING_AUTO_EVENTS**: Enable/disable automatic event tracking
- **NG_TRACKING_NAVIGATION_EVENTS**: Enable/disable navigation event tracking
- **NG_TRACKING_USER_ACTION_EVENTS**: Enable/disable user action event tracking
- **NG_TRACKING_APPLICATION_STATUS_EVENTS**: Enable/disable application status event tracking

### Jira OAuth Integration
- **NG_JIRA_CLIENT_ID**: OAuth client ID for Jira authentication. _Must be the actual ID assigned by Atlassian_; if you see the placeholder `/run/secrets/jira-client-id` or a blank string in the console when attempting to sign in, the variable has not been populated and the redirect will fail with ``invalid_request: failed to retrieve client``. Set this value in your local `.env` (or export it) before running `ng serve`.
- **NG_JIRA_SCOPES**: OAuth scopes required for Jira integration

### Captcha Configuration
- **NG_CAPTCHA_KEY**: Google reCAPTCHA v2 **site key** rendered in the login widget. Requires the matching
  `RECAPTCHA_SECRET` on the KBS side to enable verification — set both or neither; empty → captcha is
  skipped gracefully (no script load, no console errors). See `docs/SECURITY.md` → "reCAPTCHA".
- **NG_DISABLE_CAPTCHA**: Flag to disable captcha verification (for development/testing)

### Microsoft OAuth Integration
- **NG_MS_OAUTH_CLIENT_ID**: OAuth client ID for Microsoft authentication
- **NG_MS_OAUTH_TOKEN_URL**: URL endpoint for Microsoft OAuth token exchange
- **NG_MS_OAUTH_REQUESTED_SCOPES**: Required OAuth scopes for Microsoft integration

### Unleash Feature Flags
- **NG_UNLEASH**: Flag to enable/disable Unleash feature flag service (SPA frontend-proxy client)
- **NG_UNLEASH_URL**: URL of the Unleash feature flag server (SPA frontend-proxy client only — not used by Express)
- **NG_UNLEASH_API_TOKEN**: API token for Unleash service authentication (SPA frontend-proxy client)
- **NG_FEATURES_MAP**: Absolute path to the mounted `features-map.json` — Express server only (default: repo copy under `src/unleash-init`)

## Docker Build

The Docker image includes both the Angular frontend and Express backend:

```bash
docker build -f Dockerfile -t khoji-app:latest .
docker run -p 8081:8081 khoji-app:latest
```

The image will:
1. Build the Angular application
2. Copy the Express server
3. Run both services in a single container

## Testing

### Unit Tests

```bash
# Run tests once
yarn test

# Run tests in watch mode
yarn test:watch

# Run with coverage
yarn workspace khoji-angular test:coverage
```

## Docker Build

The Docker image includes both the Angular frontend and Express backend:

```bash
docker build -f Dockerfile -t khoji-app:latest .
docker run -p 8081:8081 khoji-app:latest
```

The image will:
1. Build the Angular application
2. Copy the Express server
3. Run both services in a single container

## Further Help

For more help:
- **Angular CLI**: `ng help` or visit the [Angular CLI Overview and Command Reference](https://angular.io/cli) page
- **Yarn Workspaces**: Visit the [Yarn Workspaces Documentation](https://classic.yarnpkg.com/en/docs/workspaces)
- **Ngrx**: [Ngrx Documentation](https://ngrx.io/guide/store)
- **Express.js**: [Express.js Documentation](https://expressjs.com/)

## Troubleshooting

### E2BIG Error During Install
If you encounter `Error: spawn E2BIG`, try:
```bash
yarn clean
yarn install --network-timeout 100000
```

### Port Already in Use
- Angular default: `4241` - change with `ng serve --port <new-port>`
- Express: configured via environment variables
- Frontend server: configured via `proxy.conf.json`
- Echarts: [Echarts Documentation](https://echarts.apache.org/zh/index.html)

