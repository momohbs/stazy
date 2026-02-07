import { Link } from "react-router";
import { Battery, MapPin, Home as HomeIcon, Coffee, Bed, Activity, Shield, Users, Leaf } from "lucide-react";
import { chargingStations } from "@/data/charging-stations";

export function Home() {
  const featuredStations = chargingStations.slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 to-green-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-6">
              Rechargez votre véhicule électrique partout en France
            </h1>
            <p className="text-xl text-green-50 mb-8">
              Partagez votre borne électrique ou trouvez un point de recharge chez l'habitant.
              Une expérience unique combinant mobilité durable et hospitalité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/map"
                className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                <MapPin className="size-5" />
                Trouver une borne
              </Link>
              <Link
                to="/host"
                className="bg-green-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-900 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Battery className="size-5" />
                Partager ma borne
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Pourquoi choisir Stazy ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="size-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Écologique</h3>
              <p className="text-gray-600">
                Participez à la transition énergétique en partageant ou utilisant des bornes existantes.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="size-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Communautaire</h3>
              <p className="text-gray-600">
                Rejoignez une communauté de voyageurs et d'hôtes engagés pour une mobilité durable.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="size-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Sécurisé</h3>
              <p className="text-gray-600">
                Profitez d'un système de paiement sécurisé et d'avis vérifiés pour voyager en toute confiance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Plus qu'une simple recharge
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl text-center shadow-sm">
              <Coffee className="size-10 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Petit-déjeuner</h3>
              <p className="text-sm text-gray-600">Produits locaux</p>
            </div>

            <div className="bg-white p-6 rounded-xl text-center shadow-sm">
              <HomeIcon className="size-10 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Restauration</h3>
              <p className="text-sm text-gray-600">Cuisine maison</p>
            </div>

            <div className="bg-white p-6 rounded-xl text-center shadow-sm">
              <Bed className="size-10 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Hébergement</h3>
              <p className="text-sm text-gray-600">Chambres d'hôtes</p>
            </div>

            <div className="bg-white p-6 rounded-xl text-center shadow-sm">
              <Activity className="size-10 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Activités</h3>
              <p className="text-sm text-gray-600">Découverte locale</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stations */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Bornes populaires</h2>
            <Link to="/map" className="text-green-600 hover:text-green-700 font-semibold">
              Voir toutes les bornes →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredStations.map((station) => (
              <Link
                key={station.id}
                to={`/station/${station.id}`}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={station.images[0]}
                    alt={station.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">{station.name}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">{station.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    {station.city}, {station.region}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Battery className="size-4 text-green-600" />
                      <span className="text-sm font-medium">{station.powerKw} kW</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{station.pricePerHour}€/h</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {station.services.breakfast && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        Petit-déj
                      </span>
                    )}
                    {station.services.accommodation && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Hébergement
                      </span>
                    )}
                    {station.services.wifi && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        WiFi
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-green-600 to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à partager votre borne ?</h2>
          <p className="text-xl text-green-50 mb-8">
            Gagnez un revenu complémentaire tout en contribuant à la mobilité électrique.
          </p>
          <Link
            to="/host"
            className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 transition-colors inline-flex items-center gap-2"
          >
            <Battery className="size-5" />
            Commencer maintenant
          </Link>
        </div>
      </section>
    </div>
  );
}
