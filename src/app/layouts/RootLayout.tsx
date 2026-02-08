import { Outlet, Link, useLocation } from "react-router";
import { Zap, Map as MapIcon, Home, UserCircle, ShoppingCart, LogOut } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";

export function RootLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const getInitials = (name?: string, email?: string) => {
    const source = (name || "").trim() || (email || "").split("@")[0] || "";
    const parts = source.split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-green-600 p-2 rounded-lg">
                <Zap className="size-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">ChargeShare</span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/")
                    ? "text-green-600 bg-green-50"
                    : "text-gray-700 hover:text-green-600 hover:bg-gray-50"
                }`}
              >
                <Home className="size-5" />
                <span className="hidden sm:inline">Accueil</span>
              </Link>

              <Link
                to="/map"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/map")
                    ? "text-green-600 bg-green-50"
                    : "text-gray-700 hover:text-green-600 hover:bg-gray-50"
                }`}
              >
                <MapIcon className="size-5" />
                <span className="hidden sm:inline">Carte</span>
              </Link>

              <Link
                to="/host"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/host")
                    ? "text-green-600 bg-green-50"
                    : "text-gray-700 hover:text-green-600 hover:bg-gray-50"
                }`}
              >
                <UserCircle className="size-5" />
                <span className="hidden sm:inline">Devenir hôte</span>
              </Link>

              {user ? (
                <>
                  <Link
                    to="/cart"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive("/cart")
                        ? "text-green-600 bg-green-50"
                        : "text-gray-700 hover:text-green-600 hover:bg-gray-50"
                    }`}
                  >
                    <ShoppingCart className="size-5" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-green-600 text-white">
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium text-gray-700">
                        {user.name || user.email}
                      </span>
                    </div>
                    <Button variant="outline" onClick={handleSignOut}>
                      <LogOut className="size-4 mr-2" />
                      Déconnexion
                    </Button>
                  </div>
                </>
              ) : (
                <Link to="/auth">
                  <Button>Se connecter</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-green-600 p-2 rounded-lg">
                  <Zap className="size-5" />
                </div>
                <span className="font-bold text-lg">ChargeShare</span>
              </div>
              <p className="text-gray-400">
                Partagez et trouvez des bornes de recharge électrique partout en France.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/" className="hover:text-white transition-colors">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link to="/map" className="hover:text-white transition-colors">
                    Carte des bornes
                  </Link>
                </li>
                <li>
                  <Link to="/host" className="hover:text-white transition-colors">
                    Devenir hôte
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">À propos</h3>
              <p className="text-gray-400 text-sm">
                ChargeShare connecte les propriétaires de bornes électriques avec les voyageurs
                pour une mobilité électrique accessible à tous.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Founder</h3>
              <p className="text-gray-400 text-sm">
                AMRANE Abdelghani Co-Founder & CEO
              </p>
              <p className="text-gray-400 text-sm">
                HABSAOUI Morad Co-Founder & CTO
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            © 2026 ChargeShare. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
