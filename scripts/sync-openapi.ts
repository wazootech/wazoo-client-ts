// Syncs openapi/openapi.json from the Wazoo API OpenAPI document. The spec of
// record is the committed snapshot in the wazoo-api repo (openapi/openapi.json);
// the TypeScript spec module is not part of that repository, so a stale
// default here silently regenerates the client from the wrong source. Sources,
// in order: WAZOO_API_OPENAPI_SOURCE, WAZOO_API_OPENAPI_URL, the sibling
// wazoo-api checkout, then the raw GitHub snapshot of wazoo-api main. Pass
// --check to fail when the committed snapshot is stale (used by CI instead of
// rewriting it).
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(repoRoot, "openapi/openapi.json");
const checkOnly = process.argv.slice(2).includes("--check");

const siblingSnapshot = resolve(repoRoot, "../wazoo-api/openapi/openapi.json");
const source =
  process.env.WAZOO_API_OPENAPI_SOURCE ??
  process.env.WAZOO_API_OPENAPI_URL ??
  (existsSync(siblingSnapshot)
    ? "../wazoo-api/openapi/openapi.json"
    : "https://raw.githubusercontent.com/wazootech/wazoo-api/main/openapi/openapi.json");

const spec = await loadSpec(source);
const next = `${JSON.stringify(spec, null, 2)}\n`;

await mkdir(dirname(outputPath), { recursive: true });

let previous: string | null = null;
try {
  previous = await readFile(outputPath, "utf8");
} catch {
  // first sync
}

if (previous === next) {
  console.log("openapi/openapi.json unchanged");
} else if (checkOnly) {
  console.error(
    "openapi/openapi.json is stale. Run `bun run sync:openapi` and commit the result.",
  );
  process.exit(1);
} else {
  await writeFile(outputPath, next);
  console.log("openapi/openapi.json updated");
}

async function loadSpec(value: string): Promise<unknown> {
  if (/^https?:\/\//.test(value)) {
    const response = await fetch(value);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${value}: ${response.status}`);
    }
    return response.json();
  }

  const path = resolve(repoRoot, value);
  if (path.endsWith(".json")) {
    return JSON.parse(await readFile(path, "utf8"));
  }
  const mod = await import(pathToFileURL(path).href);
  return mod.openApiSpec ?? mod.default;
}
