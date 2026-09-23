#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(import.meta.url);
const dotenv = require(path.join(root, "backend/node_modules/dotenv"));
const fileEnvironment = {};
for (const relativePath of ["backend/.env", ".env.local"]) {
  const environmentPath = path.join(root, relativePath);
  if (fs.existsSync(environmentPath)) {
    Object.assign(fileEnvironment, dotenv.parse(fs.readFileSync(environmentPath)));
  }
}

const stage = process.argv[2] ?? "before";
if (!new Set(["before", "after"]).has(stage)) {
  throw new Error("Usage: node preflight-supabase.mjs [before|after]");
}

const baseUrl = (process.env.SUPABASE_URL ?? fileEnvironment.SUPABASE_URL)?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? fileEnvironment.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const response = await fetch(`${baseUrl}/rest/v1/`, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
  signal: AbortSignal.timeout(15_000),
});
if (!response.ok) {
  throw new Error(`Supabase OpenAPI request failed: HTTP ${response.status}`);
}

const document = await response.json();
const definitions = document.definitions ?? {};

function requireColumns(table, expected) {
  const definition = definitions[table];
  if (!definition) throw new Error(`${table} is not exposed by PostgREST`);
  const columns = new Set(Object.keys(definition.properties ?? {}));
  const missing = expected.filter((column) => !columns.has(column));
  if (missing.length > 0) {
    throw new Error(`${table} is missing columns: ${missing.join(", ")}`);
  }
  return definition;
}

requireColumns("horoscopes", ["date", "zodiac_sign", "advice_ko"]);
const devices = requireColumns("user_devices", [
  "device_id",
  "zodiac_sign",
  "push_token",
  "notifications_enabled",
]);
const log = requireColumns("notification_log", ["date", "sent_at"]);

if (stage === "before") {
  const dateDescription = log.properties?.date?.description ?? "";
  if (!dateDescription.includes("<pk/>")) {
    throw new Error("notification_log.date is not the expected current primary key");
  }
  if (devices.properties?.notification_time || devices.properties?.notification_state) {
    throw new Error("notification scheduling columns already exist; use the after check instead");
  }
} else {
  requireColumns("user_devices", ["notification_time", "notification_state"]);
  requireColumns("notification_log", [
    "notification_type",
    "scheduled_time",
    "status",
    "attempt_count",
    "metadata",
  ]);
  for (const column of ["notification_type", "date", "scheduled_time"]) {
    const description = log.properties?.[column]?.description ?? "";
    if (!description.includes("<pk/>")) {
      throw new Error(`notification_log.${column} is not part of the composite primary key`);
    }
  }
}

console.log(`Supabase notification schema preflight (${stage}) passed.`);
