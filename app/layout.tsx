import type { Metadata, Viewport } from "next";
import { display, sans } from "./fonts";
import "./globals.css";

// El icono de la pestaña sale de app/icon.png (y app/apple-icon.png), las dos
// generadas a partir de public/logo.png: Next las publica solo por estar ahi,
// con hash en la URL. No hace falta declararlas en `icons`.
const TITULO = "Cena de Cazadores y Tiradores · 6ta Edición 2026";
const DESCRIPCION =
  "La cena anual de cazadores. 2 de octubre de 2026. Elegí tu silla y comprá tu entrada online.";

export const metadata: Metadata = {
  // Sin esto Next no puede armar las URLs absolutas que piden Open Graph y
  // Twitter (la imagen, el `url` de cada red). Cambia el día del deploy si el
  // dominio final no es este.
  metadataBase: new URL("https://cenacazadoresytiradores.com"),
  title: TITULO,
  description: DESCRIPCION,
  // public/og.jpg: captura de la landing (navbar + hero), 1200x630. Es lo que
  // WhatsApp e Instagram muestran al compartir el link. Sin esto la vista
  // previa sale pelada, sin foto.
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "Cena de Cazadores y Tiradores",
    title: TITULO,
    description: DESCRIPCION,
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Cena de Cazadores y Tiradores, 6ta Edición 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
    images: ["/og.jpg"],
  },
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
