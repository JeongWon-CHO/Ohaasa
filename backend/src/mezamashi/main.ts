import "dotenv/config";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createAdminClient } from "../db/supabase";
import { fetchJson } from "./fetcher";
import { parse, parseHtml } from "./parser";
import { collectAndSave, translateEntries } from "./pipeline";

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    save: { type: "boolean", default: false },
    translate: { type: "boolean", default: false },
    html: { type: "string" }, year: { type: "string" }, json: { type: "string" },
  } });
  if (values.html && values.json) throw new Error("Use either --html or --json");
  if (values.html && values.save) throw new Error("HTML preview only; save from official JSON");
  if (values.html && !values.year) throw new Error("Saved HTML requires --year (page has no year)");
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (values.html) {
    const result = parseHtml(await readFile(values.html, "utf8"), Number(values.year));
    console.log(JSON.stringify(values.translate ? { ...result, entries: await translateEntries(result.entries) } : result, null, 2));
    return;
  }
  const input: unknown = values.json ? JSON.parse(await readFile(values.json, "utf8")) : await fetchJson();
  if (values.save) {
    console.log(JSON.stringify(await collectAndSave(createAdminClient(), today, input)));
  } else {
    const result = parse(input);
    console.log(JSON.stringify(values.translate ? { ...result, entries: await translateEntries(result.entries) } : result, null, 2));
  }
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error(`[mezamashi] ${error.message}`);
    process.exitCode = 1;
  });
}
