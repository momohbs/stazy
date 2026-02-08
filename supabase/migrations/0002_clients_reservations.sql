CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  station_id TEXT,
  station_name TEXT NOT NULL,
  station_address TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_hours INTEGER,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select_own ON clients
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY clients_insert_own ON clients
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY clients_update_own ON clients
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY reservations_select_own ON reservations
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY reservations_insert_own ON reservations
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY reservations_update_own ON reservations
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY reservations_delete_own ON reservations
  FOR DELETE
  USING (auth.uid() = client_id);
