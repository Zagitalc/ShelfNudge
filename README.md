# Shelf Nudge

Shelf Nudge is a full-stack retail pricing and promotions intelligence dashboard. It uses a React SPA frontend and a Node.js + Express backend that can query PostgreSQL in production while keeping a CSV in-memory fallback for simple local demos.

## Tech Stack

- Frontend: React + Vite + JavaScript
- Styling: plain CSS
- Charts: Recharts
- Backend: Node.js + Express + JavaScript
- Data source: PostgreSQL when `DATABASE_URL` is configured; local CSV fallback otherwise
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

Run the full application:

```bash
npm start
```

This starts the backend on `http://localhost:4000` and the Vite frontend on `http://localhost:5173`. If Vite says port `5173` is already in use, use the alternate URL it prints.

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

The app works without PostgreSQL by falling back to `server/data/Sample_Data.csv` in memory. To run the production-style PostgreSQL path, create a PostgreSQL database and set `DATABASE_URL`:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/shelf_nudge
npm run db:import --prefix server
npm start
```

The import script creates a `products` table, adds practical indexes, runs `TRUNCATE products RESTART IDENTITY;`, then imports the CSV with parameterized inserts. Re-running it is safe and repeatable for the supplied dataset.

The table is indexed on common filters and lookups: `snapshot_date`, `retailer`, `category`, `brand`, `ean`, `on_promotion`, plus `(retailer, category, on_promotion)`.

On Render, the preferred setup is Blueprint-managed PostgreSQL from `render.yaml`. If the account cannot create the database from the Blueprint, create a Render PostgreSQL database manually, copy its connection string into the web service as `DATABASE_URL`, then run `npm run db:import --prefix server` from Render Shell, a one-off job, or locally against that connection string.

## API Endpoints

The Express server runs on port `4000`.

- `GET /api/products` returns product rows from the latest snapshot.
- `GET /api/products?retailer=Sainsburys&category=Black%20Tea&promotionOnly=true&search=pg` filters products by retailer, category, promotion status, and search text.
- `GET /api/summary` returns KPI values including product count, retailer count, promotion rate, average prices, and discount metrics.
- `GET /api/trends` groups the full snapshot history by date and returns average base, shelf, and promoted prices over time.
- `GET /api/promotions` returns promotion counts grouped by retailer and category.
- `GET /api/health` returns server status and reports whether the API is using `postgres` or `csv` as its source. It does not expose database credentials.

## Technical Decisions

JavaScript was chosen because the task specifies JavaScript rather than TypeScript, and it keeps the code easy to review in an interview setting.

The first version used CSV parsing because the supplied dataset is local, fixed-size, and suitable for in-memory analytics. PostgreSQL support was then added to demonstrate a more production-like retail analytics structure while keeping the original CSV fallback for local reliability.

PostgreSQL queries use parameterized values for filters and `ILIKE` search across title, brand, category, and EAN. Sort columns are whitelisted before being used in `ORDER BY`, because SQL identifiers cannot be parameterized safely.

Recharts was chosen because it integrates cleanly with React, provides accessible chart primitives, and is fast to use for line, bar, and pie charts without adding a complex visualisation layer.

When `DATABASE_URL` is present, the backend queries PostgreSQL for products, summaries, trends, and promotion groups. When `DATABASE_URL` is missing, it loads `server/data/Sample_Data.csv` at startup, converts price fields to numbers, converts promotion values to booleans, and serves the same API shape from memory.

Frontend state is responsible for user-facing loading, error, and empty states. A successful API response with an empty array, such as a filter combination with no matching products, is treated as a valid empty result and renders guidance to change filters. Request failures, server errors, network errors, and invalid responses render a clear error message instead.

The Product Explorer uses frontend-side pagination to render 50 products per page while preserving the current API contract. The backend still returns all matched products; for larger production datasets, pagination, sorting, and filtering should move server-side.

## Limitations

- CSV fallback mode loads the CSV only at server startup.
- Product rows are served from the latest snapshot, with frontend-side pagination rather than server-side paging.
- There is no authentication or role-based access.
- Test coverage is focused on CSV analytics, SQL query construction, CSV import helpers, API responses, API client helpers, formatting helpers, React async rendering/filtering flows, and frontend empty/error states.
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
