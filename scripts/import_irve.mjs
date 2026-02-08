import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DATASET_URL =
  "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/consolidation-etalab-schema-irve-statique-v-2-3-0/records";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const toFloat = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildConnectorTypes = (item) => {
  if (typeof item.type_prise === "string" && item.type_prise.trim()) {
    return [item.type_prise.trim()];
  }

  const types = [];
  if (item.prise_type_ef) types.push("Type E/F");
  if (item.prise_type_2) types.push("Type 2");
  if (item.prise_type_combo_ccs) types.push("CCS");
  if (item.prise_type_chademo) types.push("CHAdeMO");
  if (item.prise_type_autre) types.push("Autre");
  return types.length ? types : null;
};

const mapStation = (item) => {
  const lat = toFloat(item.coordonneesxy?.lat ?? item.consolidated_latitude);
  const lon = toFloat(item.coordonneesxy?.lon ?? item.consolidated_longitude);
  if (lat == null || lon == null) return null;

  const id =
    item.id_pdc_itinerance ||
    item.id_station ||
    item.id ||
    `${lat}-${lon}-${item.nom_station || "station"}`;

  return {
    id,
    name: item.nom_station || item.n_enseigne || "Borne de recharge",
    address: item.adresse_station || item.ad_station || "",
    city: item.commune || item.consolidated_commune || "",
    region: item.region || "",
    latitude: lat,
    longitude: lon,
    power_kw: toFloat(item.puissance_nominale ?? item.pdc_puiss_max) || 0,
    connector_types: buildConnectorTypes(item),
    available:
      item.etat_pdc !== "hors-service" &&
      item.etat !== "hors_service" &&
      item.etat !== "hors-service",
    price_per_hour: toFloat(item.tarification),
    operator: item.nom_operateur || item.n_operateur || "Inconnu",
    access_type: item.acces_recharge || item.accessibilite || "public",
    description: item.observations || "",
    raw: item,
  };
};

const upsertBatch = async (batch) => {
  const { error } = await supabase
    .from("stations_irve")
    .upsert(batch, { onConflict: "id" });
  if (error) {
    throw error;
  }
};

const run = async () => {
  const limit = 1000;
  let offset = 0;
  let total = null;
  let processed = 0;

  console.log("Starting IRVE import...");

  while (total == null || offset < total) {
    const params = new URLSearchParams();
    params.append("limit", String(limit));
    params.append("offset", String(offset));
    params.append("where", "coordonneesxy IS NOT NULL");

    const url = `${DATASET_URL}?${params.toString()}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Failed to fetch IRVE data: ${response.status}`);
    }

    const data = await response.json();
    total = data.total_count ?? total ?? 0;
    const results = data.results || [];

    const mapped = results
      .map(mapStation)
      .filter(Boolean);

    for (let i = 0; i < mapped.length; i += 500) {
      const chunk = mapped.slice(i, i + 500);
      await upsertBatch(chunk);
    }

    processed += mapped.length;
    offset += limit;
    console.log(`Imported ${processed}/${total || "?"} stations`);

    await sleep(200);
  }

  console.log("IRVE import completed.");
};

run().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
