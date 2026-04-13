import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worldCountries from "world-countries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PASSPORT_INDEX_JSON_URL =
  "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index.json";
export const PASSPORT_INDEX_README_URL =
  "https://raw.githubusercontent.com/imorte/passport-index-data/main/README.md";
export const PASSPORT_INDEX_SNAPSHOT_PATH = path.resolve(
  __dirname,
  "../data/snapshots/passport-index-latest.generated.json"
);

function normalizeCurrencies(currencies = {}) {
  return Object.entries(currencies).map(([code, value]) => ({
    code,
    name: value.name,
    symbol: value.symbol || ""
  }));
}

function normalizeLanguages(languages = {}) {
  return Object.entries(languages).map(([code, name]) => ({
    code,
    name
  }));
}

function extractDatasetUpdatedAt(readme) {
  const match = readme.match(
    /Last updated:\s*\**\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})\s*\**/i
  );

  return match?.[1] || new Date().toISOString().slice(0, 10);
}

function mapRequirementCode(status) {
  switch ((status || "").toLowerCase()) {
    case "visa free":
      return "Visa-free";
    case "visa on arrival":
      return "Visa on arrival";
    case "eta":
      return "ETA";
    case "e-visa":
      return "eVisa";
    case "visa required":
      return "Visa required";
    case "no admission":
      return "No admission";
    default:
      return "Unknown";
  }
}

function mapAllowedValue(requirementCode) {
  if (
    requirementCode === "Visa-free" ||
    requirementCode === "Visa on arrival" ||
    requirementCode === "ETA" ||
    requirementCode === "eVisa" ||
    requirementCode === "Visa required"
  ) {
    return "yes";
  }

  if (requirementCode === "No admission") {
    return "no";
  }

  return "unknown";
}

function buildTourismNote(requirementCode, days) {
  const stayFragment =
    typeof days === "number" && Number.isFinite(days)
      ? ` for up to ${days} days`
      : "";

  if (requirementCode === "Visa-free") {
    return `Tourism appears visa-free${stayFragment}.`;
  }

  if (requirementCode === "Visa on arrival") {
    return `Tourism appears available via visa on arrival${stayFragment}.`;
  }

  if (requirementCode === "ETA") {
    return `Tourism appears available with an electronic travel authorisation${stayFragment}.`;
  }

  if (requirementCode === "eVisa") {
    return `Tourism appears available with an eVisa${stayFragment}.`;
  }

  if (requirementCode === "Visa required") {
    return "Tourism appears possible, but a visa is required before travel.";
  }

  if (requirementCode === "No admission") {
    return "The source dataset indicates that entry is not currently permitted.";
  }

  return "The source dataset does not provide a clear tourism requirement for this route.";
}

function buildPassportStrengthLabel(summary) {
  const mobilityScore =
    summary.visaFree +
    summary.visaOnArrival +
    summary.eta +
    summary.eVisa;

  return String(mobilityScore);
}

export async function fetchPassportIndexDataset({
  jsonUrl = PASSPORT_INDEX_JSON_URL,
  readmeUrl = PASSPORT_INDEX_README_URL
} = {}) {
  const [jsonResponse, readmeResponse] = await Promise.all([
    fetch(jsonUrl),
    fetch(readmeUrl)
  ]);

  if (!jsonResponse.ok) {
    throw new Error(`Unable to fetch passport index JSON: ${jsonResponse.status}`);
  }

  if (!readmeResponse.ok) {
    throw new Error(`Unable to fetch passport index README: ${readmeResponse.status}`);
  }

  const [rawData, readme] = await Promise.all([
    jsonResponse.json(),
    readmeResponse.text()
  ]);

  return {
    rawData,
    datasetUpdatedAt: extractDatasetUpdatedAt(readme),
    fetchedAt: new Date().toISOString(),
    sourceUrl: "https://github.com/imorte/passport-index-data"
  };
}

