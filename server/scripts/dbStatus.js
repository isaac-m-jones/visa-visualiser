import { getDatabaseStatus } from "../lib/database.js";

const status = getDatabaseStatus();

console.log(JSON.stringify(status, null, 2));
