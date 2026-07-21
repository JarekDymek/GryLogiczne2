import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distDirectory = path.join(root, "dist");
const assetsDirectory = path.join(distDirectory, "assets");
const serviceWorkerPath = path.join(distDirectory, "sw.js");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    }),
  );
  return files.flat();
}

const buildFiles = (await listFiles(assetsDirectory)).sort();
if (buildFiles.length === 0) {
  throw new Error("Build did not produce any files in dist/assets.");
}

const buildAssets = buildFiles.map((file) => path.relative(distDirectory, file).replaceAll(path.sep, "/"));
const source = await readFile(serviceWorkerPath, "utf8");
const digest = createHash("sha256");
digest.update(source);

for (const file of (await listFiles(distDirectory)).sort()) {
  if (file !== serviceWorkerPath) {
    digest.update(path.relative(distDirectory, file));
    digest.update(await readFile(file));
  }
}

const cacheVersion = `gry-logiczne2-${digest.digest("hex").slice(0, 12)}`;
const assetMarker = "const BUILD_ASSETS = /* INJECT_BUILD_ASSETS */ [];";
const versionMarker = 'const CACHE_VERSION = "gry-logiczne2-dev";';

if (!source.includes(assetMarker) || !source.includes(versionMarker)) {
  throw new Error("Service worker build markers are missing.");
}

const finalized = source
  .replace(versionMarker, `const CACHE_VERSION = ${JSON.stringify(cacheVersion)};`)
  .replace(assetMarker, `const BUILD_ASSETS = ${JSON.stringify(buildAssets)};`);

await writeFile(serviceWorkerPath, finalized, "utf8");
console.log(`Service worker precaches ${buildAssets.length} build assets (${cacheVersion}).`);
