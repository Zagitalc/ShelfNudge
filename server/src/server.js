import cors from 'cors';
import express from 'express';
import { filterProducts, getPromotions, getSummary, getTrends } from './analytics.js';
import { metadata } from './dataStore.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

app.get('/', (req, res) => {
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
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ...metadata });
});

app.get('/api/products', (req, res) => {
  res.json({
    data: filterProducts(req.query),
    metadata,
  });
});

app.get('/api/summary', (req, res) => {
  res.json({
    data: getSummary(),
    metadata,
  });
});

app.get('/api/trends', (req, res) => {
  res.json({
    data: getTrends(),
    metadata,
  });
});

app.get('/api/promotions', (req, res) => {
  res.json({
    data: getPromotions(),
    metadata,
  });
});

const server = app.listen(PORT, () => {
  console.log(`Shelf Nudge API running on http://localhost:${PORT}`);
  console.log(`Loaded ${metadata.loadedRows} CSV rows. Latest snapshot: ${metadata.latestDate}`);
});

server.on('error', async (error) => {
  if (error.code !== 'EADDRINUSE') {
    console.error(error);
    process.exit(1);
  }

  try {
    const response = await fetch(`http://localhost:${PORT}/api/health`);
    const health = await response.json();

    if (health.ok && health.loadedRows) {
      console.log(`Shelf Nudge API is already running on http://localhost:${PORT}`);
      console.log('Reusing the existing backend process for this npm start session.');
      setInterval(() => {}, 60 * 60 * 1000);
      return;
    }
  } catch {
    // Fall through to the clearer error below.
  }

  console.error(`Port ${PORT} is already in use by another process.`);
  console.error(`Stop that process or start this server with a different PORT value.`);
  process.exit(1);
});
