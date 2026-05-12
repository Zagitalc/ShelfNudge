# Shelf Nudge

Shelf Nudge is a full-stack retail pricing and promotions intelligence dashboard. It uses a React SPA frontend and a Node.js + Express backend backed by PostgreSQL.

## Tech Stack

- Frontend: React + Vite + JavaScript
- Styling: plain CSS
- Charts: Recharts
- Backend: Node.js + Express + JavaScript
- Data source: PostgreSQL seeded from `server/data/Sample_Data.csv`
- Database: PostgreSQL via `pg`

## Project Structure

```text
client/
  src/
server/
  data/Sample_Data.csv
  scripts/
  src/
```

## Setup

Install dependencies for both apps:

```bash
npm run install:all
```

Set `DATABASE_URL`, import the CSV into PostgreSQL, then run the full application:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/shelf_nudge
npm run db:import --prefix server
npm start
```

This starts the backend on `http://localhost:4000`. The production build is served by Express. For frontend development, run the Vite dev server separately.

You can also run each app separately. Backend:

```bash
npm run dev --prefix server
```

Frontend:

```bash
npm run dev --prefix client
```

Open the Vite URL, usually `http://localhost:5173`.

Run the automated tests:

```bash
npm test
```

## PostgreSQL Setup

PostgreSQL is required at runtime. Create a PostgreSQL database and set `DATABASE_URL`:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/shelf_nudge
npm run db:import --prefix server
npm start
```

The import script creates a `products` table, adds practical indexes, runs `TRUNCATE products RESTART IDENTITY;`, then imports the CSV with parameterized inserts. Re-running it is safe and repeatable for the supplied dataset. The CSV is seed data only; the API does not parse CSV at runtime.

The table is indexed on common filters and lookups: `snapshot_date`, `retailer`, `category`, `brand`, `ean`, `on_promotion`, plus `(retailer, category, on_promotion)`.

On Render, the preferred setup is Blueprint-managed PostgreSQL from `render.yaml`. If the account cannot create the database from the Blueprint, create a Render PostgreSQL database manually, copy its connection string into the web service as `DATABASE_URL`, then run `npm run db:import --prefix server` from Render Shell, a one-off job, or locally against that connection string.

## API Endpoints

The Express server runs on port `4000`.

- `GET /api/products` returns product rows from the latest snapshot.
- `GET /api/products?retailer=Sainsburys&category=Black%20Tea&promotionOnly=true&search=pg` filters products by retailer, category, promotion status, and search text.
- `GET /api/summary` returns KPI values including product count, retailer count, promotion rate, average prices, and discount metrics.
- `GET /api/trends` groups the full snapshot history by date and returns average base, shelf, and promoted prices over time.
- `GET /api/promotions` returns promotion counts grouped by retailer and category.
- `GET /api/health` returns server status and reports `source: "postgres"`. It does not expose database credentials.

## Exercise Requirements Covered

The supplied exercise brief asks for a backend service, a React-based single page application, useful data visualisation, and a detailed data table. This implementation covers those requirements with:

- A Node.js + Express backend exposing API endpoints for products, summary metrics, pricing trends, promotion groups, and health checks.
- A React + Vite single page dashboard that consumes the backend APIs.
- Recharts visualisations for pricing trends over time, retailer average shelf price comparison, and promoted category distribution.
- A Product Explorer table with search, retailer/category filters, promotion-only filtering, sortable columns, and frontend pagination.
- PostgreSQL-backed runtime data, seeded from the supplied `server/data/Sample_Data.csv` file by `npm run db:import --prefix server`.

## Technical Decisions

JavaScript was chosen to keep the implementation simple, readable, and easy to review in an interview setting.

The supplied CSV is imported into PostgreSQL before runtime. The API queries PostgreSQL rather than parsing the CSV on each request, which gives the backend a more production-like structure with SQL aggregation, indexing, and explicit database configuration.

PostgreSQL queries use parameterized values for filters and `ILIKE` search across title, brand, category, and EAN. Sort columns are whitelisted before being used in `ORDER BY`, because SQL identifiers cannot be parameterized safely.

Recharts was chosen because it integrates cleanly with React, provides accessible chart primitives, and is fast to use for line, bar, and pie charts without adding a complex visualisation layer.

At runtime, the backend queries PostgreSQL for products, summaries, trends, and promotion groups. If `DATABASE_URL` is missing, the API server fails on startup with a clear configuration error.

Frontend state is responsible for user-facing loading, error, and empty states. A successful API response with an empty array, such as a filter combination with no matching products, is treated as a valid empty result and renders guidance to change filters. Request failures, server errors, network errors, and invalid responses render a clear error message instead.

The Product Explorer uses frontend-side pagination to render 50 products per page while preserving the current API contract. The backend still returns all matched products; for larger production datasets, pagination, sorting, and filtering should move server-side.

## Limitations

- PostgreSQL is required to run the API server.
- Product rows are served from the latest snapshot, with frontend-side pagination rather than server-side paging.
- There is no authentication or role-based access.
- Test coverage is focused on SQL query construction, CSV import helpers, API responses, API client helpers, formatting helpers, React async rendering/filtering flows, and frontend empty/error states.
- The app is optimised for the supplied CSV shape.

## Future Improvements

- Server-side pagination, sorting, and filtering
- Caching
- Scheduled data ingestion
- Advanced filtering
- PostgreSQL full-text search
- Retailer drilldowns
- Deployment pipeline
- Responsive mobile optimisation
