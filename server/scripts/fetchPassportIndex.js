import {
  PASSPORT_INDEX_SNAPSHOT_PATH,
  buildPassportIndexSnapshot,
  fetchPassportIndexDataset,
  writeGeneratedPassportIndexSnapshot
} from "../lib/passportIndexSource.js";

const source = await fetchPassportIndexDataset();
const snapshot = buildPassportIndexSnapshot(source);

writeGeneratedPassportIndexSnapshot(snapshot, PASSPORT_INDEX_SNAPSHOT_PATH);

console.log(`Passport index snapshot written to ${PASSPORT_INDEX_SNAPSHOT_PATH}`);
console.log(
  `Countries: ${snapshot.countries.length}, previews: ${snapshot.passportPreviews.length}, visa requirements: ${snapshot.visaRequirements.length}`
);
