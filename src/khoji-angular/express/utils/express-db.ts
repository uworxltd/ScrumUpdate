import { Pool, PoolClient } from 'pg';
import config from './config';
import { getLogger } from './logger';
const logger = getLogger('ExpressDb');

interface TokenData {
  accessToken: string;
  refreshToken: string | null;
  provider: string;
  userId: number;
  providerAccountId: string | null;
  updatedAt: Date;
}

interface SaveTokensResult {
  id: number;
  userId: number;
  provider: string;
  savedAt: Date;
}

interface ConnectionTestResult {
  success: boolean;
  timestamp: Date;
}

/**
 * Database class for managing identity provider credentials
 * Handles PostgreSQL connection pooling and token retrieval
 */
class ExpressDb {
  private pool: Pool | null = null;
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize the database connection pool
   */
  private init(): void {
    try {
      this.pool = new Pool({
        host: config.dbHost,
        port: config.dbPort,
        database: config.dbName,
        user: config.dbUser,
        password: config.dbPassword,
        // Database schema is usually set in connection string or via SET schema command
      });

      // Handle pool errors
      if (this.pool) {
        this.pool.on('error', (err: Error) => {
          logger.error(`Unexpected error on idle client: ${err.message}`);
        });

        // Non-blocking initial connectivity check to provide a clearer early error message
        (async () => {
          try {
            const client = await this.pool!.connect();
            await client.query('SELECT 1');
            client.release();
            logger.info('Initial connectivity test succeeded');
          } catch (err: any) {
            const host = config.dbHost;
            const port = String(config.dbPort);
            logger.error(`Initial connectivity test FAILED for ${host}:${port} — ${err.message}`);
            logger.error("Hint: if you're running Postgres locally via Docker map, set NG_DB_HOST=127.0.0.1 NG_DB_PORT=5435; or run this service in the same Docker network where 'postgres' hostname resolves.");
          }
        })();
      }

      this.initialized = true;
      logger.info('Connection pool initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize connection pool: ' + error.message);
      throw error;
    }
  }

