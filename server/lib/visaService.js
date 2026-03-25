import worldCountries from "world-countries";
import { sampleCountryMetadata, visaMatrix } from "../data/visaData.js";

const DATASET_UPDATED_AT = "2026-03-25";

const metadataByCode = new Map(
  sampleCountryMetadata.map((country) => [country.code, country])
);

function countPreviewStatuses(preview) {
  return preview.reduce(
    (accumulator, item) => {
      if (item.status === "Visa-free") {
        accumulator.visaFree += 1;
      } else if (item.status === "Visa on arrival") {
        accumulator.visaOnArrival += 1;
      } else if (item.status === "eVisa") {
        accumulator.eVisa += 1;
      } else {
        accumulator.visaRequired += 1;
      }

      return accumulator;
    },
    {
      visaFree: 0,
      visaOnArrival: 0,
      eVisa: 0,
      visaRequired: 0
    }
  );
}

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

function buildRouteMeta(matchType, origin, destination) {
  return {
    matchType,
    confidence:
      matchType === "matrix"
        ? "high"
        : matchType === "preview"
          ? "medium"
          : "low",
    originRegion: origin.region,
    destinationRegion: destination.region,
    originPassportStrength: origin.passportStrength,
    destinationPassportStrength: destination.passportStrength,
    datasetUpdatedAt: DATASET_UPDATED_AT
  };
}

function buildRequirement(requirement, origin, destination, matchType) {
  return {
    ...requirement,
    routeMeta: buildRouteMeta(matchType, origin, destination)
  };
}

function buildFallbackRequirement(origin, destination) {
  return buildRequirement(
    {
      status: "Visa required",
      duration: "Varies by visa class",
      conditions:
        "This sample dataset does not include a specific bilateral rule for the selected route yet, so the app falls back to a conservative visa-required result.",
      officialSource: "https://www.iata.org/en/services/compliance/timatic/",
      lastUpdated: "March 25, 2026"
    },
    origin,
    destination,
    "fallback"
  );
}

const countryCatalog = worldCountries
  .map((country) => {
    const metadata = metadataByCode.get(country.cca3);
    const preview = metadata?.preview || [];
    const mobilitySummary = countPreviewStatuses(preview);

    return {
      code: country.cca3,
      name: country.name.common,
      officialName: country.name.official,
      flag: country.flag,
      region: country.region || "Unknown region",
      subregion: country.subregion || "",
      capital: country.capital?.[0] || "Not listed",
      population: country.population || 0,
      area: country.area || 0,
      latlng: country.latlng || [],
      landlocked: Boolean(country.landlocked),
      currencies: normalizeCurrencies(country.currencies),
      languages: normalizeLanguages(country.languages),
      passportStrength: metadata?.passportStrength || "Baseline",
      preview,
      mobilitySummary,
      metadataSource: metadata ? "sample-matrix" : "world-countries"
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name));

const countryByCode = new Map(countryCatalog.map((country) => [country.code, country]));

export function listCountries() {
  return countryCatalog;
}

export function getCountry(code) {
  return countryByCode.get(code);
}

export function getVisaRequirement(originCode, destinationCode) {
  const origin = getCountry(originCode);
  const destination = getCountry(destinationCode);

  if (!origin || !destination) {
    return null;
  }

  if (originCode === destinationCode) {
    return {
      origin,
      destination,
      requirement: buildRequirement(
        {
          status: "Visa-free",
          duration: "Unlimited",
          conditions: "Domestic travel does not require a visa.",
          officialSource: "https://www.iata.org/",
          lastUpdated: "March 25, 2026"
        },
        origin,
        destination,
        "self"
      )
    };
  }

  const exactMatch = visaMatrix[originCode]?.[destinationCode];
  if (exactMatch) {
    return {
      origin,
      destination,
      requirement: buildRequirement(exactMatch, origin, destination, "matrix")
    };
  }

  const previewMatch = origin.preview.find(
    (item) => item.destinationCode === destinationCode
  );

  if (previewMatch) {
    return {
      origin,
      destination,
      requirement: buildRequirement(
        {
          status: previewMatch.status,
          duration:
            previewMatch.status === "Visa-free"
              ? "90 days"
              : previewMatch.status === "Visa required"
                ? "Varies by visa class"
                : "30 days",
          conditions:
            previewMatch.status === "Visa required"
              ? "A visa application is typically required before travel. Confirm the correct visa class and processing times with the destination authority."
              : "Entry may still depend on passport validity, onward travel, proof of funds, and border officer discretion.",
          officialSource: "https://www.iata.org/en/services/compliance/timatic/",
          lastUpdated: "March 25, 2026"
        },
        origin,
        destination,
        "preview"
      )
    };
  }

  return {
    origin,
    destination,
    requirement: buildFallbackRequirement(origin, destination)
  };
}
