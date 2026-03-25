import worldCountries from "world-countries";
import { sampleCountryMetadata, visaMatrix } from "../data/visaData.js";

const metadataByCode = new Map(
  sampleCountryMetadata.map((country) => [country.code, country])
);

const countryCatalog = worldCountries
  .map((country) => {
    const metadata = metadataByCode.get(country.cca3);

    return {
      code: country.cca3,
      name: country.name.common,
      passportStrength: metadata?.passportStrength || "Baseline",
      preview: metadata?.preview || []
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
      requirement: {
        status: "Visa-free",
        duration: "Unlimited",
        conditions: "Domestic travel does not require a visa.",
        officialSource: "https://www.iata.org/",
        lastUpdated: "March 25, 2026"
      }
    };
  }

  const exactMatch = visaMatrix[originCode]?.[destinationCode];
  if (exactMatch) {
    return {
      origin,
      destination,
      requirement: exactMatch
    };
  }

  const previewMatch = origin.preview.find(
    (item) => item.destinationCode === destinationCode
  );

  if (previewMatch) {
    return {
      origin,
      destination,
      requirement: {
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
      }
    };
  }

  return {
    origin,
    destination,
    requirement: {
      status: "Visa required",
      duration: "Varies by visa class",
      conditions:
        "This sample dataset does not include a specific bilateral rule for the selected route yet, so the app falls back to a conservative visa-required result.",
      officialSource: "https://www.iata.org/en/services/compliance/timatic/",
      lastUpdated: "March 25, 2026"
    }
  };
}
