import path from "node:path";
import {
  STARTER_SNAPSHOT_PATH,
  importDatasetSnapshot,
  readDatasetSnapshot
} from "../lib/datasetSnapshot.js";

function parseArgs(argv) {
  const args = { file: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--file") {
      args.file = argv[index + 1] || "";
      index += 1;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));
const snapshotPath = args.file
  ? path.resolve(process.cwd(), args.file)
  : STARTER_SNAPSHOT_PATH;
const snapshot = readDatasetSnapshot(snapshotPath);
const result = importDatasetSnapshot(snapshot);

console.log(`Imported dataset from ${snapshotPath}`);
console.log(
  `Countries: ${result.countries}, previews: ${result.passportPreviews}, visa requirements: ${result.visaRequirements}`
);
