# Shelf Nudge

Shelf Nudge is a full-stack retail pricing and promotions intelligence dashboard. It uses a React SPA frontend and a lightweight Node.js + Express backend that parses the provided `Sample_Data.csv` into memory.

## Tech Stack

- Frontend: React + Vite + JavaScript
- Styling: plain CSS
- Charts: Recharts
- Backend: Node.js + Express + JavaScript
- Data source: local CSV file parsed in memory
- Database: none

## Project Structure

```text
client/
  src/
server/
  data/Sample_Data.csv
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

## API Endpoints

The Express server runs on port `4000`.

- `GET /api/products` returns product rows from the latest CSV snapshot.
- `GET /api/products?retailer=Sainsburys&category=Black%20Tea&promotionOnly=true&search=pg` filters products by retailer, category, promotion status, and search text.
- `GET /api/summary` returns KPI values including product count, retailer count, promotion rate, average prices, and discount metrics.
- `GET /api/trends` groups the full CSV history by date and returns average base, shelf, and promoted prices over time.
- `GET /api/promotions` returns promotion counts grouped by retailer and category.
- `GET /api/health` returns a basic server and CSV-load status.

## Technical Decisions

JavaScript was chosen because the task specifies JavaScript rather than TypeScript, and it keeps the code easy to review in an interview setting.

CSV parsing was used instead of a database because the supplied dataset is local, fixed-size, and suitable for in-memory analytics. This keeps the architecture simple and avoids unnecessary PostgreSQL or persistence setup.

Recharts was chosen because it integrates cleanly with React, provides accessible chart primitives, and is fast to use for line, bar, and pie charts without adding a complex visualisation layer.

The backend loads `server/data/Sample_Data.csv` at startup, converts price fields to numbers, converts promotion values to booleans, and exposes small analytics endpoints. The frontend fetches those endpoints and handles filtering, sorting, and responsive dashboard rendering.

## Limitations

- The CSV is loaded only at server startup.
- Product rows are served from the latest snapshot rather than paginated historical data.
- There is no authentication or role-based access.
- There is no automated test suite yet.
- The app is optimised for the supplied CSV shape.

## Future Improvements

- PostgreSQL/database persistence
- Pagination
- Testing
- Caching
- Scheduled data ingestion
- Advanced filtering
- Retailer drilldowns
- Deployment pipeline
- Responsive mobile optimisation
