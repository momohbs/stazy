CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS stations_irve (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  region TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  power_kw DOUBLE PRECISION,
  connector_types TEXT[],
  available BOOLEAN NOT NULL DEFAULT true,
  price_per_hour DOUBLE PRECISION,
  operator TEXT,
  access_type TEXT,
  description TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED
);

CREATE INDEX IF NOT EXISTS stations_irve_geom_gix ON stations_irve USING GIST (geom);

CREATE OR REPLACE FUNCTION stations_near_route(
  route_wkt TEXT,
  radius_m INTEGER DEFAULT 15000,
  limit_n INTEGER DEFAULT 500
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  power_kw DOUBLE PRECISION,
  connector_types TEXT[],
  available BOOLEAN,
  price_per_hour DOUBLE PRECISION,
  operator TEXT,
  access_type TEXT,
  description TEXT,
  distance_m DOUBLE PRECISION
)
LANGUAGE sql
AS $$
  SELECT
    s.id,
    s.name,
    s.address,
    s.city,
    s.region,
    s.latitude,
    s.longitude,
    s.power_kw,
    s.connector_types,
    s.available,
    s.price_per_hour,
    s.operator,
    s.access_type,
    s.description,
    ST_Distance(s.geom, ST_GeogFromText(route_wkt)) AS distance_m
  FROM stations_irve s
  WHERE ST_DWithin(s.geom, ST_GeogFromText(route_wkt), radius_m)
  ORDER BY distance_m
  LIMIT limit_n;
$$;
