import cors from "cors";
import express from "express";
import {
  DatabaseNotReadyError,
  getDatabaseStatus
} from "./lib/database.js";
import { getVisaRequirement, listCountries } from "./lib/visaService.js";

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || "127.0.0.1";

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  const database = getDatabaseStatus();

  response.status(database.ready ? 200 : 503).json({
    ok: database.ready,
    database
  });
});

app.get("/api/countries", (_request, response) => {
  try {
    response.json({ countries: listCountries() });
  } catch (error) {
    if (error instanceof DatabaseNotReadyError) {
      response.status(503).json({
        error: error.message,
        database: getDatabaseStatus()
      });
      return;
    }

    throw error;
  }
});

app.get("/api/visa", (request, response) => {
  try {
    const { origin, destination } = request.query;

    if (!origin || !destination) {
      response.status(400).json({
        error: "Both origin and destination are required."
      });
      return;
    }

    const result = getVisaRequirement(String(origin), String(destination));
    if (!result) {
      response.status(404).json({
        error: "Unknown country code."
      });
      return;
    }

    response.json(result);
  } catch (error) {
    if (error instanceof DatabaseNotReadyError) {
      response.status(503).json({
        error: error.message,
        database: getDatabaseStatus()
      });
      return;
    }

    throw error;
  }
});

app.listen(port, host, () => {
  console.log(`Visa API listening on http://${host}:${port}`);
});
