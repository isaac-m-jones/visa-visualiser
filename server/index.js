import cors from "cors";
import express from "express";
import { getVisaRequirement, listCountries } from "./lib/visaService.js";

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || "127.0.0.1";

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/countries", (_request, response) => {
  response.json({ countries: listCountries() });
});

app.get("/api/visa", (request, response) => {
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
});

app.listen(port, host, () => {
  console.log(`Visa API listening on http://${host}:${port}`);
});
