import { RouterProvider } from "react-router";
import { router } from "@/app/routes";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { Toaster } from "@/app/components/ui/sonner";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}