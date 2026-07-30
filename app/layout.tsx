import type { Metadata, Viewport } from "next";
import { display, sans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cena de Cazadores 2026 · Armería Bonifacio Malaquía",
  description:
    "La cena anual de cazadores. 2 de octubre de 2026. Elegí tu silla y comprá tu entrada online.",
};

export const viewport: Viewport = {
  // Tiñe la barra del navegador en el celular: el sitio arranca en el borde de
  // la pantalla y no con una franja blanca arriba.
  themeColor: "#151c15",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* Primer tab de la pagina: saltear la barra y entrar al contenido. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-sm focus:bg-brass focus:px-4 focus:py-2 focus:font-semibold focus:text-carbon"
        >
          Ir al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
