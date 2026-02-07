import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router";
import L from "leaflet";
import "leaflet.markercluster";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Battery, MapPin, Navigation, Search, Filter, Star, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom green icon for available stations
const greenIcon = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNjA3IDAgMCA1LjYwNyAwIDEyLjVjMCA4LjMzMyAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIwLjgzMyAyNSAxMi41QzI1IDUuNjA3IDE5LjM5MyAwIDEyLjUgMHoiIGZpbGw9IiMxNmEzNGEiLz48Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Red icon for unavailable stations
const redIcon = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNjA3IDAgMCA1LjYwNyAwIDEyLjVjMCA4LjMzMyAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIwLjgzMyAyNSAxMi41QzI1IDUuNjA3IDE5LjM5MyAwIDEyLjUgMHoiIGZpbGw9IiNkYzI2MjYiLz48Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Yellow/gold icon for stations on route (highlighted)
const goldIcon = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDYiIHZpZXdCb3g9IjAgMCAzMCA0NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEM3LjI2OCA0IDEgNy4yNjggMSAxNWMwIDEwIDEzIDE1IDEzIDE1czE0IC01IDE0IC0xNWMwLTcuNzMyLTYuMjY4LTE0LTE0LTE0eiIgZmlsbD0iI2ZhYjMwZCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjE1IiByPSI3IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xMiA5aDN2Nmg0bC01LjUgN0wxOCAxNWg0di02aC0zVjZoLTN6IiBmaWxsPSIjZmFiMzBkIi8+PC9zdmc+",
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -40],
  className: 'station-on-route-marker'
});

// Blue icon for route waypoints
const blueIcon = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNjA3IDAgMCA1LjYwNyAwIDEyLjVjMCA4LjMzMyAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIwLjgzMyAyNSAxMi41QzI1IDUuNjA3IDE5LjM5MyAwIDEyLjUgMHoiIGZpbGw9IiMzYjgyZjYiLz48Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface RouteCalculatorProps {
  onCalculateRoute: (start: string, end: string, options: RouteOptions) => void;
  isCalculating: boolean;
}

interface RouteOptions {
  avoidTolls: boolean;
  avoidHighways: boolean;
}

