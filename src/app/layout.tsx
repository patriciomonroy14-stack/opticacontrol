import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opticacontrol · Óptica Retiro",
  description: "Gestión integral de Óptica Retiro",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
