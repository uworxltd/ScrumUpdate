import fs from 'fs';
import path from 'path';
import { getLogger } from './logger';
import config from './config';
const logger = getLogger('functions');

export interface FeaturesMap {
  features: Array<{
    name: string;
    description: string;
    type: string;
    defaultEnabled: boolean;
    consumers: string[];
    jiraScopes?: string[];
  }>;
}

export function loadFeaturesMap(): FeaturesMap | null {
  try {
    // Prefer the explicitly configured path (mounted from src/unleash-init in the
    // container via NG_FEATURES_MAP). For local dev, fall back to the single
    // source of truth in the repo (relative to this source file).
    const mapPath = config.unleashFeaturesMap
      ? config.unleashFeaturesMap
      : path.resolve(__dirname, '../../../unleash-init/features-map.json');
    const mapContent = fs.readFileSync(mapPath, 'utf8');
    return JSON.parse(mapContent);
  } catch (error: any) {
    logger.error(`[loadFeaturesMap] Error loading features-map.json: ${error.message}`);
    return null;
  }
}
