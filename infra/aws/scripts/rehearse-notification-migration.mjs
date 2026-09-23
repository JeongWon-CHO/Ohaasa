#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(import.meta.url);
const dotenv = require(path.join(root, "backend/node_modules/dotenv"));
const secretsPath = path.join(root, ".env.local");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260922000000_notification_scheduling.sql",
);

if (!fs.existsSync(secretsPath)) throw new Error(".env.local is missing");
const secrets = dotenv.parse(fs.readFileSync(secretsPath));
if (!secrets.SUPABASE_ACCESS_TOKEN || !secrets.SUPABASE_DB_PASSWORD) {
  throw new Error("Supabase credentials are missing from .env.local");
}

const migration = fs.readFileSync(migrationPath, "utf8");
const assertions = `
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_devices'
      and column_name = 'notification_time'
  ) then
    raise exception 'notification_time missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_devices'
      and column_name = 'notification_state'
  ) then
    raise exception 'notification_state missing';
  end if;

  if not exists (
    select 1
    from pg_constraint con
    where con.conrelid = 'public.notification_log'::regclass
      and con.contype = 'p'
      and (
        select array_agg(att.attname::text order by key_position.ordinality)
        from unnest(con.conkey) with ordinality as key_position(attnum, ordinality)
        join pg_attribute att
          on att.attrelid = con.conrelid and att.attnum = key_position.attnum
      ) = array['notification_type', 'date', 'scheduled_time']::text[]
  ) then
    raise exception 'notification_log composite primary key missing';
  end if;
end
$$;
`;

const rehearsalSql = `begin;\n${migration}\n${assertions}\nrollback;`;
const result = spawnSync(
  "npx",
  ["--yes", "supabase@latest", "db", "query", "--linked", rehearsalSql],
  {
    cwd: root,
    env: { ...process.env, ...secrets },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
