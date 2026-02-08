-- KV store used by edge function make-server-069560bb
CREATE TABLE IF NOT EXISTS kv_store_069560bb (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE kv_store_069560bb ENABLE ROW LEVEL SECURITY;
