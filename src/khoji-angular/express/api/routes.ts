/**
 * Express router for all API endpoints.
 */
import express, { Router } from 'express';
import featuresRoutes from './features-routes';
import jiraRoutes from './jira-routes';

const router: Router = express.Router();
router.use(featuresRoutes);
router.use(jiraRoutes);

export default router;
