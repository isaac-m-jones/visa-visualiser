# Visa Visualiser

An interactive full-stack web application for exploring visa requirements between countries.

## Features

- Interactive world map with click-to-select origin and destination countries
- Synced origin and destination dropdowns
- Visa requirement panel with status, duration, conditions, and official link
- Passport strength preview that colors the map by visa accessibility
- Express API with a modular, extendable visa dataset
- Recent route history stored locally in the browser

## Tech Stack

- React + Vite
- `react-simple-maps`
- Node.js + Express

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Provision the database manually:

   ```bash
   npm run db:provision:starter
   ```

   This writes a repeatable snapshot file and imports it into SQLite once. The app no
   longer seeds data automatically on startup.

3. Start the frontend and backend together:

   ```bash
   npm run dev
   ```

4. Open the app at [http://localhost:5173](http://localhost:5173)

The API runs on `http://localhost:3001` and exposes:

- `GET /api/health`
- `GET /api/countries`
- `GET /api/visa?origin=NZL&destination=JPN`

## Data model

The runtime app reads from SQLite only. Provisioning is now a separate workflow:

- Build a snapshot file: `npm run db:build:starter`
- Fetch a current bulk web dataset into a snapshot: `npm run db:fetch:passport-index`
- Import a snapshot file: `npm run db:import -- --file /path/to/dataset.json`
- Fetch and import the current bulk web dataset in one step: `npm run db:sync:passport-index`
- Inspect readiness: `npm run db:status`

The included starter snapshot builder still uses [server/data/visaData.js](/Users/isaacjones/Downloads/codex-projects/visa-visualiser/server/data/visaData.js:1) plus `world-countries`, but only when you run the provisioning command manually. Later we can gather web-sourced data into the same snapshot format and import it with the same mechanism.

The current web-source adapter targets the public [imorte/passport-index-data](https://github.com/imorte/passport-index-data) repository, which states that it mirrors `passportindex.org` and was last updated on February 17, 2026 when I inspected it.

## Notes

- The included dataset is now an optional starter source, not an automatic seed.
- The map geometry is loaded from the local [public/countries.geo.json](/Users/isaacjones/Downloads/codex-projects/visa-visualiser/public/countries.geo.json:1).
