import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-069560bb/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== AUTHENTICATION ==========

// Sign up endpoint
app.post("/make-server-069560bb/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return c.json({ error: "Email, password et nom requis" }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    // Create user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      createdAt: new Date().toISOString(),
      favorites: [],
      reservations: [],
    });

    return c.json({ success: true, user: data.user });
  } catch (error: any) {
    console.log("Signup error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get user profile
app.get("/make-server-069560bb/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: "Profil non trouvé" }, 404);
    }

    return c.json(profile);
  } catch (error: any) {
    console.log("Get profile error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update user profile
app.put("/make-server-069560bb/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const body = await c.req.json();
    const profile = await kv.get(`user:${user.id}`);
    
    if (!profile) {
      return c.json({ error: "Profil non trouvé" }, 404);
    }

    const updatedProfile = { ...profile, ...body };
    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json(updatedProfile);
  } catch (error: any) {
    console.log("Update profile error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== CHARGING STATIONS ==========

// Fetch real charging stations from French government API
app.get("/make-server-069560bb/stations", async (c) => {
  try {
    const { limit = "5000", offset = "0", region, city } = c.req.query();
    
    // Use the official IRVE API endpoint from data.gouv.fr
    // This endpoint is more stable and uses the consolidated national file
    const apiUrl = "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/consolidation-etalab-schema-irve-statique-v-2-3-0/records";
    
    const params = new URLSearchParams();
    params.append("limit", limit);
    params.append("offset", offset);
    params.append("where", "coordonneesxy IS NOT NULL");
    
    if (region) {
      params.append("refine", `region:"${region}"`);
    }
    if (city) {
      params.append("refine", `commune:"${city}"`);
    }

    console.log(`Fetching stations from: ${apiUrl}?${params.toString()}`);
    
    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.log("IRVE API error:", response.status, response.statusText);
      const errorText = await response.text();
      console.log("Error response:", errorText);
      
      // Return fallback data instead of error
      return c.json({ 
        stations: generateFallbackStations(), 
        total: 100,
        fallback: true 
      });
    }

    const data = await response.json();
    console.log(`Received ${data.results?.length || 0} stations from IRVE API (total available: ${data.total_count || 0})`);
    
    // Transform IRVE data to our format
    const stations = data.results?.map((item: any, index: number) => ({
      id: item.id_pdc_itinerance || `irve-${index}`,
      name: item.nom_station || item.n_enseigne || "Borne de recharge",
      address: item.adresse_station || item.ad_station || "",
      city: item.commune || item.consolidated_commune || "",
      region: item.region || item.consolidated_code_postal?.substring(0, 2) || "",
      latitude: parseFloat(item.coordonneesxy?.lat || item.consolidated_latitude || 0),
      longitude: parseFloat(item.coordonneesxy?.lon || item.consolidated_longitude || 0),
      powerKw: parseFloat(item.puissance_nominale || item.pdc_puiss_max || 0),
      connectorTypes: item.type_prise ? [item.type_prise] : item.prise_type_ef ? [item.prise_type_ef] : [],
      available: item.etat_pdc !== "hors-service" && item.etat !== "hors_service",
      pricePerHour: parseFloat(item.tarification || 0) || 5,
      operator: item.nom_operateur || item.n_operateur || "Inconnu",
      accessType: item.acces_recharge || item.accessibilite || "public",
      description: item.observations || "",
      services: {
        parking: item.accessibilite_pmr === "TRUE" || item.accessibilite_pmr === "Réservé PMR",
        wifi: false,
      },
    })) || [];

    return c.json({ 
      stations, 
      total: data.total_count || stations.length,
      offset: parseInt(offset),
      limit: parseInt(limit),
      hasMore: data.total_count && (parseInt(offset) + stations.length < data.total_count)
    });
  } catch (error: any) {
    console.log("Fetch stations error:", error);
    
    // Return fallback data instead of error
    return c.json({ 
      stations: generateFallbackStations(), 
      total: 100,
      fallback: true 
    });
  }
});

// Helper function to generate fallback stations across France
function generateFallbackStations() {
  const cities = [
    { name: "Paris", lat: 48.8566, lon: 2.3522, region: "Île-de-France" },
    { name: "Lyon", lat: 45.7640, lon: 4.8357, region: "Auvergne-Rhône-Alpes" },
    { name: "Marseille", lat: 43.2965, lon: 5.3698, region: "Provence-Alpes-Côte d'Azur" },
    { name: "Toulouse", lat: 43.6047, lon: 1.4442, region: "Occitanie" },
    { name: "Nice", lat: 43.7102, lon: 7.2620, region: "Provence-Alpes-Côte d'Azur" },
    { name: "Nantes", lat: 47.2184, lon: -1.5536, region: "Pays de la Loire" },
    { name: "Bordeaux", lat: 44.8378, lon: -0.5792, region: "Nouvelle-Aquitaine" },
    { name: "Lille", lat: 50.6292, lon: 3.0573, region: "Hauts-de-France" },
    { name: "Strasbourg", lat: 48.5734, lon: 7.7521, region: "Grand Est" },
    { name: "Rennes", lat: 48.1173, lon: -1.6778, region: "Bretagne" },
    { name: "Reims", lat: 49.2583, lon: 4.0317, region: "Grand Est" },
    { name: "Montpellier", lat: 43.6108, lon: 3.8767, region: "Occitanie" },
    { name: "Dijon", lat: 47.3220, lon: 5.0415, region: "Bourgogne-Franche-Comté" },
    { name: "Grenoble", lat: 45.1885, lon: 5.7245, region: "Auvergne-Rhône-Alpes" },
    { name: "Angers", lat: 47.4784, lon: -0.5632, region: "Pays de la Loire" },
  ];

  const operators = ["Ionity", "Tesla Supercharger", "Total Energies", "Izivia", "Freshmile"];
  const stations: any[] = [];

  cities.forEach((city, cityIndex) => {
    // Generate 5-8 stations per city
    const stationCount = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < stationCount; i++) {
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lonOffset = (Math.random() - 0.5) * 0.1;
      
      stations.push({
        id: `fallback-${cityIndex}-${i}`,
        name: `${operators[i % operators.length]} - ${city.name}`,
        address: `${10 + i} Rue de la Charge, ${city.name}`,
        city: city.name,
        region: city.region,
        latitude: city.lat + latOffset,
        longitude: city.lon + lonOffset,
        powerKw: [7, 11, 22, 50, 150][i % 5],
        connectorTypes: ["Type 2", "CCS"],
        available: Math.random() > 0.3,
        pricePerHour: 4 + Math.floor(Math.random() * 6),
        operator: operators[i % operators.length],
        accessType: "public",
        description: "Station de recharge rapide",
        services: {
          parking: true,
          wifi: Math.random() > 0.5,
        },
      });
    }
  });

  return stations;
}

// NEW: Get stations along a route corridor
app.post("/make-server-069560bb/stations/route", async (c) => {
  try {
    const body = await c.req.json();
    const { coordinates, radiusKm = 15 } = body;

    if (!coordinates || coordinates.length < 2) {
      return c.json({ error: "Au moins 2 coordonnées requises" }, 400);
    }

    // Calculate bounding box from route coordinates
    const lats = coordinates.map((coord: [number, number]) => coord[0]);
    const lons = coordinates.map((coord: [number, number]) => coord[1]);
    
    const minLat = Math.min(...lats) - (radiusKm / 111);
    const maxLat = Math.max(...lats) + (radiusKm / 111);
    const minLon = Math.min(...lons) - (radiusKm / 111);
    const maxLon = Math.max(...lons) + (radiusKm / 111);

    console.log(`Searching for stations in bounding box: [${minLat}, ${minLon}] to [${maxLat}, ${maxLon}]`);

    // Fetch stations from IRVE API with bounding box
    const apiUrl = "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/consolidation-etalab-schema-irve-statique-v-2-3-0/records";
    const params = new URLSearchParams();
    params.append("limit", "2000");
    params.append("where", `coordonneesxy IS NOT NULL AND consolidated_latitude >= ${minLat} AND consolidated_latitude <= ${maxLat} AND consolidated_longitude >= ${minLon} AND consolidated_longitude <= ${maxLon}`);

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.log("IRVE API error for route:", response.status, response.statusText);
      
      // Fallback: filter fallback stations
      const fallbackStations = generateFallbackStations();
      const filteredFallback = filterStationsAlongRoute(fallbackStations, coordinates, radiusKm, minLat, maxLat, minLon, maxLon);
      
      return c.json({ 
        stations: filteredFallback, 
        total: filteredFallback.length,
        fallback: true,
        boundingBox: { minLat, maxLat, minLon, maxLon }
      });
    }

    const data = await response.json();
    console.log(`Received ${data.results?.length || 0} stations from IRVE API for route`);
    
    // Transform IRVE data to our format
    const allStations = data.results?.map((item: any, index: number) => {
      const lat = parseFloat(item.coordonneesxy?.lat || item.consolidated_latitude || 0);
      const lon = parseFloat(item.coordonneesxy?.lon || item.consolidated_longitude || 0);
      
      return {
        id: item.id_pdc_itinerance || `irve-route-${index}`,
        name: item.nom_station || item.n_enseigne || "Borne de recharge",
        address: item.adresse_station || item.ad_station || "",
        city: item.commune || item.consolidated_commune || "",
        region: item.region || "",
        latitude: lat,
        longitude: lon,
        powerKw: parseFloat(item.puissance_nominale || item.pdc_puiss_max || 0),
        connectorTypes: item.type_prise ? [item.type_prise] : [],
        available: item.etat_pdc !== "hors-service",
        pricePerHour: parseFloat(item.tarification || 0) || 5,
        operator: item.nom_operateur || item.n_operateur || "Inconnu",
        accessType: item.acces_recharge || "public",
        description: item.observations || "",
        services: {
          parking: item.accessibilite_pmr === "TRUE",
          wifi: false,
        },
      };
    }) || [];

    // Filter stations along the route
    const routeStations = filterStationsAlongRoute(allStations, coordinates, radiusKm, minLat, maxLat, minLon, maxLon);

    console.log(`Found ${routeStations.length} stations along route (${allStations.length} total checked)`);

    return c.json({ 
      stations: routeStations, 
      total: routeStations.length,
      boundingBox: { minLat, maxLat, minLon, maxLon }
    });
  } catch (error: any) {
    console.log("Fetch route stations error:", error);
    
    // Fallback
    const fallbackStations = generateFallbackStations();
    return c.json({ 
      stations: fallbackStations.slice(0, 20), 
      total: 20,
      fallback: true 
    });
  }
});

// Helper function to filter stations along route
function filterStationsAlongRoute(
  allStations: any[],
  coordinates: [number, number][],
  radiusKm: number,
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number
): any[] {
  // Helper function to calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return allStations.filter((station: any) => {
    // Skip stations with invalid coordinates
    if (station.latitude === 0 || station.longitude === 0) return false;
    
    // Check if within bounding box
    if (station.latitude < minLat || station.latitude > maxLat ||
        station.longitude < minLon || station.longitude > maxLon) {
      return false;
    }

    // Check if within radiusKm of any point on the route
    for (const coord of coordinates) {
      const dist = calculateDistance(coord[0], coord[1], station.latitude, station.longitude);
      if (dist <= radiusKm) {
        return true;
      }
    }
    return false;
  });
}

