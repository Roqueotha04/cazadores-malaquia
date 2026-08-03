import Link from "next/link";
import { obtenerMapa } from "@/lib/consultas";
import { requerirSesion } from "@/lib/admin/sesion";
import { FormularioVenta } from "@/components/admin/ventas/formulario-venta";
import { Encabezado } from "@/components/admin/ui/piezas";

export const metadata = { title: "Cargar venta" };

/**
 * Registrar una venta que se cobro afuera, en efectivo o por transferencia.
 *
 * La app no cobra nada acá. El precio sale del evento y no se tipea: un campo
 * menos que equivocar a las once de la noche.
 */
export default async function NuevaVentaPage() {
  await requerirSesion();

  const mapa = await obtenerMapa();

  return (
    <>
      <Encabezado
        titulo="Cargar una venta cobrada a mano"
        bajada={
          <Link href="/admin/ventas" className="subrayado-vivo">
            ← Volver al historial
          </Link>
        }
      />

      <FormularioVenta
        mesas={mapa.mesas}
        precioCentavos={mapa.evento.precioCentavos}
      />
    </>
  );
}
