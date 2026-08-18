import { Suspense } from "react";
import {
  TOPE_ORDENES,
  obtenerDiasDeVenta,
  obtenerEntradasDelDia,
  obtenerResumen,
} from "@/lib/admin/consultas";
import { fechaCorta, precio } from "@/lib/formato";
import { Dia } from "@/components/admin/entradas/dia";
import { ListaEntradas } from "@/components/admin/entradas/lista-entradas";
import { Buscador } from "@/components/admin/ui/buscador";
import { AvisoTope } from "@/components/admin/ui/tabla";
import {
  Cifra,
  Encabezado,
  Panel,
  Vacio,
} from "@/components/admin/ui/piezas";

export const metadata = { title: "Entradas" };

/**
 * Todas las entradas emitidas, separadas por el dia en que se cobraron.
 *
 * **No hay un endpoint de entradas.** La pantalla se arma con la lista de
 * ordenes pagadas —de ahi salen los dias, las cifras de cada dia y el orden— y
 * los codigos de cada butaca con un pedido por compra. Todo el detalle de por
 * que esta armada asi vive en `obtenerDiasDeVenta`.
 *
 * Se traen los dias enteros de una sola vez, aunque sean cien pedidos: la lista
 * tiene tope de 100 compras y todas se miran en la misma pantalla, asi que
 * partirla por dia no ahorraba nada que se notara y obligaba a esperar en cada
 * despliegue.
 *
 * Las dos acciones sobre una entrada emitida viven acá y no en la puerta: la
 * puerta se usa de pie, de noche, con gente esperando, y no es el momento de
 * mover a nadie de mesa ni de dar de baja una compra.
 */
export default async function EntradasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <>
      <Encabezado
        titulo="Entradas"
        bajada="Cada día de venta es una tabla aparte, de la más reciente para atrás, con sus butacas una por una para moverlas o darlas de baja. Plegá los días que ya miraste."
      />

      <Suspense fallback={null}>
        <Totales />
      </Suspense>

      <Panel>
        <div className="p-5">
          <Suspense fallback={null}>
            <Buscador
              rotulo="Buscar comprador"
              ayuda="Por DNI o por apellido. No hace falta elegir cuál: el backend prueba los dos. Los días se recalculan sobre lo que quede."
            />
          </Suspense>
        </div>
      </Panel>

      {/* La clave remonta la lista en cada busqueda: sin esto React reusa el
          arbol viejo y el esqueleto de carga no llega a verse. */}
      <Suspense key={q ?? ""} fallback={<Cargando />}>
        <Dias q={q} />
      </Suspense>
    </>
  );
}

/**
 * Las cifras de arriba salen del resumen y no de la lista.
 *
 * A proposito: la lista hereda el tope de 100 ordenes de `/api/admin/ordenes`,
 * asi que sumar sus filas daria de menos justo cuando mas entradas hay. El
 * resumen cuenta sobre la base entera.
 */
async function Totales() {
  const { butacas } = await obtenerResumen();

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Cifra
        rotulo="Emitidas"
        valor={String(butacas.vendidas)}
        nota={`de ${butacas.total} butacas del salón`}
      />
      <Cifra
        rotulo="Ya entraron"
        valor={String(butacas.entradasUsadas)}
        nota="validadas en la puerta"
      />
      <Cifra
        rotulo="Anuladas"
        valor={String(butacas.entradasAnuladas)}
        nota={
          butacas.entradasAnuladas > 0
            ? "cada una es plata a devolver a mano"
            : "ninguna dada de baja"
        }
      />
    </div>
  );
}

async function Dias({ q }: { q?: string }) {
  const { dias, sinFecha, total } = await obtenerDiasDeVenta(q);

  // Todos los dias de una: cada uno abre ya pintado y plegarlo no vuelve a
  // pedir nada.
  const entradasPorDia = await Promise.all(
    dias.map((d) => obtenerEntradasDelDia(d.ordenes)),
  );

  if (dias.length === 0 && sinFecha.length === 0) {
    return (
      <Panel>
        <Vacio titulo="Todavía no hay entradas emitidas">
          {q
            ? "Nadie con ese DNI o apellido tiene una compra pagada. Probá con el DNI sin puntos, o buscalo en Órdenes: puede haber comprado y no haber pagado."
            : "Van a aparecer acá apenas se pague la primera compra. Cada día de venta arma su propia tabla."}
        </Vacio>
      </Panel>
    );
  }

  const maximo = Math.max(...dias.map((d) => d.butacas), 0);

  return (
    <div className="space-y-3">
      {dias.map((d, i) => (
        <Dia key={d.clave} dia={d} maximo={maximo}>
          <ListaEntradas entradas={entradasPorDia[i]} q={q} />
        </Dia>
      ))}

      {/* Una orden PAGADA sin `pagadoEl` no tiene dia al que ir. Es un dato roto
          y se muestra como tal: metida en el dia de hoy pasaria desapercibida. */}
      {sinFecha.length > 0 && (
        <Panel titulo="Compras pagadas sin fecha de pago">
          <ul className="divide-y divide-line">
            {sinFecha.map((orden) => (
              <li
                key={orden.token}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-5"
              >
                <span className="text-alerta">
                  {orden.comprador}{" "}
                  <span className="text-ink-faint tabular">
                    · DNI {orden.dni}
                  </span>
                </span>
                <span className="text-ink-soft tabular">
                  {orden.butacas} · {precio(orden.totalCentavos)} · creada{" "}
                  {fechaCorta(orden.creadoEl)}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-2.5 text-xs text-ink-faint sm:px-5">
            El backend las devolvió pagadas pero sin cuándo. No se pueden ubicar
            en ningún día; sus entradas se ven abriendo la orden.
          </p>
        </Panel>
      )}

      <AvisoTope cantidad={total} tope={TOPE_ORDENES}>
        Llegaste al tope de {TOPE_ORDENES} compras: los días de más atrás pueden
        estar incompletos o no aparecer. Buscá por DNI o apellido para encontrar
        una entrada puntual.
      </AvisoTope>
    </div>
  );
}

function Cargando() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex min-h-14 items-center gap-4 rounded-sm border border-line bg-surface-raised px-4 py-3 sm:px-5"
        >
          <span className="h-4 w-44 rounded-sm bg-surface-high" />
          <span className="ml-auto h-4 w-24 rounded-sm bg-surface-high" />
        </div>
      ))}
      <p className="sr-only" aria-live="polite">
        Buscando las entradas
      </p>
    </div>
  );
}
