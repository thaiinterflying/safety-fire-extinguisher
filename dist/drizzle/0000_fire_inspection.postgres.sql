-- PostgreSQL schema for TIF FireSafe (Neon).
-- Mirrors drizzle/0000_fire_inspection.sql but keeps text columns so the
-- worker logic (date strings, comparisons) behaves the same as on D1.
CREATE TABLE IF NOT EXISTS extinguishers (
  id text PRIMARY KEY NOT NULL,
  code text NOT NULL UNIQUE,
  location text NOT NULL,
  building text NOT NULL DEFAULT '',
  type text NOT NULL,
  capacity text NOT NULL,
  serial_number text NOT NULL DEFAULT '',
  expiry_date text NOT NULL,
  installed_date text NOT NULL DEFAULT '',
  created_at text NOT NULL,
  created_by text NOT NULL
);

CREATE TABLE IF NOT EXISTS inspections (
  id text PRIMARY KEY NOT NULL,
  extinguisher_id text NOT NULL REFERENCES extinguishers (id),
  inspected_on text NOT NULL,
  inspector text NOT NULL,
  inspector_user_id text NOT NULL,
  pressure text NOT NULL,
  pin text NOT NULL,
  hose text NOT NULL,
  body text NOT NULL,
  access text NOT NULL,
  label text NOT NULL,
  notes text NOT NULL DEFAULT '',
  result text NOT NULL,
  created_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS inspections_extinguisher_date_idx
  ON inspections (extinguisher_id, inspected_on);