  /**
   * Get tokens for a specific provider from the database
   * 
   * @param {string} provider - Provider name (e.g., 'JIRA', 'GITHUB', 'AZURE')
   * @param {number} userId - User ID
   * @returns {Promise<TokenData>}
   * @throws {Error} If query fails or no credentials found
   */
  async getTokens(provider: string, userId: number): Promise<TokenData> {
    if (!this.initialized || !this.pool) {
      throw new Error('Database pool not initialized');
    }

    if (!provider) {
      throw new Error('Provider parameter is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();

      // Set schema for this connection
      await client.query(`SET search_path TO ${config.dbSchema}`);

      let query = `
        SELECT 
          source_access_token,
          source_refresh_token,
          provider,
          user_id,
          provider_account_id,
          created_at,
          updated_at
        FROM identity_provider
        WHERE provider = $1 AND user_id = $2
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const params: any[] = [provider, userId];

      logger.debug(`Fetching tokens for provider=${provider}, userId=${userId}`);

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        logger.warn(`No credentials found for provider=${provider}, userId=${userId}`);
        throw new Error(`No credentials found for provider: ${provider}, userId: ${userId}`);
      }

      const row = result.rows[0];

      // Validate that we have an access token
      if (!row.source_access_token) {
        logger.warn(`Access token is missing for provider=${provider}, userId=${userId}`);
        throw new Error(`No access token found for provider: ${provider}, userId: ${userId}`);
      }

      logger.debug(`Successfully retrieved tokens for provider=${provider}, userId=${userId}`);

      return {
        accessToken: row.source_access_token,
        refreshToken: row.source_refresh_token || null,
        provider: row.provider,
        userId: row.user_id,
        providerAccountId: row.provider_account_id,
        updatedAt: row.updated_at
      };

    } catch (error: any) {
      logger.error(`Error fetching tokens for provider=${provider}, userId=${userId}: ${error.message}`);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Save or update tokens for a provider and user
   * 
   * @param {number} userId - User ID
   * @param {string} provider - Provider name
   * @param {string} accessToken - Access token to save
   * @param {string|null} refreshToken - Refresh token (optional)
   * @param {string|null} providerAccountId - Account ID from provider (optional)
   * @param {string|null} loginCode - Login code (optional)
   * @returns {Promise<SaveTokensResult>}
   */
  async saveTokens(
    userId: number,
    provider: string,
    accessToken: string,
    refreshToken: string | null = null,
    providerAccountId: string | null = null,
    loginCode: string | null = null
  ): Promise<SaveTokensResult> {
    if (!this.initialized || !this.pool) {
      throw new Error('Database pool not initialized');
    }

    if (!userId || !provider || !accessToken) {
      throw new Error('userId, provider, and accessToken are required');
    }

    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();

      // Set schema for this connection
      await client.query(`SET search_path TO ${config.dbSchema}`);

      logger.debug(`Saving tokens for provider=${provider}, userId=${userId}`);

      // First check if record exists
      const checkQuery = `
        SELECT id FROM identity_provider
        WHERE user_id = $1 AND provider = $2
        LIMIT 1
      `;

      const checkResult = await client.query(checkQuery, [userId, provider]);

      let result;

      if (checkResult.rows.length > 0) {
        // Update existing record
        const updateQuery = `
          UPDATE identity_provider
          SET 
            source_access_token = $3,
            source_refresh_token = $4,
            provider_account_id = $5,
            login_code = $6,
            updated_at = NOW()
          WHERE user_id = $1 AND provider = $2
          RETURNING id, user_id, provider, updated_at
        `;

        result = await client.query(updateQuery, [userId, provider, accessToken, refreshToken, providerAccountId, loginCode]);
        logger.debug(`Updated existing credentials for provider=${provider}`);
      } else {
        // Insert new record
        const insertQuery = `
          INSERT INTO identity_provider 
          (user_id, provider, source_access_token, source_refresh_token, provider_account_id, login_code, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id, user_id, provider, created_at, updated_at
        `;

        result = await client.query(insertQuery, [userId, provider, accessToken, refreshToken, providerAccountId, loginCode]);
        logger.debug(`Inserted new credentials for provider=${provider}`);
      }

      return {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        provider: result.rows[0].provider,
        savedAt: result.rows[0].updated_at || result.rows[0].created_at
      };

    } catch (error: any) {
      logger.error(`Error saving tokens for provider=${provider}, userId=${userId}: ${error.message}`);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getTenantIdForInstance(instanceName: string): Promise<string> {
    if (!this.initialized || !this.pool) {
      throw new Error('Database pool not initialized');
    }

    if (!instanceName) {
      throw new Error('Instance name parameter is required');
    }

    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();

      // Set schema for this connection
      await client.query(`SET search_path TO ${config.dbSchema}`);

      let query = `
        SELECT 
          tenant_id
        FROM instance
        WHERE instance_name = $1
      `;

      const params: any[] = [instanceName];

      logger.debug(`Fetching instance id for instanceName=${instanceName}`);

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        logger.warn(`No instance found for instanceName=${instanceName}`);
        throw new Error(`No instance found for instanceName: ${instanceName}`);
      }

      const row = result.rows[0];

      // Validate that we have a tenant ID
      if (!row.tenant_id) {
        logger.warn(`Tenant ID is missing for instanceName=${instanceName}`);
        throw new Error(`No tenant ID found for instanceName: ${instanceName}`);
      }

      logger.debug(`Successfully retrieved tenant ID for instanceName=${instanceName}`);

      return row.tenant_id;

    } catch (error: any) {
      logger.error(`Error fetching tenant ID for instanceName=${instanceName}: ${error.message}`);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Test database connection
   * 
   * @returns {Promise<ConnectionTestResult>}
   */
  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.initialized || !this.pool) {
      throw new Error('Database pool not initialized');
    }

    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();

      const result = await client.query('SELECT NOW() as timestamp');

      logger.info('Connection test successful');

      return {
        success: true,
        timestamp: result.rows[0].timestamp
      };

    } catch (error: any) {
      logger.error(`Connection test failed: ${error.message}`);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Close the connection pool (gracefully shutdown)
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.initialized = false;
      logger.info('Connection pool closed');
    }
  }
}

// Export as singleton
export default new ExpressDb();
