import express, { Router, Request, Response } from 'express';
import JiraClient from '../utils/jira-client';
import { loadFeaturesMap } from '../utils/functions';
import logger from '../utils/logger';

const router: Router = express.Router();

interface FeaturesScopeRequest {
  instanceName: string;
  userId: number;
  features: string[]; // array of feature-flag names to check
}

interface SSOCodeRequest {
  SSOCode: string;
  userId?: number; // optional - if provided, server will persist tokens for this user
  instanceName?: string; // optional - used to construct JiraClient (not required for token exchange)
}

/**
 * POST /api/jira/login-sso
 * Exchanges Jira SSO code for tokens using JiraClient. If `userId` is provided
 * the resulting tokens will be saved to the DB for that user (best-effort).
 * Body: { SSOCode: string, userId?: number, instanceName?: string }
 */
router.post('/jira/login-sso', async (req: Request, res: Response) => {
  try {
    const { SSOCode, userId, instanceName } = req.body as SSOCodeRequest;

    if (!SSOCode) {
      return res.status(400).json({ success: false, error: 'SSO code is required' });
    }

    const jira = new JiraClient(instanceName || '');
    const exchanged = await jira.exchangeSSOCode(SSOCode, userId);

    if (!exchanged) {
      logger.error('[SSO] Failed to exchange SSO code via JiraClient');
      return res.status(500).json({ success: false, error: 'Failed to exchange code with Jira' });
    }

    res.json({
      success: true,
      token: exchanged.accessToken,
      refreshToken: exchanged.refreshToken,
      expiresIn: exchanged.expiresIn,
      saved: typeof userId === 'number',
      message: 'SSO login successful'
    });
  } catch (error: any) {
    logger.error(`[SSO] Unexpected error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error during SSO login' });
  }
});

/**
 * POST /api/jira/token-scopes
 * Checks which Jira scopes are required for one or more features.
 * Body: { instanceName: string, userId: number, features: string[] }
 * Returns: { success: boolean, hasPermissions: boolean, requiredScopes?: string[] | null, features?: Array, error?: string }
 */
router.post('/jira/token-scopes', async (req: Request, res: Response) => {
  try {
    const { instanceName, userId, features } = req.body as FeaturesScopeRequest;

    // Validate inputs
    if (!instanceName || !userId || !Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: instanceName, userId, features (non-empty array)'
      });
    }

    // Load the feature flags map
    const featuresMap = loadFeaturesMap();
    if (!featuresMap) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load feature flags configuration'
      });
    }

    // Resolve each requested feature and collect their jiraScopes
    const resolvedFeatures = features.map(name => {
      const feature = featuresMap.features.find(f => f.name === name);
      return feature ? { name, found: true, jiraScopes: feature.jiraScopes || [] } : { name, found: false, jiraScopes: null };
    });

    // Aggregate unique required scopes across all requested features
    const combinedScopes = Array.from(
      resolvedFeatures.reduce((acc, f) => {
        if (f.found && Array.isArray(f.jiraScopes)) f.jiraScopes.forEach((s: string) => acc.add(s));
        return acc;
      }, new Set<string>())
    );

    // Ask JiraClient which scopes are missing / required for the user (preserves existing semantics)
    const jira = new JiraClient(instanceName);
    const requiredScopes = await jira.getRequiredScopes(userId, combinedScopes);
    const hasPermissions = requiredScopes !== null && requiredScopes.length === 0;

    res.json({
      success: true,
      hasPermissions,
      features: resolvedFeatures.map(f => f.name), // return original feature names for compatibility with old response shape
      requiredScopes,
      instanceName,
      userId
    });

  } catch (error: any) {
    logger.error(`[permissions] Unexpected error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error during permissions check'
    });
  }
});

/**
 * POST /api/jira/app-scopes
 * Accepts body: { features: string[] } — treat passed-in features as enabled.
 * Returns unique Jira scopes required by the provided features.
 */
router.post('/jira/app-scopes', async (req: Request, res: Response) => {
  try {
    const featuresMap = loadFeaturesMap();
    if (!featuresMap) {
      return res.status(500).json({ success: false, error: 'Failed to load feature flags configuration' });
    }

    // Validate request body: `features` must be a non-empty array of strings
    const { features } = req.body as { features?: unknown };
    if (!Array.isArray(features) || features.length === 0 || !features.every(f => typeof f === 'string' && f.trim() !== '')) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid body: `features` must be a non-empty array of strings'
      });
    }

    // Treat passed-in features as enabled (no Unleash check)
    const enabledFeatureNames = (features as string[]).map(s => s.trim()).filter(Boolean);
    const enabledSet = new Set(enabledFeatureNames);

    // Match provided feature names against known features in featuresMap
    const filteredFeaturesMap = featuresMap.features.filter(f => enabledSet.has(f.name));

    // collect unique jira scopes from the filtered flags
    const combined = filteredFeaturesMap.reduce((acc, f) => {
      if (Array.isArray(f.jiraScopes)) f.jiraScopes.forEach((s: string) => acc.add(s));
      return acc;
    }, new Set<string>());

    // Always include these initial scopes first
    const initialScopes = ['read:me', 'read:jira-user', 'offline_access'];
    initialScopes.forEach(s => combined.delete(s)); // avoid duplicates

    const rest = Array.from(combined);
    const scopes = [...initialScopes, ...rest];

    // Return filtered (known) feature names for compatibility with the old response shape
    const responseFeatures = filteredFeaturesMap.map(f => f.name);

    res.json({ success: true, features: responseFeatures, scopes });
  } catch (error: any) {
    logger.error(`[permissions] Unexpected error in app-scopes: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error during app-scopes' });
  }
});

export default router; 
