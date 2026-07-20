import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(repoRoot, "openapi/openapi.json");
const source =
  process.env.WAZOO_API_OPENAPI_SOURCE ??
  process.env.WAZOO_API_OPENAPI_URL ??
  "../wazoo-api/src/openapi/spec.ts";

const spec = await loadSpec(source);
const next = `${JSON.stringify(spec, null, 2)}\n`;

await mkdir(dirname(outputPath), { recursive: true });

let previous = null;
try {
  previous = await readFile(outputPath, "utf8");
} catch {
  // first sync
}

if (previous === next) {
  console.log("openapi/openapi.json unchanged");
} else {
  await writeFile(outputPath, next);
  console.log("openapi/openapi.json updated");
}

async function loadSpec(value) {
  if (/^https?:\/\//.test(value)) {
    const response = await fetch(value);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${value}: ${response.status}`);
    }
    return response.json();
  }

  const path = resolve(repoRoot, value);
  const mod = await import(pathToFileURL(path).href);
  return mod.openApiSpec ?? mod.default;
}
