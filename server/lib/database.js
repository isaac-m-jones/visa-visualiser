import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_UPDATED_AT_KEY = "dataset_updated_at";

export const DATABASE_PATH = path.resolve(__dirname, "../data/visa.sqlite");

export class DatabaseNotReadyError extends Error {
  constructor(message) {
    super(message);
    this.name = "DatabaseNotReadyError";
  }
}

function ensureDirectoryForDatabase() {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
}

function createSchema(database) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS countries (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      official_name TEXT NOT NULL,
      flag TEXT NOT NULL,
      region TEXT NOT NULL,
      subregion TEXT NOT NULL,
      capital TEXT NOT NULL,
      population INTEGER NOT NULL,
      area REAL NOT NULL,
      lat REAL,
      lng REAL,
      landlocked INTEGER NOT NULL,
      passport_strength TEXT NOT NULL,
      metadata_source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS country_languages (
      country_code TEXT NOT NULL,
      language_code TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (country_code, language_code),
      FOREIGN KEY (country_code) REFERENCES countries(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS country_currencies (
      country_code TEXT NOT NULL,
      currency_code TEXT NOT NULL,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      PRIMARY KEY (country_code, currency_code),
      FOREIGN KEY (country_code) REFERENCES countries(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS passport_previews (
      origin_code TEXT NOT NULL,
      destination_code TEXT NOT NULL,
      status TEXT NOT NULL,
      PRIMARY KEY (origin_code, destination_code),
      FOREIGN KEY (origin_code) REFERENCES countries(code) ON DELETE CASCADE,
      FOREIGN KEY (destination_code) REFERENCES countries(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visa_requirements (
      origin_code TEXT NOT NULL,
      destination_code TEXT NOT NULL,
      tourism_allowed TEXT NOT NULL,
      tourism_requirement_code TEXT NOT NULL DEFAULT 'Unknown',
      tourism_max_stay_days INTEGER,
      tourism_note TEXT NOT NULL,
      study_path_exists TEXT NOT NULL,
      work_path_exists TEXT NOT NULL,
      source_url TEXT NOT NULL,
      confidence TEXT NOT NULL,
      last_checked TEXT NOT NULL,
      PRIMARY KEY (origin_code, destination_code),
      FOREIGN KEY (origin_code) REFERENCES countries(code) ON DELETE CASCADE,
      FOREIGN KEY (destination_code) REFERENCES countries(code) ON DELETE CASCADE
    );
  `);

  const visaRequirementColumns = database
    .prepare(`
      SELECT name
      FROM pragma_table_info('visa_requirements')
    `)
    .all()
    .map((row) => row.name);

  if (!visaRequirementColumns.includes("tourism_requirement_code")) {
    database.exec(`
      ALTER TABLE visa_requirements
      ADD COLUMN tourism_requirement_code TEXT NOT NULL DEFAULT 'Unknown'
    `);
  }
}

function openDatabaseConnection() {
  ensureDirectoryForDatabase();

  const database = new DatabaseSync(DATABASE_PATH);
  createSchema(database);

  return database;
}

function readMetadataValue(database, key) {
  const row = database
    .prepare(`
      SELECT value
      FROM app_metadata
      WHERE key = ?
    `)
    .get(key);

  return row?.value ?? null;
}

function readProvisioningState(database) {
  const countryCount = Number(
    database.prepare("SELECT COUNT(*) AS count FROM countries").get().count || 0
  );
  const datasetUpdatedAt = readMetadataValue(database, DATASET_UPDATED_AT_KEY);
  const datasetSource = readMetadataValue(database, "dataset_source");
  const importedAt = readMetadataValue(database, "imported_at");

  return {
    ready:
      countryCount > 0 &&
      Boolean(datasetUpdatedAt) &&
      Boolean(datasetSource) &&
      Boolean(importedAt),
    countryCount,
    datasetUpdatedAt,
    datasetSource,
    importedAt
  };
}

function assertDatabaseReady(database) {
  const state = readProvisioningState(database);

  if (!state.ready) {
    throw new DatabaseNotReadyError(
      "Visa database is not provisioned. Run `npm run db:import -- --file <snapshot.json>` first."
    );
  }

  return state;
}

let databaseInstance;

export function getDatabase({ requireReady = true } = {}) {
  if (!databaseInstance) {
    databaseInstance = openDatabaseConnection();
  }

  if (requireReady) {
    assertDatabaseReady(databaseInstance);
  }

  return databaseInstance;
}

export function getDatabaseStatus() {
  if (!fs.existsSync(DATABASE_PATH)) {
    return {
      path: DATABASE_PATH,
      exists: false,
      ready: false,
      countryCount: 0,
      datasetUpdatedAt: null,
      datasetSource: null,
      importedAt: null
    };
  }

  const database = openDatabaseConnection();

  try {
    return {
      path: DATABASE_PATH,
      exists: true,
      ...readProvisioningState(database)
    };
  } finally {
    database.close();
  }
}

export function getDatasetUpdatedAt() {
  const database = getDatabase();

  return readMetadataValue(database, DATASET_UPDATED_AT_KEY) || "Unknown";
}

export function closeDatabase() {
  if (!databaseInstance) {
    return;
  }

  databaseInstance.close();
  databaseInstance = undefined;
}
