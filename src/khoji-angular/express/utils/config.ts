import path from 'path';
import dotenv from 'dotenv';
import { cleanEnv, str, num, port as envPort } from 'envalid';

// Load .env from project root (if present). dotenv is tolerant if file is missing.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = cleanEnv(process.env, {
  PORT: envPort({ default: 3000 }),
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),

  // Logging
  NG_LOG_LEVEL: str({ default: 'info' }),

  // Postgres
  NG_DB_HOST: str({ default: '127.0.0.1' }),
  NG_DB_PORT: num({ default: 5435 }),
  NG_DB_NAME: str({ default: 'khoji-admin' }),
  NG_DB_USER: str({ default: 'khoji-admin' }),
  NG_DB_PASS: str({ default: 'khoji' }),
  NG_DB_SCHE: str({ default: 'khoji' }),

  // Jira OAuth
  NG_JIRA_CLIENT_ID: str({ default: '' }),
  NG_JIRA_CLIENT_SECRET: str({ default: '' }),
  NG_JIRA_REDIRECT_URI: str({ default: 'http://localhost:4241/login' }),

  // Feature flags — served from the features map (single source of truth,
  // seeded from src/unleash-init into the container). Falls back to the
  // packaged copy for local dev.
  NG_FEATURES_MAP: str({ default: '' }),
});

class Config {
  readonly port: number = env.PORT;
  readonly nodeEnv: string = env.NODE_ENV;

  readonly logLevel: string = env.NG_LOG_LEVEL;

  readonly dbHost: string = env.NG_DB_HOST;
  readonly dbPort: number = env.NG_DB_PORT;
  readonly dbName: string = env.NG_DB_NAME;
  readonly dbUser: string = env.NG_DB_USER;
  readonly dbPassword: string = env.NG_DB_PASS;
  readonly dbSchema: string = env.NG_DB_SCHE;

  readonly jiraClientId: string = env.NG_JIRA_CLIENT_ID;
  readonly jiraClientSecret: string = env.NG_JIRA_CLIENT_SECRET;
  readonly jiraRedirectUri: string = env.NG_JIRA_REDIRECT_URI;

  readonly unleashFeaturesMap: string = env.NG_FEATURES_MAP;

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}

export default new Config();
