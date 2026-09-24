import express, { Express } from 'express';
import path from 'path';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getLogger } from './utils/logger';
import apiRouter from './api/routes';
import config from './utils/config';
const logger = getLogger('ExpressServer');

const app: Express = express();

// Enable Gzip compression
app.use(compression({ level: 5, threshold: 1000 }));

// Parse JSON bodies for API routes
app.use(express.json());

// API routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'Server is running', env: config.nodeEnv });
});

app.use('/api', apiRouter);

// Proxy /gateway/ to backend service
app.use(
  '/gateway',
  createProxyMiddleware({
    target: 'http://host.docker.internal:9091',
    changeOrigin: true,
    pathRewrite: {
      '^/gateway': '' // remove /gateway prefix
    }
  })
);

const distPath = path.join(__dirname, '../dist');

// Define caching rules for static files
interface StaticOptions {
  setHeaders: (res: any, filePath: string) => void;
}

const staticOptions: StaticOptions = {
  setHeaders: (res: any, filePath: string) => {
    // Fingerprinted (hashed) and long lived files
    if (filePath.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.removeHeader('ETag');
      res.removeHeader('Last-Modified');
    }

    // Config files and environment settings
    if (filePath.match(/\.json$/) || filePath.endsWith('assets/env.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
};

// Production: Serve static files from /dist
if (config.isProduction) {
  app.use(express.static(distPath, staticOptions));

  // Express 5 catch-all for SPA: Use a RegExp to bypass string parser limitations
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});
