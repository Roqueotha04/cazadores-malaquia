import { Hero } from "@/components/landing/hero";
import { SeccionEntradas } from "@/components/landing/seccion-entradas";
import { SobreNosotros } from "@/components/landing/sobre-nosotros";
import { Contacto } from "@/components/landing/contacto";
import { contarDisponibles, obtenerEvento } from "@/lib/consultas";
import type { Evento } from "@/lib/tipos";

const SITIO = "https://cenacazadoresytiradores.com";

/**
 * Datos estructurados del evento, para que Google pueda mostrar fecha, lugar
 * y precio directo en el resultado de búsqueda.
 *
 * `null` si falta fecha o lugar: un `Event` sin esos dos datos no vale la pena
 * publicarlo, y `evento.fecha`/`evento.lugar` vienen `null` mientras el back
 * todavía no cargó el evento.
 */
function jsonLdEvento(evento: Evento, disponibles: number) {
  if (!evento.fecha || !evento.lugar) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: evento.nombre,
    startDate: evento.fecha.toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: evento.lugar, address: evento.lugar },
    image: [`${SITIO}/hero.webp`],
    description:
      "La cena anual de cazadores. Elegí tu silla y comprá tu entrada online.",
    offers: {
      "@type": "Offer",
      url: `${SITIO}/comprar`,
      price: (evento.precioCentavos / 100).toFixed(2),
      priceCurrency: "ARS",
      availability:
        disponibles > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      validFrom: new Date().toISOString(),
    },
  };
}

// El shell (Navbar / Footer) vive en app/(landing)/layout.tsx.
export default async function Inicio() {
  const [evento, disponibles] = await Promise.all([
    obtenerEvento(),
    contarDisponibles(),
  ]);

  const jsonLd = jsonLdEvento(evento, disponibles);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Hero
        fecha={evento.fecha}
        lugar={evento.lugar}
        precioCentavos={evento.precioCentavos}
      />
      <SeccionEntradas evento={evento} disponibles={disponibles} />
      <SobreNosotros />
      <Contacto />
    </>
  );
}