// Search stations
app.post("/make-server-069560bb/stations/search", async (c) => {
  try {
    const body = await c.req.json();
    const { query, filters } = body;

    // For now, use the same endpoint with filters
    const params = new URLSearchParams();
    params.append("page_size", "100");
    
    if (query) {
      params.append("q", query);
    }
    if (filters?.region) {
      params.append("refine.region", filters.region);
    }
    if (filters?.minPower) {
      params.append("refine.puissance_nominale", `>=${filters.minPower}`);
    }

    const apiUrl = "https://data.gouv.fr/api/2/datasets/5d0e2e0a634f4164b3b8d837/resources/912f4a2e-3e99-4828-8e08-e676a4e69f64/data";
    const response = await fetch(`${apiUrl}?${params.toString()}`);
    
    if (!response.ok) {
      return c.json({ error: "Erreur lors de la recherche" }, 500);
    }

    const data = await response.json();
    const stations = data.data?.map((item: any, index: number) => ({
      id: item.id_pdc_itinerance || `irve-${index}`,
      name: item.nom_station || item.enseigne || "Borne de recharge",
      address: item.adresse_station || "",
      city: item.commune || "",
      region: item.region || "",
      latitude: parseFloat(item.coordonneesxy?.lat || item.latitude || 0),
      longitude: parseFloat(item.coordonneesxy?.lon || item.longitude || 0),
      powerKw: parseFloat(item.puissance_nominale || 0),
      connectorTypes: item.type_prise ? [item.type_prise] : [],
      available: item.etat_pdc !== "hors-service",
      pricePerHour: parseFloat(item.tarification || 0) || 5,
      operator: item.nom_operateur || "Inconnu",
    })) || [];

    return c.json({ stations });
  } catch (error: any) {
    console.log("Search stations error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GEOCODING ==========

// Geocode European cities using Nominatim
app.post("/make-server-069560bb/geocode", async (c) => {
  try {
    const body = await c.req.json();
    const { query } = body;

    if (!query) {
      return c.json({ error: "Query requise" }, 400);
    }

    // Use Nominatim API for European cities
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=fr,be,de,es,it,ch,nl,pt,at,lu&limit=10&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChargeShare/1.0'
      }
    });

    if (!response.ok) {
      return c.json({ error: "Erreur de géocodage" }, 500);
    }

    const data = await response.json();
    
    const results = data.map((item: any) => ({
      name: item.display_name,
      city: item.address?.city || item.address?.town || item.address?.village || "",
      country: item.address?.country || "",
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));

    return c.json({ results });
  } catch (error: any) {
    console.log("Geocode error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== CART ==========

// Get user cart
app.get("/make-server-069560bb/cart", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const cart = await kv.get(`cart:${user.id}`) || { items: [] };
    return c.json(cart);
  } catch (error: any) {
    console.log("Get cart error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Add to cart
app.post("/make-server-069560bb/cart", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const body = await c.req.json();
    const cart = await kv.get(`cart:${user.id}`) || { items: [] };
    
    cart.items.push({
      id: crypto.randomUUID(),
      ...body,
      addedAt: new Date().toISOString(),
    });

    await kv.set(`cart:${user.id}`, cart);
    return c.json(cart);
  } catch (error: any) {
    console.log("Add to cart error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Remove from cart
app.delete("/make-server-069560bb/cart/:itemId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { itemId } = c.req.param();
    const cart = await kv.get(`cart:${user.id}`) || { items: [] };
    
    cart.items = cart.items.filter((item: any) => item.id !== itemId);
    
    await kv.set(`cart:${user.id}`, cart);
    return c.json(cart);
  } catch (error: any) {
    console.log("Remove from cart error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Clear cart
app.delete("/make-server-069560bb/cart", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    await kv.set(`cart:${user.id}`, { items: [] });
    return c.json({ items: [] });
  } catch (error: any) {
    console.log("Clear cart error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== PAYMENT ==========

// Create payment intent (simplified - in production use Stripe)
app.post("/make-server-069560bb/payment/create-intent", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const body = await c.req.json();
    const { amount, currency = "EUR" } = body;

    // In production, integrate with Stripe here
    // For now, simulate payment intent creation
    const paymentIntent = {
      id: `pi_${crypto.randomUUID()}`,
      amount,
      currency,
      status: "requires_confirmation",
      created: new Date().toISOString(),
    };

    // Store payment intent
    await kv.set(`payment:${paymentIntent.id}`, {
      ...paymentIntent,
      userId: user.id,
    });

    return c.json({ paymentIntent });
  } catch (error: any) {
    console.log("Create payment intent error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Confirm payment
app.post("/make-server-069560bb/payment/confirm/:paymentId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { paymentId } = c.req.param();
    const payment = await kv.get(`payment:${paymentId}`);

    if (!payment) {
      return c.json({ error: "Paiement non trouvé" }, 404);
    }

    if (payment.userId !== user.id) {
      return c.json({ error: "Non autorisé" }, 403);
    }

    // Simulate payment confirmation
    payment.status = "succeeded";
    payment.confirmedAt = new Date().toISOString();
    
    await kv.set(`payment:${paymentId}`, payment);

    // Clear cart after successful payment
    await kv.set(`cart:${user.id}`, { items: [] });

    return c.json({ payment });
  } catch (error: any) {
    console.log("Confirm payment error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== RESERVATIONS ==========

// Create reservation
app.post("/make-server-069560bb/reservations", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const body = await c.req.json();
    const reservation = {
      id: crypto.randomUUID(),
      userId: user.id,
      ...body,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    await kv.set(`reservation:${reservation.id}`, reservation);

    // Add to user profile
    const profile = await kv.get(`user:${user.id}`);
    if (profile) {
      profile.reservations = profile.reservations || [];
      profile.reservations.push(reservation.id);
      await kv.set(`user:${user.id}`, profile);
    }

    return c.json(reservation);
  } catch (error: any) {
    console.log("Create reservation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get user reservations
app.get("/make-server-069560bb/reservations", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || !profile.reservations) {
      return c.json({ reservations: [] });
    }

    const reservations = await kv.mget(
      profile.reservations.map((id: string) => `reservation:${id}`)
    );

    return c.json({ reservations });
  } catch (error: any) {
    console.log("Get reservations error:", error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);