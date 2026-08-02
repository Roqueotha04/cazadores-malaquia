import { Hero } from "@/components/landing/hero";
import { SeccionEntradas } from "@/components/landing/seccion-entradas";
import { SobreNosotros } from "@/components/landing/sobre-nosotros";
import { Contacto } from "@/components/landing/contacto";
import { contarDisponibles, obtenerEvento } from "@/lib/consultas";

// El shell (Navbar / Footer) vive en app/(landing)/layout.tsx.
export default async function Inicio() {
  const [evento, disponibles] = await Promise.all([
    obtenerEvento(),
    contarDisponibles(),
  ]);

  return (
    <>
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
