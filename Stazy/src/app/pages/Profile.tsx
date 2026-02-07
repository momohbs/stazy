import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/app/contexts/AuthContext";
import { projectId } from "/utils/supabase/info";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { User, LogOut, ShoppingCart, Calendar, MapPin, Battery } from "lucide-react";
import { toast } from "sonner";

interface Reservation {
  id: string;
  stationName: string;
  date: string;
  status: string;
  amount: number;
}

export function Profile() {
  const navigate = useNavigate();
  const { user, accessToken, signOut, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (accessToken) {
      fetchReservations();
    }
  }, [accessToken]);

  const fetchReservations = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-069560bb/reservations`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReservations(data.reservations || []);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="size-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Vos informations de compte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarFallback className="text-2xl bg-green-600 text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{user.name}</h2>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/cart">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <ShoppingCart className="size-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Panier</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Calendar className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Réservations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reservations.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link to="/map">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <MapPin className="size-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bornes</p>
                      <p className="text-2xl font-bold text-gray-900">Explorer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mes réservations</CardTitle>
              <CardDescription>Historique de vos réservations</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReservations ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-8">
                  <Battery className="size-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Aucune réservation pour le moment</p>
                  <Link to="/map">
                    <Button>Trouver une borne</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {reservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded">
                          <Battery className="size-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {reservation.stationName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(reservation.date).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={reservation.status === "confirmed" ? "default" : "secondary"}>
                          {reservation.status}
                        </Badge>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {reservation.amount}€
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
