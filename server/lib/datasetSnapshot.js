import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worldCountries from "world-countries";
import { closeDatabase, getDatabase } from "./database.js";
import {
  sampleCountryMetadata,
  simplifiedRouteMatrix
} from "../data/visaData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SNAPSHOT_FORMAT_VERSION = 1;
export const STARTER_SNAPSHOT_PATH = path.resolve(
  __dirname,
  "../data/snapshots/starter-dataset.generated.json"
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

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
}

function validateCountry(country, index) {
  assertString(country.code, `countries[${index}].code`);
  assertString(country.name, `countries[${index}].name`);
  assertString(country.officialName, `countries[${index}].officialName`);
  assertString(country.region, `countries[${index}].region`);
  assertString(country.capital, `countries[${index}].capital`);
  assertString(country.passportStrength, `countries[${index}].passportStrength`);
  assertString(country.metadataSource, `countries[${index}].metadataSource`);
  assertArray(country.languages || [], `countries[${index}].languages`);
  assertArray(country.currencies || [], `countries[${index}].currencies`);

  if (typeof country.flag !== "string") {
    throw new Error(`countries[${index}].flag must be a string.`);
  }

  if (
    country.latlng != null &&
    (!Array.isArray(country.latlng) || country.latlng.length !== 2)
  ) {
    throw new Error(`countries[${index}].latlng must contain [lat, lng].`);
  }
}

function validatePreview(preview, index) {
  assertString(preview.originCode, `passportPreviews[${index}].originCode`);
  assertString(preview.destinationCode, `passportPreviews[${index}].destinationCode`);
  assertString(preview.status, `passportPreviews[${index}].status`);
}

function validateVisaRequirement(requirement, index) {
  assertString(requirement.originCode, `visaRequirements[${index}].originCode`);
  assertString(
    requirement.destinationCode,
    `visaRequirements[${index}].destinationCode`
  );
  assertString(
    requirement.tourism?.allowed,
    `visaRequirements[${index}].tourism.allowed`
  );
  assertString(requirement.tourism?.note, `visaRequirements[${index}].tourism.note`);
  assertString(
    requirement.study?.pathExists,
    `visaRequirements[${index}].study.pathExists`
  );
  assertString(
    requirement.work?.pathExists,
    `visaRequirements[${index}].work.pathExists`
  );
  assertString(requirement.sourceUrl, `visaRequirements[${index}].sourceUrl`);
  assertString(requirement.confidence, `visaRequirements[${index}].confidence`);
  assertString(requirement.lastChecked, `visaRequirements[${index}].lastChecked`);
}

export function validateDatasetSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Snapshot must be an object.");
  }

  if (snapshot.version !== SNAPSHOT_FORMAT_VERSION) {
    throw new Error(
      `Unsupported snapshot version: ${snapshot.version}. Expected ${SNAPSHOT_FORMAT_VERSION}.`
    );
  }

  if (!snapshot.metadata || typeof snapshot.metadata !== "object") {
    throw new Error("Snapshot metadata is required.");
  }

  assertString(snapshot.metadata.datasetUpdatedAt, "metadata.datasetUpdatedAt");
  assertString(snapshot.metadata.datasetSource, "metadata.datasetSource");
  assertArray(snapshot.countries, "countries");
  assertArray(snapshot.passportPreviews, "passportPreviews");
  assertArray(snapshot.visaRequirements, "visaRequirements");

  snapshot.countries.forEach(validateCountry);
  snapshot.passportPreviews.forEach(validatePreview);
  snapshot.visaRequirements.forEach(validateVisaRequirement);

  return snapshot;
}

