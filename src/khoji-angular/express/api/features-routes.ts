/**
 * Feature Flag Registry API.
 *
 * Read-only access to the feature flag registry (features-map.json). The
 * admin-side create/toggle/sync operations moved to the `unleash-init` seeding
 * container (see src/unleash-init) so that no long-running application service
 * holds Unleash admin credentials.
 */
import express, { Router, Request, Response } from 'express';
import { loadFeaturesMap } from '../utils/functions';
import { getLogger } from '../utils/logger';
const logger = getLogger('features-routes');

const router: Router = express.Router();

/**
 * GET /api/features/map
 * Returns the full flag registry from features-map.json.
 */
router.get('/features/map', (_req: Request, res: Response) => {
  const featuresMap = loadFeaturesMap();

  if (!featuresMap) {
    return res.status(500).json({
      success: false,
      error: 'Failed to load features-map.json configuration.'
    });
  }

  res.json(featuresMap);
});

export default router;