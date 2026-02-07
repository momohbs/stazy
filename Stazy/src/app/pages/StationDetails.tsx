import { useParams, Link, useNavigate } from "react-router";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { chargingStations, ChargingStation } from "@/data/charging-stations";
import {
  Battery,
  MapPin,
  Star,
  Wifi,
  Coffee,
  Bed,
  UtensilsCrossed,
  Zap,
  Clock,
  Shield,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationMapProps {
  station: ChargingStation;
}

function LocationMap({ station }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(
      [station.latitude, station.longitude],
      13
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.marker([station.latitude, station.longitude])
      .addTo(map)
      .bindPopup(station.name)
      .openPopup();

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [station]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Localisation</h2>
      <p className="text-gray-600 mb-4">{station.address}</p>
      <div ref={mapRef} className="h-64 rounded-lg overflow-hidden" />
    </div>
  );
}

export function StationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const station = chargingStations.find((s) => s.id === id);

  if (!station) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Borne non trouvée</h2>
        <Link to="/map" className="text-green-600 hover:text-green-700">
          Retour à la carte
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header with back button */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="size-5" />
            Retour
          </button>
        </div>
      </div>

      {/* Images Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="aspect-[4/3] rounded-xl overflow-hidden">
            <img
              src={station.images[0]}
              alt={station.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-200">
                <img
                  src={station.images[0]}
                  alt={`${station.name} ${i + 2}`}
                  className="w-full h-full object-cover opacity-80"
                />
              </div>
            ))}
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 font-medium">+Plus de photos</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Rating */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{station.name}</h1>
                <div
                  className={`px-3 py-1 rounded-lg ${
                    station.available
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {station.available ? "Disponible" : "Occupée"}
                </div>
              </div>

              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="size-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-gray-900">{station.rating}</span>
                  <span>({station.reviewCount} avis)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="size-5" />
                  <span>
                    {station.city}, {station.region}
                  </span>
                </div>
              </div>
            </div>

            {/* Host Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {station.hostName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Hôte: {station.hostName}</h3>
                  <p className="text-gray-600">Membre depuis 2024</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed">{station.description}</p>
            </div>

            {/* Charging Details */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Détails de la borne</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Battery className="size-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Puissance</p>
                    <p className="font-semibold">{station.powerKw} kW</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Zap className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Type de connecteur</p>
                    <p className="font-semibold">{station.connectorTypes.join(", ")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Clock className="size-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tarif</p>
                    <p className="font-semibold">{station.pricePerHour}€/heure</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Shield className="size-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paiement</p>
                    <p className="font-semibold">Sécurisé</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Services proposés</h2>
              <div className="grid grid-cols-2 gap-4">
                {station.services.breakfast && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <Coffee className="size-6 text-orange-600" />
                    <span className="font-medium">Petit-déjeuner</span>
                  </div>
                )}
                {station.services.restaurant && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <UtensilsCrossed className="size-6 text-red-600" />
                    <span className="font-medium">Restaurant</span>
                  </div>
                )}
                {station.services.accommodation && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Bed className="size-6 text-blue-600" />
                    <span className="font-medium">Hébergement</span>
                  </div>
                )}
                {station.services.wifi && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Wifi className="size-6 text-purple-600" />
                    <span className="font-medium">WiFi gratuit</span>
                  </div>
                )}
              </div>

              {station.services.activities && station.services.activities.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Activités disponibles</h3>
                  <div className="flex flex-wrap gap-2">
                    {station.services.activities.map((activity) => (
                      <span
                        key={activity}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Amenities */}
            {station.amenities.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Équipements</h2>
                <div className="flex flex-wrap gap-2">
                  {station.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location Map */}
            <LocationMap station={station} />
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-20">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-green-600">
                    {station.pricePerHour}€
                  </span>
                  <span className="text-gray-600">/heure</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="size-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{station.rating}</span>
                  <span className="text-gray-600">({station.reviewCount} avis)</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de réservation
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure d'arrivée
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée (heures)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    defaultValue="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  station.available
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={!station.available}
              >
                {station.available ? "Réserver maintenant" : "Non disponible"}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Vous ne serez pas débité pour le moment
              </p>

              <div className="border-t mt-6 pt-6">
                <h3 className="font-semibold mb-3">Informations importantes</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Annulation gratuite jusqu'à 24h avant</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Paiement sécurisé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Confirmation instantanée</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}