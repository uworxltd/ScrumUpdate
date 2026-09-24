import { HttpClient } from './http-client';
import expressDb from './express-db';
import config from './config';
import { getLogger } from './logger';
const logger = getLogger('JiraClient');

interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
}

/**
 * JiraClient - handles refreshing Jira OAuth tokens and validating user scopes
 * - constructor(instanceName, ...): create client scoped to a Jira instance
 */
export default class JiraClient {
  private clientId: string;
  private clientSecret: string;
  private readonly hostname = 'api.atlassian.com';
  private instanceName: string;
  private pathPrefix?: string;

  constructor(instanceName: string) {
    this.instanceName = instanceName;
    this.clientId = config.jiraClientId;
    this.clientSecret = config.jiraClientSecret;
  }

  private async ensurePathPrefix(): Promise<string | null> {
    if (this.pathPrefix) return this.pathPrefix;
    try {
      const tenantId = await expressDb.getTenantIdForInstance(this.instanceName);
      if (!tenantId) {
        logger.error(`Tenant ID not found for instance ${this.instanceName}`);
        return null;
      }
      this.pathPrefix = `/ex/jira/${tenantId}`;
      return this.pathPrefix;
    } catch (err: any) {
      logger.error(`Failed to resolve tenant ID for instance ${this.instanceName}: ${err.message || err}`);
      return null;
    }
  }

  /**
   * Exchange a refresh token for a new access token (and possibly a new refresh token).
   * Returns null on failure.
   */
  private async refreshAccessToken(refreshToken: string): Promise<RefreshResult | null> {
    if (!refreshToken) return null;

    if (!this.clientId || !this.clientSecret) {
      logger.error('Missing Jira OAuth client credentials');
      return null;
    }

    try {
      const resp = await HttpClient.post('auth.atlassian.com', '/oauth/token', {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      });

      if (resp.status !== 200 || !resp.data || !resp.data.access_token) {
        logger.warn(`Refresh token request failed ${resp.status} ${JSON.stringify(resp.data)}`);
        return null;
      }

      return {
        accessToken: resp.data.access_token,
        refreshToken: resp.data.refresh_token || refreshToken
      };
    } catch (err: any) {
      logger.error(`Error refreshing access token: ${err.message || err}`);
      return null;
    }
  }

  /**
   * Exchange a Jira SSO authorization code for tokens and optionally persist them.
   * - ssoCode: SSO code received from Jira front-end flow
   * - userId (optional): if provided, tokens will be saved to the DB for that user
   * Returns token details on success, or null on failure.
   */
  async exchangeSSOCode(ssoCode: string, userId?: number): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
    if (!ssoCode) return null;

    if (!this.clientId || !this.clientSecret) {
      logger.error('Missing Jira OAuth client credentials');
      return null;
    }