function RouteCalculator({ onCalculateRoute, isCalculating }: RouteCalculatorProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (start && end) {
      onCalculateRoute(start, end, { avoidTolls, avoidHighways });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <Navigation className="size-5 text-green-600" />
        Calculer un itinéraire
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Point de départ
          </label>
          <input
            type="text"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="Ex: Paris"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination
          </label>
          <input
            type="text"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="Ex: Nice"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        {/* Route Options */}
        <div className="space-y-2 pt-2 border-t">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options d'itinéraire
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="avoidTolls"
              checked={avoidTolls}
              onChange={(e) => setAvoidTolls(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <label htmlFor="avoidTolls" className="text-sm text-gray-700">
              Éviter les péages
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="avoidHighways"
              checked={avoidHighways}
              onChange={(e) => setAvoidHighways(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <label htmlFor="avoidHighways" className="text-sm text-gray-700">
              Éviter les autoroutes
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isCalculating}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCalculating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Calcul en cours...
            </>
          ) : (
            "Rechercher"
          )}
        </button>
      </form>
    </div>
  );
}

interface FilterPanelProps {
  filters: {
    availableOnly: boolean;
    minPower: number;
    maxPrice: number;
    services: string[];
  };
  onFiltersChange: (filters: any) => void;
}

function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <Filter className="size-5 text-green-600" />
        Filtres
      </h3>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="available"
            checked={filters.availableOnly}
            onChange={(e) =>
              onFiltersChange({ ...filters, availableOnly: e.target.checked })
            }
            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
          />
          <label htmlFor="available" className="text-sm text-gray-700">
            Disponibles uniquement
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Puissance minimum: {filters.minPower} kW
          </label>
          <input
            type="range"
            min="0"
            max="22"
            step="1"
            value={filters.minPower}
            onChange={(e) =>
              onFiltersChange({ ...filters, minPower: parseInt(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix maximum: {filters.maxPrice}€/h
          </label>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={filters.maxPrice}
            onChange={(e) =>
              onFiltersChange({ ...filters, maxPrice: parseInt(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
          <div className="space-y-2">
            {["breakfast", "accommodation", "restaurant", "wifi"].map((service) => (
              <div key={service} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={service}
                  checked={filters.services.includes(service)}
                  onChange={(e) => {
                    const newServices = e.target.checked
                      ? [...filters.services, service]
                      : filters.services.filter((s) => s !== service);
                    onFiltersChange({ ...filters, services: newServices });
                  }}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor={service} className="text-sm text-gray-700 capitalize">
                  {service === "breakfast"
                    ? "Petit-déjeuner"
                    : service === "accommodation"
                    ? "Hébergement"
                    : service === "restaurant"
                    ? "Restaurant"
                    : service === "wifi"
                    ? "WiFi"
                    : service}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);

  const [chargingStations, setChargingStations] = useState<any[]>([]);
  const [totalStations, setTotalStations] = useState(0);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ 
    start: string; 
    end: string;
    distance?: number;
    duration?: number;
    stationsOnRoute?: number;
  } | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [stationsOnRoute, setStationsOnRoute] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    availableOnly: false,
    minPower: 0,
    maxPrice: 20,
    services: [] as string[],
  });

  // Fetch real charging stations from API - load all stations progressively
  useEffect(() => {
    fetchAllStations();
  }, []);

  const fetchAllStations = async () => {
    setLoadingStations(true);
    try {
      let allStations: any[] = [];
      let offset = 0;
      const limit = 5000;
      let hasMore = true;

      // First request to get total count
      toast.info("Chargement des bornes réelles de France...");

      while (hasMore) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-069560bb/stations?limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des bornes");
        }

        const data = await response.json();
        
        // Filter out stations without valid coordinates
        const validStations = data.stations.filter(
          (station: any) => station.latitude !== 0 && station.longitude !== 0
        );
        
        allStations = [...allStations, ...validStations];
        
        // Update progress
        if (data.total) {
          setTotalStations(data.total);
          const progress = Math.min(100, Math.round((allStations.length / data.total) * 100));
          setLoadingProgress(progress);
        }

        hasMore = data.hasMore && allStations.length < 100000; // Safety limit
        offset += limit;

        // Update stations progressively for better UX
        setChargingStations([...allStations]);

        if (data.fallback) {
          hasMore = false; // Don't loop on fallback data
        }
      }

      if (allStations.length > 0) {
        toast.success(`✅ ${allStations.length.toLocaleString()} bornes réelles chargées depuis la base IRVE nationale`);
      }
    } catch (error: any) {
      console.error("Error fetching stations:", error);
      toast.error("Erreur lors du chargement des bornes");
    } finally {
      setLoadingStations(false);
      setLoadingProgress(100);
    }
  };

  const filteredStations = useMemo(() => {
    return chargingStations.filter((station) => {
      const matchesSearch =
        searchQuery === "" ||
        station.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.region?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAvailability = !filters.availableOnly || station.available;
      const matchesPower = station.powerKw >= filters.minPower;
      const matchesPrice = (station.pricePerHour || 5) <= filters.maxPrice;

      return (
        matchesSearch &&
        matchesAvailability &&
        matchesPower &&
        matchesPrice
      );
    });
  }, [chargingStations, searchQuery, filters]);

  // Geocode a city name to coordinates
  const geocodeCity = async (cityName: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)},France&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  // Calculate distance between two points (Haversine formula)
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

  // Find stations along a polyline route
  const findStationsAlongPolyline = (
    routeCoords: [number, number][],
    maxDistance: number = 10 // km from the route
  ): any[] => {
    return chargingStations.filter((station) => {
      // Check if station is within maxDistance of any point on the route
      for (const coord of routeCoords) {
        const dist = calculateDistance(
          coord[0],
          coord[1],
          station.latitude,
          station.longitude
        );
        if (dist <= maxDistance) {
          return true;
        }
      }
      return false;
    });
  };

  const handleCalculateRoute = async (start: string, end: string, options: RouteOptions) => {
    setIsCalculatingRoute(true);
    
    try {
      // Geocode start and end locations
      toast.info(`Recherche de "${start}"...`);
      const startCoords = await geocodeCity(start);
      
      if (!startCoords) {
        toast.error(`Impossible de trouver "${start}"`);
        setIsCalculatingRoute(false);
        return;
      }

      toast.info(`Recherche de "${end}"...`);
      const endCoords = await geocodeCity(end);
      
      if (!endCoords) {
        toast.error(`Impossible de trouver "${end}"`);
        setIsCalculatingRoute(false);
        return;
      }

      // Clear previous route
      if (routeLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
      }
      routeMarkersRef.current.forEach((marker) => marker.remove());
      routeMarkersRef.current = [];

      toast.info("Calcul de l'itinéraire réel...");

      // Use OSRM to get real route
      // OSRM uses lon,lat format (not lat,lon!)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson&steps=true`;
      
      const routeResponse = await fetch(osrmUrl);
      const routeData = await routeResponse.json();

      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error("Aucun itinéraire trouvé");
      }

      const route = routeData.routes[0];
      const coordinates = route.geometry.coordinates;
      
      // Convert coordinates from [lon, lat] to [lat, lon] for Leaflet
      const latLngs: [number, number][] = coordinates.map((coord: number[]) => [coord[1], coord[0]]);

      // Draw route line on map
      if (mapInstanceRef.current) {
        const routeLine = L.polyline(latLngs, {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.7,
        }).addTo(mapInstanceRef.current);
        
        routeLayerRef.current = routeLine;

        // Add start marker
        const startMarker = L.marker(startCoords, { icon: blueIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<strong>Départ</strong><br/>${start}`);
        
        // Add end marker
        const endMarker = L.marker(endCoords, { icon: blueIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<strong>Arrivée</strong><br/>${end}`);
        
        routeMarkersRef.current.push(startMarker, endMarker);

        // Fit map to show entire route
        mapInstanceRef.current.fitBounds(routeLine.getBounds(), {
          padding: [50, 50],
        });
      }

      // Get distance and duration from OSRM
      const distance = Math.round(route.distance / 1000); // Convert meters to km
      const duration = Math.round(route.duration / 60); // Convert seconds to minutes

      // Fetch real charging stations along the route from backend
      toast.info("Recherche des bornes réelles le long du trajet...");
      
      const stationsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-069560bb/stations/route`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: latLngs,
            radiusKm: 15, // 15km radius from route
          }),
        }
      );

      if (!stationsResponse.ok) {
        throw new Error("Erreur lors de la récupération des bornes");
      }

      const stationsData = await stationsResponse.json();
      const routeStations = stationsData.stations || [];

      setRouteInfo({
        start,
        end,
        distance,
        duration,
        stationsOnRoute: routeStations.length,
      });

      setStationsOnRoute(routeStations);

      let optionsText = "";
      if (options.avoidTolls || options.avoidHighways) {
        optionsText = " (options: ";
        if (options.avoidTolls) optionsText += "sans péage ";
        if (options.avoidHighways) optionsText += "sans autoroute";
        optionsText += ")";
      }

      toast.success(`Itinéraire calculé : ${distance} km, ${routeStations.length} bornes réelles trouvées${optionsText}`);
    } catch (error: any) {
      console.error("Route calculation error:", error);
      toast.error("Erreur lors du calcul de l'itinéraire");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleClearRoute = () => {
    // Clear route from map
    if (routeLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    
    // Clear route markers
    routeMarkersRef.current.forEach((marker) => marker.remove());
    routeMarkersRef.current = [];
    
    // Clear route info and stations on route
    setRouteInfo(null);
    setStationsOnRoute([]);
    
    // Reset map view to France
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([46.603354, 1.888334], 6);
    }
    
    toast.info("Itinéraire effacé");
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([46.603354, 1.888334], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when filtered stations change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Create a Set of station IDs that are on the route for quick lookup
    const stationIdsOnRoute = new Set(stationsOnRoute.map(s => s.id));

    // Add new markers
    filteredStations.forEach((station) => {
      const isOnRoute = stationIdsOnRoute.has(station.id);
      
      // Choose icon based on route status and availability
      let icon;
      if (isOnRoute) {
        icon = goldIcon; // Gold/yellow icon for stations on route
      } else {
        icon = station.available ? greenIcon : redIcon;
      }

      const marker = L.marker([station.latitude, station.longitude], {
        icon: icon,
      });

      const onRouteBadge = isOnRoute 
        ? '<div style="background-color: #fab30d; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem;">⚡ Sur votre itinéraire</div>'
        : '';

      const popupContent = `
        <div style="min-width: 200px;">
          ${onRouteBadge}
          <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.25rem;">${station.name}</h3>
          <p style="font-size: 0.875rem; color: #4b5563; margin-bottom: 0.5rem;">${station.city}</p>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 0.875rem;">${station.powerKw} kW</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <span style="font-size: 0.875rem; font-weight: 600; color: #16a34a;">${station.pricePerHour || 5}€/h</span>
            ${station.operator ? `<span style="font-size: 0.75rem; color: #6b7280;">${station.operator}</span>` : ''}
          </div>
          <a href="/station/${station.id}" style="display: block; text-align: center; background-color: #16a34a; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; text-decoration: none; font-size: 0.875rem; font-weight: 500;">
            Voir les détails
          </a>\n        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => setSelectedStation(station.id));
      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });
  }, [filteredStations, stationsOnRoute]);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-96 bg-gray-50 overflow-y-auto p-4 border-r">
          {/* Loading State */}
          {loadingStations && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3">
              <Loader2 className="size-5 text-green-600 animate-spin" />
              <span className="text-green-900 font-medium">
                Chargement des bornes réelles...
              </span>
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
              <input
                type="text"
                placeholder="Rechercher une ville, région..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Route Calculator */}
          <RouteCalculator onCalculateRoute={handleCalculateRoute} isCalculating={isCalculatingRoute} />

          {/* Filters */}
          <FilterPanel filters={filters} onFiltersChange={setFilters} />

          {/* Route Info */}
          {routeInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-green-900 mb-2">Itinéraire calculé</h3>
              <p className="text-sm text-green-800">
                De <strong>{routeInfo.start}</strong> à <strong>{routeInfo.end}</strong>
              </p>
              <p className="text-sm text-green-700 mt-2">
                {routeInfo.distance} km, {routeInfo.duration} min
              </p>
              <p className="text-sm text-green-700 mt-2">
                {routeInfo.stationsOnRoute} borne(s) sur votre trajet
              </p>
              <button
                className="mt-2 bg-red-500 text-white py-1 px-2 rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
                onClick={handleClearRoute}
              >
                <X className="size-4" />
                Effacer
              </button>
            </div>
          )}

          {/* Stations on Route Section */}
          {stationsOnRoute.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <Battery className="size-5 text-yellow-600" />
                Bornes sur votre itinéraire ({stationsOnRoute.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stationsOnRoute.slice(0, 10).map((station) => (
                  <div
                    key={station.id}
                    className="bg-white rounded-lg p-3 cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => {
                      setSelectedStation(station.id);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([station.latitude, station.longitude], 13);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-sm text-gray-900">{station.name}</h4>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">⚡</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{station.city}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">{station.powerKw} kW</span>
                      <span className="text-xs font-semibold text-green-600">{station.pricePerHour || 5}€/h</span>
                    </div>
                  </div>
                ))}
                {stationsOnRoute.length > 10 && (
                  <p className="text-xs text-center text-yellow-700 pt-2">
                    +{stationsOnRoute.length - 10} bornes supplémentaires sur la carte
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="mt-4 mb-2">
            <p className="text-sm text-gray-600">
              {filteredStations.length} borne(s) trouvée(s)
            </p>
          </div>

          {/* Station List */}
          <div className="space-y-3 mt-4">
            {filteredStations.map((station) => (
              <div
                key={station.id}
                className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedStation === station.id ? "ring-2 ring-green-500" : ""
                }`}
                onClick={() => setSelectedStation(station.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{station.name}</h3>
                  {station.operator && (
                    <span className="text-xs text-gray-500">{station.operator}</span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  {station.city}{station.region ? `, ${station.region}` : ''}
                </p>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Battery className="size-4 text-green-600" />
                    <span className="text-sm">{station.powerKw} kW</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {station.pricePerHour || 5}€/h
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      station.available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {station.available ? "Disponible" : "Occupée"}
                  </span>
                  {station.connectorTypes?.map((type: string) => (
                    <span
                      key={type}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {type}
                    </span>
                  ))}
                </div>

                <Link
                  to={`/station/${station.id}`}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Voir les détails →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="h-full w-full" />

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
            <h4 className="font-semibold text-sm mb-2">Légende</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Sur itinéraire</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                <span className="text-sm text-gray-700">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                <span className="text-sm text-gray-700">Occupée</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500">
                Données IRVE officielles
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}