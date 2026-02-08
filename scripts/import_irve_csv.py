#!/usr/bin/env python3
import csv
import json
import os
import sys
import time
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
  print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
  sys.exit(1)

DATA_URL = os.environ.get(
  "IRVE_CSV_URL",
  "https://static.data.gouv.fr/resources/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques/20260208-045937/consolidation-etalab-schema-irve-statique-v-2.3.1-20260208.csv",
)

API_URL = f"{SUPABASE_URL}/rest/v1/stations_irve"

def to_float(value):
  try:
    return float(value)
  except (TypeError, ValueError):
    return None

def to_bool(value):
  if value is None:
    return False
  return str(value).lower() in ("true", "1", "yes", "oui")

def build_connector_types(row):
  types = []
  if to_bool(row.get("prise_type_ef")):
    types.append("Type E/F")
  if to_bool(row.get("prise_type_2")):
    types.append("Type 2")
  if to_bool(row.get("prise_type_combo_ccs")):
    types.append("CCS")
  if to_bool(row.get("prise_type_chademo")):
    types.append("CHAdeMO")
  if to_bool(row.get("prise_type_autre")):
    types.append("Autre")
  return types or None

def map_station(row):
  lon = to_float(row.get("consolidated_longitude"))
  lat = to_float(row.get("consolidated_latitude"))
  if lon is None or lat is None:
    return None

  station_id = row.get("id_pdc_itinerance") or row.get("id_station_itinerance")
  if not station_id:
    station_id = f"{lon}-{lat}-{row.get('nom_station') or 'station'}"

  return {
    "id": station_id,
    "name": row.get("nom_station") or row.get("nom_enseigne") or "Borne de recharge",
    "address": row.get("adresse_station") or "",
    "city": row.get("consolidated_commune") or "",
    "region": row.get("consolidated_code_postal") or "",
    "latitude": lat,
    "longitude": lon,
    "power_kw": to_float(row.get("puissance_nominale")) or 0,
    "connector_types": build_connector_types(row),
    "available": (row.get("etat_pdc") or "").lower() != "hors-service",
    "price_per_hour": to_float(row.get("tarification")),
    "operator": row.get("nom_operateur") or "Inconnu",
    "access_type": row.get("condition_acces") or "public",
    "description": row.get("observations") or "",
  }

def post_batch(batch):
  body = json.dumps(batch).encode("utf-8")
  req = urllib.request.Request(API_URL, data=body, method="POST")
  req.add_header("Content-Type", "application/json")
  req.add_header("apikey", SUPABASE_SERVICE_ROLE_KEY)
  req.add_header("Authorization", f"Bearer {SUPABASE_SERVICE_ROLE_KEY}")
  req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")

  try:
    with urllib.request.urlopen(req) as resp:
      if resp.status not in (200, 201, 204):
        raise RuntimeError(f"Unexpected status: {resp.status}")
  except urllib.error.HTTPError as e:
    error_body = e.read().decode("utf-8", errors="replace")
    raise RuntimeError(f"HTTP {e.code}: {error_body}") from e

def post_batch_with_retry(batch):
  try:
    post_batch(batch)
    return
  except Exception as exc:
    if len(batch) == 1:
      print(f"Skipping record due to error: {exc}")
      return
    mid = len(batch) // 2
    post_batch_with_retry(batch[:mid])
    post_batch_with_retry(batch[mid:])

def run():
  print("Downloading IRVE CSV...")
  with urllib.request.urlopen(DATA_URL) as resp:
    text = (line.decode("utf-8", errors="replace") for line in resp)
    reader = csv.DictReader(text)
    batch = []
    total = 0

    for row in reader:
      station = map_station(row)
      if station is None:
        continue
      batch.append(station)
      if len(batch) >= 500:
        post_batch_with_retry(batch)
        total += len(batch)
        print(f"Imported {total} stations")
        batch = []
        time.sleep(0.2)

    if batch:
      post_batch(batch)
      total += len(batch)

  print(f"Import completed: {total} stations")

if __name__ == "__main__":
  run()
