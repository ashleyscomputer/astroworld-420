import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const configPath = new URL("../dist/server/wrangler.json", import.meta.url);
const config = JSON.parse(await readFile(configPath, "utf8"));

assert.equal(config.name, "astroworld-420", "Worker name must target the existing Astroworld Worker.");

const preview = config.previews;
assert.ok(preview, "Generated Wrangler config is missing its previews block.");
assert.equal(preview.vars?.ADMIN_USERNAME, "Mudi", "Preview admin username is missing.");

const previewDatabases = preview.d1_databases ?? [];
const db = previewDatabases.find((binding) => binding.binding === "DB");
assert.ok(db, "Preview DB binding is missing.");
assert.equal(db.database_name, "astroworld-420-release-preview");
assert.equal(db.database_id, "908ed519-2d90-4234-a604-639cf226c7d9");
assert.equal(db.migrations_dir, "drizzle");
assert.equal(db.migrations_table, "d1_migrations");
assert.notEqual(db.database_id, "00000000-0000-4000-8000-000000000000");
assert.ok(
  !Object.hasOwn(preview.vars ?? {}, "ADMIN_INITIAL_PASSWORD"),
  "Do not put the bootstrap password in Wrangler config or Git.",
);

console.log("PASS: generated Worker Preview config targets only the isolated release-preview D1 binding.");
