// Refresh openapi/openapi.json from a running oms-be API.
// Start the API with OMS_SHOW_API_DOCS=true, then run `pnpm api:fetch` and
// `pnpm api:types`, and review the diff of both files.
import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.OMS_OPENAPI_URL ?? "http://127.0.0.1:8000/openapi.json";

const response = await fetch(url);
if (!response.ok) {
  console.error(`Could not read ${url}: HTTP ${response.status}`);
  process.exit(1);
}
const schema = await response.json();
await mkdir("openapi", { recursive: true });
await writeFile("openapi/openapi.json", JSON.stringify(schema, null, 2) + "\n");
console.log(`Saved openapi/openapi.json from ${url}`);
