import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { filterProducts, getPromotions, getSummary, getTrends } from './analytics.js';
import { hasDatabaseUrl } from './db.js';
import { metadata } from './dataStore.js';
import {
  filterPostgresProducts,
  getPostgresMetadata,
  getPostgresPromotions,
  getPostgresSummary,
  getPostgresTrends,
} from './postgresAnalytics.js';

const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

export const app = express();

app.use(cors());

const csvMetadata = {
  source: 'csv',
  productCount: metadata.loadedRows,
  ...metadata,
};

const getMetadata = async () => (hasDatabaseUrl() ? getPostgresMetadata() : csvMetadata);

const handleAsync = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const sendApiIndex = (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Shelf Nudge API</title>
        <style>
          body {
            margin: 0;
            padding: 48px;
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #111;
            background: #F5F7FF;
          }
          main {
            max-width: 720px;
            padding: 32px;
            background: #fff;
            border: 1px solid #E5E9F8;
            border-radius: 18px;
            box-shadow: 0 18px 50px rgba(52, 69, 164, 0.12);
          }
          h1 {
            margin: 0 0 8px;
            color: #3445A4;
          }
          p {
            line-height: 1.6;
          }
          a {
            color: #3445A4;
            font-weight: 700;
          }
          code {
            padding: 2px 6px;
            border-radius: 6px;
            background: #EEF1FF;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Shelf Nudge API</h1>
          <p>The backend is running correctly on <code>localhost:${PORT}</code>.</p>
          <p>Open the React dashboard at <a href="http://localhost:5173">http://localhost:5173</a>.</p>
          <p>Useful API checks:</p>
          <ul>
            <li><a href="/api/health">/api/health</a></li>
            <li><a href="/api/summary">/api/summary</a></li>
            <li><a href="/api/products">/api/products</a></li>
          </ul>
        </main>
      </body>
    </html>
  `);
};

app.get('/api', sendApiIndex);

app.get('/api/health', handleAsync(async (req, res) => {
  const currentMetadata = await getMetadata();
  res.json({ ok: true, ...currentMetadata });
}));

app.get('/api/products', handleAsync(async (req, res) => {
  const [data, currentMetadata] = await Promise.all([
    hasDatabaseUrl() ? filterPostgresProducts(req.query) : filterProducts(req.query),
    getMetadata(),
  ]);

  res.json({
    data,
    metadata: currentMetadata,
  });
}));

app.get('/api/summary', handleAsync(async (req, res) => {
  const [data, currentMetadata] = await Promise.all([
    hasDatabaseUrl() ? getPostgresSummary() : getSummary(),
    getMetadata(),
  ]);

  res.json({
    data,
    metadata: currentMetadata,
  });
}));

app.get('/api/trends', handleAsync(async (req, res) => {
  const [data, currentMetadata] = await Promise.all([
    hasDatabaseUrl() ? getPostgresTrends() : getTrends(),
    getMetadata(),
  ]);

  res.json({
    data,
    metadata: currentMetadata,
  });
}));

app.get('/api/promotions', handleAsync(async (req, res) => {
  const [data, currentMetadata] = await Promise.all([
    hasDatabaseUrl() ? getPostgresPromotions() : getPromotions(),
    getMetadata(),
  ]);

  res.json({
    data,
    metadata: currentMetadata,
  });
}));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  if (fs.existsSync(clientIndexPath)) {
    res.sendFile(clientIndexPath);
    return;
  }

  sendApiIndex(req, res);
});

app.use((error, req, res, next) => {
  if (!req.path.startsWith('/api')) {
    next(error);
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

export const startServer = (port = PORT) => {
  const server = app.listen(port, () => {
    console.log(`Shelf Nudge API running on http://localhost:${port}`);
    if (hasDatabaseUrl()) {
      console.log('Using PostgreSQL data source.');
      return;
    }

    console.log(`Loaded ${metadata.loadedRows} CSV rows. Latest snapshot: ${metadata.latestDate}`);
  });

  server.on('error', async (error) => {
    if (error.code !== 'EADDRINUSE') {
      console.error(error);
      process.exit(1);
    }

    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      const health = await response.json();

      if (health.ok && health.loadedRows) {
        console.log(`Shelf Nudge API is already running on http://localhost:${port}`);
        console.log('Reusing the existing backend process for this npm start session.');
        setInterval(() => {}, 60 * 60 * 1000);
        return;
      }
    } catch {
      // Fall through to the clearer error below.
    }

    console.error(`Port ${port} is already in use by another process.`);
    console.error(`Stop that process or start this server with a different PORT value.`);
    process.exit(1);
  });

  return server;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
