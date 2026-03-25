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

2. Start the frontend and backend together:

   ```bash
   npm run dev
   ```

3. Open the app at [http://localhost:5173](http://localhost:5173)

The API runs on `http://localhost:3001` and exposes:

- `GET /api/health`
- `GET /api/countries`
- `GET /api/visa?origin=NZL&destination=JPN`

## Data model

The visa layer lives in [server/data/visaData.js](/Users/isaacjones/Downloads/visa-visualiser/server/data/visaData.js). It includes:

- `sampleCountryMetadata`: richer sample metadata for passport-strength previews
- `visaMatrix`: route-specific visa information

The full country list comes from the `world-countries` package, and the sample metadata is merged onto it in [server/lib/visaService.js](/Users/isaacjones/Downloads/visa-visualiser/server/lib/visaService.js). You can extend the app by adding richer preview metadata and more bilateral entries to `visaMatrix`.

## Notes

- The included dataset is an example starter dataset, designed to be easy to swap out.
- The map geometry is loaded from the DataHub `geo-countries` GeoJSON endpoint at runtime.
