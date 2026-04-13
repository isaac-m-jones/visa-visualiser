import {
  PASSPORT_INDEX_SNAPSHOT_PATH,
  buildPassportIndexSnapshot,
  fetchPassportIndexDataset,
  writeGeneratedPassportIndexSnapshot
} from "../lib/passportIndexSource.js";
import { importDatasetSnapshot } from "../lib/datasetSnapshot.js";

const source = await fetchPassportIndexDataset();
const snapshot = buildPassportIndexSnapshot(source);

writeGeneratedPassportIndexSnapshot(snapshot, PASSPORT_INDEX_SNAPSHOT_PATH);

const result = importDatasetSnapshot(snapshot);

console.log(`Passport index snapshot written to ${PASSPORT_INDEX_SNAPSHOT_PATH}`);
console.log(
  `Imported dataset: ${result.countries} countries, ${result.passportPreviews} previews, ${result.visaRequirements} visa requirements`
);
