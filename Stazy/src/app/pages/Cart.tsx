import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/app/contexts/AuthContext";
import { projectId } from "/utils/supabase/info";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Battery, Trash2, ShoppingCart, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  stationId: string;
  stationName: string;
  city: string;
  date: string;
  hours: number;
  pricePerHour: number;
  powerKw: number;
  addedAt: string;
}

export function Cart() {
  const navigate = useNavigate();
  const { user, accessToken, loading } = useAuth();
  const [cart, setCart] = useState<{ items: CartItem[] }>({ items: [] });
  const [loadingCart, setLoadingCart] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (accessToken) {
      fetchCart();
    }
  }, [accessToken]);

  const fetchCart = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-069560bb/cart`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Erreur lors du chargement du panier");
    } finally {
      setLoadingCart(false);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-069560bb/cart/${itemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCart(data);
        toast.success("Article supprimé du panier");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const calculateTotal = () => {
    return cart.items.reduce((total, item) => {
      return total + item.pricePerHour * item.hours;
    }, 0);
  };

  const handleCheckout = async () => {
    setProcessingPayment(true);

    try {
      const total = calculateTotal();

      // Create payment intent
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-069560bb/payment/create-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            amount: total * 100, // Convert to cents
            currency: "EUR",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la création du paiement");
      }

      const { paymentIntent } = await response.json();

      // Simulate payment confirmation (in production, use Stripe)
      const confirmResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-069560bb/payment/confirm/${paymentIntent.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!confirmResponse.ok) {
        throw new Error("Erreur lors de la confirmation du paiement");
      }

      // Create reservations for each item
      for (const item of cart.items) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-069560bb/reservations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              stationId: item.stationId,
              stationName: item.stationName,
              date: item.date,
              hours: item.hours,
              amount: item.pricePerHour * item.hours,
            }),
          }
        );
      }

      toast.success("Paiement réussi! Vos réservations ont été confirmées.");
      setCart({ items: [] });
      navigate("/profile");
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Erreur lors du paiement");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading || loadingCart) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mon Panier</h1>

        {cart.items.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <ShoppingCart className="size-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Votre panier est vide
                </h2>
                <p className="text-gray-600 mb-6">
                  Explorez nos bornes de recharge et ajoutez des réservations
                </p>
                <Link to="/map">
                  <Button>Trouver une borne</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <Battery className="size-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">
                            {item.stationName}
                          </h3>
                          <p className="text-gray-600">{item.city}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Date:</span>{" "}
                              {new Date(item.date).toLocaleDateString("fr-FR")}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Durée:</span> {item.hours}h
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Puissance:</span>{" "}
                              {item.powerKw} kW
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-green-600 mt-3">
                            {item.pricePerHour * item.hours}€
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="size-5 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Récapitulatif</CardTitle>
                  <CardDescription>Résumé de votre commande</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sous-total</span>
                      <span className="font-medium">{calculateTotal()}€</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Frais de service</span>
                      <span className="font-medium">0€</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold text-lg">Total</span>
                      <span className="font-bold text-lg text-green-600">
                        {calculateTotal()}€
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={processingPayment}
                  >
                    <CreditCard className="size-5 mr-2" />
                    {processingPayment ? "Traitement..." : "Payer"}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    ⚠️ Mode démo: Le paiement est simulé pour ce prototype
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
