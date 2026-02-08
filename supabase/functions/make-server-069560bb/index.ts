import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.ts";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('PROJECT_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? '',
);

const parseName = (name: string | null | undefined) => {
  const safeName = (name || "").trim();
  const parts = safeName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || null;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return {
    firstName,
    lastName,
    fullName: safeName || null,
  };
};

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
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== AUTHENTICATION ==========

// Sign up endpoint
app.post("/auth/signup", async (c) => {
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

    const { firstName, lastName, fullName } = parseName(name);
    const { error: clientError } = await supabase.from("clients").insert({
      id: data.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName || name,
    });

    if (clientError) {
      console.log("Create client error:", clientError);
      return c.json({ error: "Erreur lors de la création du profil" }, 500);
    }

    return c.json({ success: true, user: data.user });
  } catch (error: any) {
    console.log("Signup error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get user profile
app.get("/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id,email,first_name,last_name,full_name,created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (clientError) {
      console.log("Get client error:", clientError);
      return c.json({ error: "Erreur lors du chargement du profil" }, 500);
    }

    if (!client) {
      const fallbackName =
        (user.user_metadata?.name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        "";
      const { firstName, lastName, fullName } = parseName(fallbackName);

      const { data: createdClient, error: createError } = await supabase
        .from("clients")
        .insert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName || fallbackName,
        })
        .select("id,email,first_name,last_name,full_name,created_at")
        .single();

      if (createError) {
        console.log("Create client fallback error:", createError);
        return c.json({ error: "Erreur lors du chargement du profil" }, 500);
      }

      return c.json({
        id: createdClient.id,
        email: createdClient.email,
        name: createdClient.full_name || createdClient.email,
        firstName: createdClient.first_name,
        lastName: createdClient.last_name,
      });
    }

    return c.json({
      id: client.id,
      email: client.email,
      name: client.full_name || client.email,
      firstName: client.first_name,
      lastName: client.last_name,
    });
  } catch (error: any) {
    console.log("Get profile error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update user profile
app.put("/profile", async (c) => {
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
    const fullName = body.name || body.fullName;
    const firstName = body.firstName;
    const lastName = body.lastName;

    const finalName = typeof fullName === "string" ? fullName : "";
    const parsed = parseName(finalName);

    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update({
        first_name: firstName ?? parsed.firstName,
        last_name: lastName ?? parsed.lastName,
        full_name: finalName || parsed.fullName,
      })
      .eq("id", user.id)
      .select("id,email,first_name,last_name,full_name")
      .single();

    if (updateError) {
      console.log("Update client error:", updateError);
      return c.json({ error: "Erreur lors de la mise à jour du profil" }, 500);
    }

    return c.json({
      id: updatedClient.id,
      email: updatedClient.email,
      name: updatedClient.full_name || updatedClient.email,
      firstName: updatedClient.first_name,
      lastName: updatedClient.last_name,
    });
  } catch (error: any) {
    console.log("Update profile error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== CHARGING STATIONS ==========

// Fetch real charging stations from French government API
app.get("/stations", async (c) => {
  try {
    const { limit = "5000", offset = "0", region, city } = c.req.query();
    const limitNum = Math.min(Number(limit) || 1000, 5000);
    const offsetNum = Math.max(Number(offset) || 0, 0);

    let query = supabase
      .from("stations_irve")
      .select(
        "id,name,address,city,region,latitude,longitude,power_kw,connector_types,available,price_per_hour,operator,access_type,description",
        { count: "exact" }
      )
      .range(offsetNum, offsetNum + limitNum - 1);

    if (region) query = query.eq("region", region);
    if (city) query = query.eq("city", city);

    const { data: stationsData, error, count } = await query;
    if (error) {
      console.log("DB stations error:", error);
      return c.json({ stations: generateFallbackStations(), total: 100, fallback: true });
    }

    const stations = (stationsData || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      address: item.address || "",
      city: item.city || "",
      region: item.region || "",
      latitude: item.latitude,
      longitude: item.longitude,
      powerKw: item.power_kw || 0,
      connectorTypes: item.connector_types || [],
      available: item.available,
      pricePerHour: item.price_per_hour || 5,
      operator: item.operator || "Inconnu",
      accessType: item.access_type || "public",
      description: item.description || "",
      services: {
        parking: false,
        wifi: false,
      },
    }));

    return c.json({ stations, total: count || stations.length });
  } catch (error: any) {
    console.log("Fetch stations error:", error);
    return c.json({ stations: generateFallbackStations(), total: 100, fallback: true });
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
app.post("/stations/route", async (c) => {
  try {
    const body = await c.req.json();
    const { coordinates, radiusKm = 15, limit = 500 } = body;

    if (!coordinates || coordinates.length < 2) {
      return c.json({ error: "Au moins 2 coordonnées requises" }, 400);
    }

    const routeWkt = `LINESTRING(${coordinates
      .map((c: [number, number]) => `${c[1]} ${c[0]}`)
      .join(",")})`;

    const radiusMeters = Math.max(Number(radiusKm) || 15, 1) * 1000;
    const limitNum = Math.min(Number(limit) || 500, 2000);

    const { data: stationsData, error } = await supabase.rpc(
      "stations_near_route",
      {
        route_wkt: routeWkt,
        radius_m: radiusMeters,
        limit_n: limitNum,
      }
    );

    if (error) {
      console.log("DB route stations error:", error);
      const fallbackStations = generateFallbackStations();
      return c.json({
        stations: fallbackStations.slice(0, 20),
        total: 20,
        fallback: true,
      });
    }

    const stations = (stationsData || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      address: item.address || "",
      city: item.city || "",
      region: item.region || "",
      latitude: item.latitude,
      longitude: item.longitude,
      powerKw: item.power_kw || 0,
      connectorTypes: item.connector_types || [],
      available: item.available,
      pricePerHour: item.price_per_hour || 5,
      operator: item.operator || "Inconnu",
      accessType: item.access_type || "public",
      description: item.description || "",
      services: {
        parking: false,
        wifi: false,
      },
    }));

    return c.json({
      stations,
      total: stations.length,
    });
  } catch (error: any) {
    console.log("Fetch route stations error:", error);

    // Fallback
    const fallbackStations = generateFallbackStations();
    return c.json({
      stations: fallbackStations.slice(0, 20),
      total: 20,
      fallback: true,
    });
  }
});


// Search stations
app.post("/stations/search", async (c) => {
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
app.post("/geocode", async (c) => {
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
        'User-Agent': 'Stazy/1.0'
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
app.get("/cart", async (c) => {
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
app.post("/cart", async (c) => {
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
app.delete("/cart/:itemId", async (c) => {
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
app.delete("/cart", async (c) => {
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
app.post("/payment/create-intent", async (c) => {
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
app.post("/payment/confirm/:paymentId", async (c) => {
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
app.post("/reservations", async (c) => {
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
    const stationId = body.stationId ?? null;
    const stationName = body.stationName;
    const date = body.date;
    const hours = Number(body.hours) || null;
    const amount = Number(body.amount) || 0;

    if (!stationName) {
      return c.json({ error: "Nom de station requis" }, 400);
    }

    const startTime = date ? new Date(date) : null;
    const endTime =
      startTime && hours ? new Date(startTime.getTime() + hours * 60 * 60 * 1000) : null;

    const { data: createdReservation, error: createError } = await supabase
      .from("reservations")
      .insert({
        client_id: user.id,
        station_id: stationId,
        station_name: stationName,
        start_time: startTime?.toISOString() || null,
        end_time: endTime?.toISOString() || null,
        duration_hours: hours,
        amount,
        status: "confirmed",
      })
      .select("id,station_name,start_time,status,amount")
      .single();

    if (createError) {
      console.log("Create reservation error:", createError);
      return c.json({ error: "Erreur lors de la création de la réservation" }, 500);
    }

    return c.json({
      id: createdReservation.id,
      stationName: createdReservation.station_name,
      date: createdReservation.start_time,
      status: createdReservation.status,
      amount: createdReservation.amount,
    });
  } catch (error: any) {
    console.log("Create reservation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get user reservations
app.get("/reservations", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const { data: reservations, error: listError } = await supabase
      .from("reservations")
      .select("id,station_name,start_time,status,amount")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (listError) {
      console.log("Get reservations error:", listError);
      return c.json({ error: "Erreur lors du chargement des réservations" }, 500);
    }

    return c.json({
      reservations: (reservations || []).map((r) => ({
        id: r.id,
        stationName: r.station_name,
        date: r.start_time,
        status: r.status,
        amount: r.amount,
      })),
    });
  } catch (error: any) {
    console.log("Get reservations error:", error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