export function buildPassportIndexSnapshot(source) {
  const countriesByIso2 = new Map(
    worldCountries.map((country) => [country.cca2.toLowerCase(), country])
  );
  const previewMap = new Map();
  const passportPreviews = [];
  const visaRequirements = [];

  for (const [originIso2, destinations] of Object.entries(source.rawData)) {
    const originCountry = countriesByIso2.get(originIso2.toLowerCase());

    if (!originCountry || !destinations || typeof destinations !== "object") {
      continue;
    }

    const originCode = originCountry.cca3;

    for (const [destinationIso2, requirement] of Object.entries(destinations)) {
      const destinationCountry = countriesByIso2.get(destinationIso2.toLowerCase());

      if (!destinationCountry || !requirement || typeof requirement !== "object") {
        continue;
      }

      const destinationCode = destinationCountry.cca3;
      const requirementCode = mapRequirementCode(requirement.status);

      if (originCode === destinationCode || requirementCode === "Unknown") {
        continue;
      }

      const maxStayDays =
        typeof requirement.days === "number" && Number.isFinite(requirement.days)
          ? requirement.days
          : null;

      passportPreviews.push({
        originCode,
        destinationCode,
        status: requirementCode
      });

      visaRequirements.push({
        originCode,
        destinationCode,
        tourism: {
          allowed: mapAllowedValue(requirementCode),
          requirementCode,
          maxStayDays,
          note: buildTourismNote(requirementCode, maxStayDays)
        },
        study: {
          pathExists: "unknown"
        },
        work: {
          pathExists: "unknown"
        },
        sourceUrl: "https://www.passportindex.org",
        confidence: "medium",
        lastChecked: source.datasetUpdatedAt
      });

      if (!previewMap.has(originCode)) {
        previewMap.set(originCode, {
          visaFree: 0,
          visaOnArrival: 0,
          eta: 0,
          eVisa: 0,
          visaRequired: 0,
          noAdmission: 0
        });
      }

      const summary = previewMap.get(originCode);

      if (requirementCode === "Visa-free") {
        summary.visaFree += 1;
      } else if (requirementCode === "Visa on arrival") {
        summary.visaOnArrival += 1;
      } else if (requirementCode === "ETA") {
        summary.eta += 1;
      } else if (requirementCode === "eVisa") {
        summary.eVisa += 1;
      } else if (requirementCode === "No admission") {
        summary.noAdmission += 1;
      } else {
        summary.visaRequired += 1;
      }
    }
  }

  const countries = worldCountries.map((country) => ({
    code: country.cca3,
    name: country.name.common,
    officialName: country.name.official,
    flag: country.flag || "",
    region: country.region || "Unknown region",
    subregion: country.subregion || "",
    capital: country.capital?.[0] || "Not listed",
    population: country.population || 0,
    area: country.area || 0,
    latlng:
      country.latlng?.length >= 2
        ? [country.latlng[0], country.latlng[1]]
        : [null, null],
    landlocked: Boolean(country.landlocked),
    languages: normalizeLanguages(country.languages),
    currencies: normalizeCurrencies(country.currencies),
    passportStrength: buildPassportStrengthLabel(
      previewMap.get(country.cca3) || {
        visaFree: 0,
        visaOnArrival: 0,
        eta: 0,
        eVisa: 0
      }
    ),
    metadataSource: previewMap.has(country.cca3)
      ? "passport-index-data"
      : "world-countries"
  }));

  return {
    version: 1,
    metadata: {
      datasetUpdatedAt: source.datasetUpdatedAt,
      datasetSource: "passport-index-data",
      fetchedAt: source.fetchedAt,
      sourceUrl: source.sourceUrl,
      notes:
        "Generated from the imorte/passport-index-data GitHub mirror of passportindex.org."
    },
    countries,
    passportPreviews,
    visaRequirements
  };
}

export function writeGeneratedPassportIndexSnapshot(snapshot, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2));
}
