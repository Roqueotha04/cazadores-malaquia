import type { MetadataRoute } from "next";

const SITIO = "https://cenacazadoresytiradores.com";

/**
 * Solo las dos páginas públicas de verdad: la landing y el arranque del
 * embudo de compra. El resto del flujo (`/reserva`, `/checkout`, `/entradas`)
 * es por token y ya está en `disallow` de `robots.ts` — no tiene sentido
 * listarlo acá.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITIO, changeFrequency: "weekly", priority: 1 },
    { url: `${SITIO}/comprar`, changeFrequency: "daily", priority: 0.8 },
  ];
}
