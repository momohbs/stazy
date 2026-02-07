import { useState } from "react";
import { Battery, Upload, Plus, Trash2, DollarSign } from "lucide-react";

export function HostDashboard() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    region: "",
    description: "",
    pricePerHour: "",
    powerKw: "",
    connectorTypes: [] as string[],
    breakfast: false,
    restaurant: false,
    accommodation: false,
    wifi: false,
    parking: false,
    activities: "",
  });

  const connectorOptions = ["Type 2", "CCS", "CHAdeMO", "Tesla"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send data to a backend
    console.log("Form submitted:", formData);
    alert("Votre borne a été ajoutée avec succès ! (Démo uniquement)");
  };

  const toggleConnector = (connector: string) => {
    setFormData((prev) => ({
      ...prev,
      connectorTypes: prev.connectorTypes.includes(connector)
        ? prev.connectorTypes.filter((c) => c !== connector)
        : [...prev.connectorTypes, connector],
    }));
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Battery className="size-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Partagez votre borne électrique
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Gagnez un revenu complémentaire en partageant votre borne de recharge avec des
            voyageurs. C'est simple, rapide et sécurisé.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="size-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Revenu supplémentaire</h3>
            <p className="text-sm text-gray-600">
              Rentabilisez votre investissement en partageant votre borne
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Battery className="size-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Simple à gérer</h3>
            <p className="text-sm text-gray-600">
              Gérez vos disponibilités et tarifs en quelques clics
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="size-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Services additionnels</h3>
            <p className="text-sm text-gray-600">
              Proposez hébergement, restauration et activités
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Ajouter votre borne</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Informations de base</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de votre lieu *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Villa Les Pins"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="23 Avenue de la Côte d'Azur"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Nice"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Région *
                  </label>
                  <select
                    required
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une région</option>
                    <option value="Auvergne-Rhône-Alpes">Auvergne-Rhône-Alpes</option>
                    <option value="Bourgogne-Franche-Comté">Bourgogne-Franche-Comté</option>
                    <option value="Bretagne">Bretagne</option>
                    <option value="Centre-Val de Loire">Centre-Val de Loire</option>
                    <option value="Corse">Corse</option>
                    <option value="Grand Est">Grand Est</option>
                    <option value="Hauts-de-France">Hauts-de-France</option>
                    <option value="Île-de-France">Île-de-France</option>
                    <option value="Normandie">Normandie</option>
                    <option value="Nouvelle-Aquitaine">Nouvelle-Aquitaine</option>
                    <option value="Occitanie">Occitanie</option>
                    <option value="Pays de la Loire">Pays de la Loire</option>
                    <option value="Provence-Alpes-Côte d'Azur">
                      Provence-Alpes-Côte d'Azur
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez votre lieu et ce qui le rend unique..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Charging Station Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Détails de la borne</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puissance (kW) *
                  </label>
                  <select
                    required
                    value={formData.powerKw}
                    onChange={(e) => setFormData({ ...formData, powerKw: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    <option value="3.7">3.7 kW (Prise domestique)</option>
                    <option value="7">7 kW (Recharge lente)</option>
                    <option value="11">11 kW (Recharge normale)</option>
                    <option value="22">22 kW (Recharge rapide)</option>
                    <option value="50">50 kW (Recharge ultra-rapide)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarif par heure (€) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.5"
                    value={formData.pricePerHour}
                    onChange={(e) =>
                      setFormData({ ...formData, pricePerHour: e.target.value })
                    }
                    placeholder="8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Types de connecteurs *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {connectorOptions.map((connector) => (
                    <button
                      key={connector}
                      type="button"
                      onClick={() => toggleConnector(connector)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        formData.connectorTypes.includes(connector)
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {connector}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Services proposés</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.breakfast}
                    onChange={(e) =>
                      setFormData({ ...formData, breakfast: e.target.checked })
                    }
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium">Petit-déjeuner</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.restaurant}
                    onChange={(e) =>
                      setFormData({ ...formData, restaurant: e.target.checked })
                    }
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium">Restaurant</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.accommodation}
                    onChange={(e) =>
                      setFormData({ ...formData, accommodation: e.target.checked })
                    }
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium">Hébergement</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.wifi}
                    onChange={(e) => setFormData({ ...formData, wifi: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium">WiFi</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.parking}
                    onChange={(e) => setFormData({ ...formData, parking: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium">Parking</span>
                </label>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activités disponibles (séparées par des virgules)
                </label>
                <input
                  type="text"
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  placeholder="Ex: Randonnée, Vélo, Kayak"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Photos */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Photos</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 transition-colors cursor-pointer">
                <Upload className="size-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">
                  Cliquez pour télécharger ou glissez-déposez
                </p>
                <p className="text-sm text-gray-500">PNG, JPG jusqu'à 10MB</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold hover:bg-green-700 transition-colors text-lg"
              >
                Publier ma borne
              </button>
              <p className="text-sm text-gray-500 text-center mt-3">
                En publiant, vous acceptez nos conditions d'utilisation
              </p>
            </div>
          </form>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Combien puis-je gagner en partageant ma borne ?
              </h3>
              <p className="text-gray-600">
                Vos revenus dépendent de votre tarif et de la fréquentation. En moyenne, les
                hôtes gagnent entre 100€ et 500€ par mois selon la localisation et les services
                proposés.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Suis-je couvert en cas de problème ?
              </h3>
              <p className="text-gray-600">
                Oui, Stazy propose une assurance complète couvrant les dommages
                matériels et la responsabilité civile pendant toute la durée de location.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Puis-je refuser une réservation ?
              </h3>
              <p className="text-gray-600">
                Oui, vous restez maître de vos disponibilités. Vous pouvez accepter ou refuser
                les réservations et bloquer des dates selon vos besoins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
