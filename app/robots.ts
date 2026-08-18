import type { MetadataRoute } from "next";

const SITIO = "https://cenacazadoresytiradores.com";

/**
 * El admin ya se excluye pantalla por pantalla con `robots: { index: false }`
 * (ver `app/admin/(panel)/layout.tsx`), pero acá se le suma el disallow: así
 * ni siquiera se gasta presupuesto de rastreo en pedirlas.
 *
 * `/reserva`, `/checkout` y `/entradas` llevan el token de la orden en la URL,
 * con nombre y mail del comprador del otro lado — mismo criterio.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/reserva", "/checkout", "/entradas"],
    },
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
