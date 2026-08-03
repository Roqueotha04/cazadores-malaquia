import Link from "next/link";
import { obtenerIncidencias } from "@/lib/admin/consultas";
import {
  ESTADO_INCIDENCIA,
  TIPO_INCIDENCIA,
  type Incidencia,
} from "@/lib/admin/tipos";
import { fechaCorta } from "@/lib/formato";
import { Refresco } from "@/components/admin/ui/refresco";
import {
  Encabezado,
  Panel,
  Pildora,
  Vacio,
} from "@/components/admin/ui/piezas";

export const metadata = { title: "Casos" };

/**
 * Compras pagadas que quedaron sin butaca.
 *
 * Traen el comprador y el celular y no solo el numero de orden porque lo primero
 * que se hace con un caso es llamar a esa persona. El telefono es un link: en el
 * celular llama de un toque.
 */
export default async function CasosPage() {
  const casos = await obtenerIncidencias();

  return (
    <>
      <Encabezado
        titulo="Cola de casos"
        bajada="Gente que pagó y se quedó sin lugar: el pago entró tarde y la reserva ya había vencido. Los abre el sistema solo, al confirmar pagos."
      >
        <Refresco cada={120} />
      </Encabezado>

      {casos.length === 0 ? (
        <Panel>
          <Vacio titulo="No hay casos sin resolver">
            Esto es lo que se espera ver: quiere decir que todas las compras
            pagadas tienen su butaca. Cuando un pago entre tarde, el caso va a
            aparecer acá solo.
          </Vacio>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {casos.map((caso) => (
            <FichaCaso key={caso.id} caso={caso} />
          ))}
        </ul>
      )}
    </>
  );
}

function FichaCaso({ caso }: { caso: Incidencia }) {
  return (
    <li className="rounded-sm border border-line bg-surface-raised p-4 transition-colors duration-200 hover:border-brass sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg">
            <Link
              href={`/admin/casos/${caso.id}`}
              className="text-ink subrayado-vivo"
            >
              {caso.comprador}
            </Link>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="tabular">DNI {caso.dni}</span>
            <span className="tabular">
              Abierto el {fechaCorta(caso.creadoEl)}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Pildora tono={caso.tipo === "PAGO_TARDIO" ? "alerta" : "error"}>
            {TIPO_INCIDENCIA[caso.tipo]}
          </Pildora>
          <Pildora tono={caso.estado === "EN_CURSO" ? "acento" : "neutro"}>
            {ESTADO_INCIDENCIA[caso.estado]}
          </Pildora>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {/* Lo primero que se hace con un caso es llamar. */}
        <a
          href={`tel:${caso.celular}`}
          className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-4 text-sm text-ink transition-colors duration-200 hover:border-brass tabular"
        >
          Llamar al {caso.celular}
        </a>
        <Link
          href={`/admin/casos/${caso.id}`}
          className="inline-flex min-h-11 items-center rounded-sm px-4 text-sm text-ink-soft transition-colors duration-200 hover:bg-surface-high hover:text-ink"
        >
          Abrir el caso
        </Link>
      </div>
    </li>
  );
}
