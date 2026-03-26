import worldCountries from "world-countries";
import {
  sampleCountryMetadata,
  simplifiedRouteMatrix
} from "../data/visaData.js";

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

function buildRouteMeta(matchType, origin, destination, confidence) {
  return {
    matchType,
    confidence,
    originRegion: origin.region,
    destinationRegion: destination.region,
    originPassportStrength: origin.passportStrength,
    destinationPassportStrength: destination.passportStrength,
    datasetUpdatedAt: DATASET_UPDATED_AT
  };
}

function deriveLegacyStatus(routeRecord) {
  if (routeRecord.tourism.allowed === "yes") {
    if (routeRecord.tourism.note?.toLowerCase().includes("visa on arrival")) {
      return "Visa on arrival";
    }

    if (routeRecord.tourism.note?.toLowerCase().includes("evisa")) {
      return "eVisa";
    }

    return "Visa-free";
  }

  if (routeRecord.tourism.allowed === "no") {
    return "Visa required";
  }

  return "Unknown";
}

function buildRequirement(routeRecord, origin, destination, matchType) {
  const derivedStatus = deriveLegacyStatus(routeRecord);

  return {
    status: derivedStatus,
    duration:
      routeRecord.tourism.maxStayDays != null
        ? `${routeRecord.tourism.maxStayDays} days`
        : routeRecord.tourism.allowed === "yes"
          ? "Varies"
          : "Unknown",
    conditions:
      routeRecord.tourism.note ||
      "This simplified dataset only tracks whether a short tourism path exists.",
    officialSource: routeRecord.sourceUrl,
    lastUpdated: routeRecord.lastChecked,
    simplified: {
      tourism: routeRecord.tourism,
      study: routeRecord.study,
      work: routeRecord.work,
      sourceUrl: routeRecord.sourceUrl,
      confidence: routeRecord.confidence,
      lastChecked: routeRecord.lastChecked
    },
    routeMeta: buildRouteMeta(
      matchType,
      origin,
      destination,
      routeRecord.confidence
    )
  };
}

function buildFallbackRouteRecord(previewStatus) {
  if (previewStatus === "Visa-free") {
    return {
      tourism: {
        allowed: "yes",
        maxStayDays: 90,
        note: "Tourism appears to be available without a standard pre-approved visa in this starter dataset."
      },
      study: { pathExists: "unknown" },
      work: { pathExists: "unknown" },
      sourceUrl: "https://www.iata.org/en/services/compliance/timatic/",
      confidence: "medium",
      lastChecked: DATASET_UPDATED_AT
    };
  }

  if (previewStatus === "Visa on arrival" || previewStatus === "eVisa") {
    return {
      tourism: {
        allowed: "yes",
        maxStayDays: 30,
        note: "Tourism appears possible via a simplified arrival or online process in this starter dataset."
      },
      study: { pathExists: "unknown" },
      work: { pathExists: "unknown" },
      sourceUrl: "https://www.iata.org/en/services/compliance/timatic/",
      confidence: "medium",
      lastChecked: DATASET_UPDATED_AT
    };
  }

  return {
    tourism: {
      allowed: "unknown",
      maxStayDays: null,
      note: "This starter dataset does not yet have a verified tourism answer for this route."
    },
    study: { pathExists: "unknown" },
    work: { pathExists: "unknown" },
    sourceUrl: "https://www.iata.org/en/services/compliance/timatic/",
    confidence: "low",
    lastChecked: DATASET_UPDATED_AT
  };
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
    const selfRecord = {
      tourism: {
        allowed: "yes",
        maxStayDays: null,
        note: "Domestic travel does not require a visa."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.iata.org/",
      confidence: "high",
      lastChecked: DATASET_UPDATED_AT
    };

    return {
      origin,
      destination,
      requirement: buildRequirement(selfRecord, origin, destination, "self")
    };
  }

  const exactMatch = simplifiedRouteMatrix[originCode]?.[destinationCode];
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
        buildFallbackRouteRecord(previewMatch.status),
        origin,
        destination,
        "preview"
      )
    };
  }

  return {
    origin,
    destination,
    requirement: buildRequirement(
      buildFallbackRouteRecord("unknown"),
      origin,
      destination,
      "fallback"
    )
  };
}