export function writeDatasetSnapshot(snapshot, filePath) {
  validateDatasetSnapshot(snapshot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
}

export function readDatasetSnapshot(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const snapshot = JSON.parse(raw);

  return validateDatasetSnapshot(snapshot);
}

export function importDatasetSnapshot(snapshot) {
  const validatedSnapshot = validateDatasetSnapshot(snapshot);
  const database = getDatabase({ requireReady: false });

  const insertCountry = database.prepare(`
    INSERT INTO countries (
      code,
      name,
      official_name,
      flag,
      region,
      subregion,
      capital,
      population,
      area,
      lat,
      lng,
      landlocked,
      passport_strength,
      metadata_source
    )
    VALUES (
      @code,
      @name,
      @officialName,
      @flag,
      @region,
      @subregion,
      @capital,
      @population,
      @area,
      @lat,
      @lng,
      @landlocked,
      @passportStrength,
      @metadataSource
    )
  `);

  const insertLanguage = database.prepare(`
    INSERT INTO country_languages (country_code, language_code, name)
    VALUES (@countryCode, @languageCode, @name)
  `);

  const insertCurrency = database.prepare(`
    INSERT INTO country_currencies (country_code, currency_code, name, symbol)
    VALUES (@countryCode, @currencyCode, @name, @symbol)
  `);

  const insertPreview = database.prepare(`
    INSERT INTO passport_previews (origin_code, destination_code, status)
    VALUES (@originCode, @destinationCode, @status)
  `);

  const insertVisaRequirement = database.prepare(`
    INSERT INTO visa_requirements (
      origin_code,
      destination_code,
      tourism_allowed,
      tourism_requirement_code,
      tourism_max_stay_days,
      tourism_note,
      study_path_exists,
      work_path_exists,
      source_url,
      confidence,
      last_checked
    )
    VALUES (
      @originCode,
      @destinationCode,
      @tourismAllowed,
      @tourismRequirementCode,
      @tourismMaxStayDays,
      @tourismNote,
      @studyPathExists,
      @workPathExists,
      @sourceUrl,
      @confidence,
      @lastChecked
    )
  `);

  const insertMetadata = database.prepare(`
    INSERT INTO app_metadata (key, value)
    VALUES (?, ?)
  `);

  database.exec("BEGIN IMMEDIATE");

  try {
    database.exec(`
      DELETE FROM visa_requirements;
      DELETE FROM passport_previews;
      DELETE FROM country_languages;
      DELETE FROM country_currencies;
      DELETE FROM countries;
      DELETE FROM app_metadata;
    `);

    for (const country of validatedSnapshot.countries) {
      insertCountry.run({
        code: country.code,
        name: country.name,
        officialName: country.officialName,
        flag: country.flag,
        region: country.region,
        subregion: country.subregion || "",
        capital: country.capital,
        population: Number(country.population || 0),
        area: Number(country.area || 0),
        lat: country.latlng?.[0] ?? null,
        lng: country.latlng?.[1] ?? null,
        landlocked: country.landlocked ? 1 : 0,
        passportStrength: country.passportStrength,
        metadataSource: country.metadataSource
      });

      for (const language of country.languages || []) {
        insertLanguage.run({
          countryCode: country.code,
          languageCode: language.code,
          name: language.name
        });
      }

      for (const currency of country.currencies || []) {
        insertCurrency.run({
          countryCode: country.code,
          currencyCode: currency.code,
          name: currency.name,
          symbol: currency.symbol || ""
        });
      }
    }

    for (const preview of validatedSnapshot.passportPreviews) {
      insertPreview.run(preview);
    }

    for (const requirement of validatedSnapshot.visaRequirements) {
      insertVisaRequirement.run({
        originCode: requirement.originCode,
        destinationCode: requirement.destinationCode,
        tourismAllowed: requirement.tourism.allowed,
        tourismRequirementCode: requirement.tourism.requirementCode || "Unknown",
        tourismMaxStayDays: requirement.tourism.maxStayDays ?? null,
        tourismNote: requirement.tourism.note,
        studyPathExists: requirement.study.pathExists,
        workPathExists: requirement.work.pathExists,
        sourceUrl: requirement.sourceUrl,
        confidence: requirement.confidence,
        lastChecked: requirement.lastChecked
      });
    }

    insertMetadata.run("snapshot_format_version", String(SNAPSHOT_FORMAT_VERSION));
    insertMetadata.run(
      "dataset_updated_at",
      validatedSnapshot.metadata.datasetUpdatedAt
    );
    insertMetadata.run("dataset_source", validatedSnapshot.metadata.datasetSource);
    insertMetadata.run("imported_at", new Date().toISOString());

    if (validatedSnapshot.metadata.notes) {
      insertMetadata.run("dataset_notes", validatedSnapshot.metadata.notes);
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    closeDatabase();
  }

  return {
    countries: validatedSnapshot.countries.length,
    passportPreviews: validatedSnapshot.passportPreviews.length,
    visaRequirements: validatedSnapshot.visaRequirements.length
  };
}

export function buildStarterDatasetSnapshot() {
  const metadataByCode = new Map(
    sampleCountryMetadata.map((country) => [country.code, country])
  );

  const countries = worldCountries.map((country) => {
    const metadata = metadataByCode.get(country.cca3);

    return {
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
      passportStrength: metadata?.passportStrength || "Baseline",
      metadataSource: metadata ? "starter-sample" : "world-countries"
    };
  });

  const passportPreviews = sampleCountryMetadata.flatMap((country) =>
    (country.preview || []).map((preview) => ({
      originCode: country.code,
      destinationCode: preview.destinationCode,
      status: preview.status
    }))
  );

  const visaRequirements = Object.entries(simplifiedRouteMatrix).flatMap(
    ([originCode, destinations]) =>
      Object.entries(destinations).map(([destinationCode, route]) => ({
        originCode,
        destinationCode,
        tourism: route.tourism,
        study: route.study,
        work: route.work,
        sourceUrl: route.sourceUrl,
        confidence: route.confidence,
        lastChecked: route.lastChecked
      }))
  );

  return {
    version: SNAPSHOT_FORMAT_VERSION,
    metadata: {
      datasetUpdatedAt: "2026-03-25",
      datasetSource: "starter-sample",
      notes:
        "Generated locally from world-countries plus the project starter visa sample."
    },
    countries,
    passportPreviews,
    visaRequirements
  };
}
