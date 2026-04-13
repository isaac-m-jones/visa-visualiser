import {
  STARTER_SNAPSHOT_PATH,
  buildStarterDatasetSnapshot,
  writeDatasetSnapshot
} from "../lib/datasetSnapshot.js";

const snapshot = buildStarterDatasetSnapshot();

writeDatasetSnapshot(snapshot, STARTER_SNAPSHOT_PATH);

console.log(`Starter dataset snapshot written to ${STARTER_SNAPSHOT_PATH}`);
