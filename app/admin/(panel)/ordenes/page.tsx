import Link from "next/link";
import { Suspense } from "react";
import { TOPE_ORDENES, buscarOrdenes } from "@/lib/admin/consultas";
import {
  ESTADO_ORDEN,
  ESTADOS_ORDEN,
  ORIGEN,
  type OrdenAdmin,
} from "@/lib/admin/tipos";
import type { EstadoOrden } from "@/lib/tipos";
import { fechaCorta, precio } from "@/lib/formato";
import { Buscador, Chips } from "@/components/admin/ui/buscador";
import { AvisoTope, Celda, Tabla } from "@/components/admin/ui/tabla";
import {
  Encabezado,
  Panel,
  Pildora,
  Vacio,
  type Tono,
} from "@/components/admin/ui/piezas";

export const metadata = { title: "Órdenes" };

/**
 * Todas las compras, las de la web y las cargadas a mano.
 *
 * Los dos filtros viven en la URL: la pantalla se puede pasar armada y el boton
 * de atras del navegador funciona. El backend los combina y corta en 100.
 */
export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { estado, q } = await searchParams;

  return (
    <>
      <Encabezado
        titulo="Órdenes"
        bajada="Los dos filtros se combinan. Se muestran hasta 100 resultados; si llegás al tope, afiná la búsqueda."
      />

      <Panel>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Suspense fallback={null}>
            <Buscador
              rotulo="Buscar comprador"
              ayuda="Por DNI o por apellido. No hace falta elegir cuál: el backend prueba los dos."
            />
            <Chips
              parametro="estado"
              rotulo="Estado"
              opciones={ESTADOS_ORDEN.map((e) => ({
                valor: e,
                texto: ESTADO_ORDEN[e],
              }))}
            />
          </Suspense>
        </div>
      </Panel>

      {/* La clave remonta la lista en cada busqueda: sin esto React reusa el
          arbol viejo y el esqueleto de carga no llega a verse. */}
      <Suspense key={`${estado ?? ""}·${q ?? ""}`} fallback={<Cargando />}>
        <Lista estado={esEstado(estado) ? estado : undefined} q={q} />
      </Suspense>
    </>
  );
}

async function Lista({ estado, q }: { estado?: EstadoOrden; q?: string }) {
  const { ordenes, total } = await buscarOrdenes({ estado, q });

  if (ordenes.length === 0) {
    return (
      <Panel>
        <Vacio titulo="Ninguna orden coincide">
          {q || estado
            ? "Probá con menos filtros, o con el DNI en vez del apellido."
            : "Todavía no hay compras. Van a aparecer acá apenas alguien elija sus butacas."}
        </Vacio>
      </Panel>
    );
  }

  return (
    <Panel
      titulo={`${ordenes.length} ${ordenes.length === 1 ? "orden" : "órdenes"}`}
    >
      <Tabla
        columnas={[
          { clave: "comprador", rotulo: "Comprador" },
          { clave: "estado", rotulo: "Estado" },
          { clave: "origen", rotulo: "Origen" },
          { clave: "butacas", rotulo: "Butacas", alDerecha: true },
          { clave: "total", rotulo: "Total", alDerecha: true },
          { clave: "creado", rotulo: "Creada" },
          { clave: "pagado", rotulo: "Pagada" },
        ]}
      >
        {ordenes.map((orden) => (
          <Fila key={orden.token} orden={orden} />
        ))}
      </Tabla>

      {/* `total`, no `ordenes.length`: con el filtro de vencidas la lista puede
          quedar corta aunque el backend haya truncado en 100. */}
      <AvisoTope cantidad={total} tope={TOPE_ORDENES}>
        Llegaste al tope de {TOPE_ORDENES} resultados: puede haber más órdenes
        que no se están mostrando.
      </AvisoTope>
    </Panel>
  );
}

function Fila({ orden }: { orden: OrdenAdmin }) {
  return (
    <tr className="transition-colors duration-200 hover:bg-surface-high">
      <Celda>
        <Link
          href={`/admin/ordenes/${orden.token}`}
          className="font-medium text-ink subrayado-vivo"
        >
          {orden.comprador}
        </Link>
        <span className="block text-xs text-ink-faint tabular">
          DNI {orden.dni}
        </span>
      </Celda>

      <Celda>
        <Pildora tono={TONO_ESTADO[orden.estado]}>
          {ESTADO_ORDEN[orden.estado]}
        </Pildora>
      </Celda>

      <Celda>
        <span className="text-ink-soft">{ORIGEN[orden.origen]}</span>
      </Celda>

      <Celda alDerecha>
        <span className="text-ink tabular">{orden.butacas}</span>
        {/* Una cancelada muestra 0 y es literal: ya devolvio sus butacas a la
            venta. Sin esta aclaracion se lee como un dato faltante. */}
        {orden.butacas === 0 && (
          <span className="block text-xs text-ink-faint">devueltas</span>
        )}
      </Celda>

      <Celda alDerecha>
        <span className="text-ink tabular">{precio(orden.totalCentavos)}</span>
      </Celda>

      <Celda>
        <span className="text-ink-soft tabular">
          {fechaCorta(orden.creadoEl)}
        </span>
      </Celda>

      <Celda>
        <span className="text-ink-soft tabular">
          {fechaCorta(orden.pagadoEl)}
        </span>
      </Celda>
    </tr>
  );
}

const TONO_ESTADO: Record<EstadoOrden, Tono> = {
  PAGADA: "exito",
  ACTIVA: "acento",
  EXPIRADA: "neutro",
  CANCELADA: "neutro",
  // La unica de las tres terminadas que no es rutina: se cobro y hay plata que
  // devolver. No se lee igual que una que vencio sola.
  ANULADA: "error",
};

function esEstado(valor: string | undefined): valor is EstadoOrden {
  return !!valor && (ESTADOS_ORDEN as string[]).includes(valor);
}

/**
 * Esqueleto, no ruleta.
 *
 * Mantiene el alto de la tabla mientras llega: una ruleta en el medio del panel
 * hace saltar todo lo de abajo cuando aparecen las filas.
 */
function Cargando() {
  return (
    <Panel>
      <div className="divide-y divide-line">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <span className="h-4 w-40 rounded-sm bg-surface-high" />
            <span className="h-4 w-20 rounded-sm bg-surface-high" />
            <span className="ml-auto h-4 w-24 rounded-sm bg-surface-high" />
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        Buscando órdenes
      </p>
    </Panel>
  );
}
