import { createBrowserRouter } from "react-router";
import { Home } from "@/app/pages/Home";
import { Map } from "@/app/pages/Map";
import { StationDetails } from "@/app/pages/StationDetails";
import { HostDashboard } from "@/app/pages/HostDashboard";
import { Auth } from "@/app/pages/Auth";
import { Profile } from "@/app/pages/Profile";
import { Cart } from "@/app/pages/Cart";
import { NotFound } from "@/app/pages/NotFound";
import { RootLayout } from "@/app/layouts/RootLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: "map", Component: Map },
      { path: "station/:id", Component: StationDetails },
      { path: "host", Component: HostDashboard },
      { path: "auth", Component: Auth },
      { path: "profile", Component: Profile },
      { path: "cart", Component: Cart },
      { path: "*", Component: NotFound },
    ],
  },
]);