    try {
      const resp = await HttpClient.post('auth.atlassian.com', '/oauth/token', {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: ssoCode,
        redirect_uri: config.jiraRedirectUri
      });

      if (resp.status !== 200 || !resp.data || !resp.data.access_token) {
        logger.warn(`SSO token exchange failed ${resp.status} ${JSON.stringify(resp.data)}`);
        return null;
      }

      const accessToken = resp.data.access_token;
      const refreshToken = resp.data.refresh_token || null;
      const expiresIn = resp.data.expires_in;

      // Persist tokens if a userId was provided (best-effort)
      if (userId) {
        try {
          await expressDb.saveTokens(userId, 'JIRA', accessToken, refreshToken, null, ssoCode);
        } catch (saveErr: any) {
          logger.warn(`Failed to persist SSO tokens for user ${userId}: ${saveErr.message || saveErr}`);
          // do not treat persistence failure as fatal for the exchange
        }
      }

      return { accessToken, refreshToken: refreshToken || undefined, expiresIn };
    } catch (err: any) {
      logger.error(`Error exchanging SSO code: ${err.message || err}`);
      return null;
    }
  }

  /**
   * Validate and return a usable Jira access token for the given user.
   * - reads tokens from DB
   * - calls Jira `/myself` to validate the access token
   * - if expired/invalid, attempts a refresh and persists new tokens
   * Returns the valid access token or `null` when no valid token can be obtained.
   */
  async getAccessToken(userId: number): Promise<string | null> {
    try {
      const tokenData = await expressDb.getTokens('JIRA', userId);
      if (!tokenData || !tokenData.accessToken) return null;

      let accessToken = tokenData.accessToken;
      const refreshToken = tokenData.refreshToken;

      const pathPrefix = await this.ensurePathPrefix();
      if (!pathPrefix) {
        logger.error(`Unable to determine Jira pathPrefix for instance: ${this.instanceName}`);
        return null;
      }

      const doMyself = async (token: string) => HttpClient.get(this.hostname, pathPrefix + '/rest/api/3/myself', token);

      // try stored access token first
      try {
        const r = await doMyself(accessToken);
        if (r.status === 200) return accessToken;

        if (r.status === 401) {
          logger.info('Stored access token invalid/expired');
          // fall through to refresh if possible
        } else if (r.status === 403) {
          logger.warn('Jira returned 403 (insufficient permissions)');
          return null;
        } else {
          logger.warn(`Unexpected status from Jira: ${r.status}`);
          return null;
        }
      } catch (err: any) {
        logger.warn(`Initial Jira "myself" call failed: ${err.message || err}`);
        // fall through to refresh if possible
      }

      // refresh flow (if available)
      if (!refreshToken) {
        logger.info('No refresh token available');
        return null;
      }

      const refreshed = await this.refreshAccessToken(refreshToken);
      if (!refreshed) return null;

      // best-effort persist refreshed tokens
      try {
        await expressDb.saveTokens(userId, 'JIRA', refreshed.accessToken, refreshed.refreshToken || refreshToken, null, null);
      } catch (saveErr: any) {
        logger.warn(`Failed to persist refreshed tokens: ${saveErr.message || saveErr}`);
      }

      // validate refreshed token
      try {
        const retry = await doMyself(refreshed.accessToken);
        if (retry.status === 200) return refreshed.accessToken;
        logger.warn(`Jira rejected refreshed token: ${retry.status}`);
        return null;
      } catch (e: any) {
        logger.error(`Error calling Jira after refresh: ${e.message || e}`);
        return null;
      }
    } catch (err: any) {
      logger.error(`Unexpected error in getAccessToken: ${err.message || err}`);
      return null;
    }
  }

  async getRequiredScopes(userId: number, requiredScopes: string[]): Promise<string[] | null> {
    const accessToken = await this.getAccessToken(userId);
    if (!accessToken) return null;

    // parse the token for scopes (note: Jira scopes are space-delimited in the token response)
    const tokenScopes = new Set<string>();

    try {
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
      if (payload.scope) {
        payload.scope.split(' ').forEach((s: string) => tokenScopes.add(s));
      }
    } catch (err: any) {
      logger.warn(`Failed to parse access token for scopes: ${err.message || err}`);
      return null;
    }

    const missing = requiredScopes.filter(scope => !tokenScopes.has(scope));
    
    if (missing.length > 0) {
      logger.info(`User ${userId} missing required scopes: ${missing.join(', ')}`);
      // merge missing scopes with token scopes to return what the user need to have
      const allScopes = new Set([...tokenScopes, ...missing]);
      return Array.from(allScopes);
    }

    return []; // Return empty array if all scopes are present
  }

  async checkWorklogAccess(userId: number): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId);
    if (!accessToken) return false;
    const pathPrefix = await this.ensurePathPrefix();
    if (!pathPrefix) return false;

    try {
      const resp = await HttpClient.get(this.hostname, pathPrefix + '/rest/api/3/myself/worklogs', accessToken);
      return resp.status === 200 || resp.status === 204;
    } catch (e: any) {
      logger.warn(`Worklog check failed (denied): ${e.message || e}`);
      return false;
    }
  }
}

