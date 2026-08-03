import Link from "next/link";
import { notFound } from "next/navigation";
import { butacasEsperadas, obtenerCaso } from "@/lib/admin/consultas";
import { obtenerMapa } from "@/lib/consultas";
import { tomarCaso } from "@/lib/admin/acciones/casos";
import {
  ESTADO_INCIDENCIA,
  MEDIO,
  TIPO_INCIDENCIA,
  type TipoIncidencia,
} from "@/lib/admin/tipos";
import { fechaCorta, precio, ubicacion } from "@/lib/formato";
import { Reubicar, Resolver } from "@/components/admin/casos/acciones-caso";
import { AccionConfirmada } from "@/components/admin/ui/accion-confirmada";
import {
  Aviso,
  Dato,
  Encabezado,
  Panel,
  Pildora,
  type Tono,
} from "@/components/admin/ui/piezas";

export const metadata = { title: "Caso" };

/**
 * Rojo para los dos que dejan a alguien parado en la puerta —sin butaca, o con
 * menos entradas de las que pago— y ambar para los que son plata mal contada
 * pero no bloquean a nadie esa noche.
 */
const TONO_INCIDENCIA: Record<TipoIncidencia, Tono> = {
  SIN_BUTACA: "error",
  BUTACAS_INCOMPLETAS: "error",
  PAGO_TARDIO: "alerta",
  MONTO_DISTINTO: "alerta",
};

/** Que quiere decir el tipo, en una linea, para quien esta por llamar. */
const PORQUE: Record<TipoIncidencia, string> = {
  PAGO_TARDIO:
    "El pago entró después de que venciera la reserva, y para entonces las butacas ya habían vuelto a la venta.",
  SIN_BUTACA: "La orden figura pagada pero no tiene ninguna butaca viva.",
  BUTACAS_INCOMPLETAS:
    "Se cobraron más butacas de las que salieron en entradas. Esta persona llega a la puerta con una entrada de menos: es lo más urgente de la cola.",
  MONTO_DISTINTO:
    "Mercado Pago informó un importe que no es el que se pidió cobrar. Es una diferencia de plata; no bloquea a nadie en la puerta.",
};

/**
 * Un caso completo, para tener todo a la vista antes de levantar el telefono.
 *
 * El mapa se pide en paralelo con el caso: la reubicacion necesita el plano y
 * encadenar las dos consultas duplicaria la espera de una pantalla que se abre
 * con alguien esperando del otro lado.
 */
export default async function CasoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numero = Number(id);

  const [caso, mapa] = await Promise.all([
    obtenerCaso(numero),
    obtenerMapa(),
  ]);

  if (!caso) notFound();

  const esperadas = butacasEsperadas(caso);
  const cerrado = caso.resueltaEl !== null;

  return (
    <>
      <Encabezado
        titulo={caso.comprador}
        bajada={
          <Link href="/admin/casos" className="subrayado-vivo">
            ← Volver a la cola
          </Link>
        }
      >
        <Pildora tono={TONO_INCIDENCIA[caso.tipo]}>
          {TIPO_INCIDENCIA[caso.tipo]}
        </Pildora>
        <Pildora tono={cerrado ? "exito" : caso.estado === "EN_CURSO" ? "acento" : "neutro"}>
          {cerrado ? "Resuelto" : ESTADO_INCIDENCIA[caso.estado]}
        </Pildora>
      </Encabezado>

      {cerrado && (
        <Aviso tono="exito" titulo="Este caso ya está resuelto">
          Se cerró el {fechaCorta(caso.resueltaEl)}
          {caso.resueltaPor ? ` por ${caso.resueltaPor}` : ""}. Las acciones ya
          no se pueden ejecutar: el servidor las rechaza.
        </Aviso>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-6">
          <Panel titulo="Qué pasó">
            <div className="space-y-4 p-5">
              <p className="max-w-[65ch] text-ink-soft">
                {caso.detalle ?? "Sin detalle cargado."}
              </p>

              <div className="border-t border-line pt-4">
                <p className="text-sm text-ink-soft">
                  {PORQUE[caso.tipo]}
                </p>
              </div>
            </div>
          </Panel>

          <Panel titulo={`Butacas que había elegido (${caso.orden.butacas.length})`}>
            {caso.orden.butacas.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ink-soft">
                La orden no conserva ninguna butaca.
              </p>
            ) : (
              <>
                <ul className="flex flex-wrap gap-2 p-5">
                  {caso.orden.butacas.map((b) => (
                    <li
                      key={b.asientoId}
                      className="rounded-sm border border-line-strong px-2.5 py-1 text-sm text-ink-soft line-through tabular"
                    >
                      {ubicacion(b.mesaNumero, b.numero)}
                    </li>
                  ))}
                </ul>
                <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
                  Están tachadas porque ya no las tiene: son las que había
                  elegido y perdió. Sirven para ofrecerle algo cerca.
                </p>
              </>
            )}
          </Panel>

          {!cerrado && (
            <Reubicar
              id={caso.id}
              mesas={mapa.mesas}
              esperadas={Math.max(1, esperadas)}
            />
          )}
        </div>

        <aside className="space-y-6">
          <Panel titulo="A quién llamar">
            <div className="space-y-4 p-5">
              <Dato rotulo="Comprador">{caso.comprador}</Dato>
              <Dato rotulo="DNI">{caso.dni}</Dato>
              <a
                href={`tel:${caso.celular}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-brass px-5 text-sm font-semibold text-carbon transition-colors duration-200 hover:bg-brass-light tabular"
              >
                Llamar al {caso.celular}
              </a>
            </div>
          </Panel>

          <Panel titulo="El pago">
            <div className="space-y-4 p-5">
              {caso.pago ? (
                <>
                  <Dato rotulo="Monto">{precio(caso.pago.montoCentavos)}</Dato>
                  <Dato rotulo="Medio">{MEDIO[caso.pago.medio]}</Dato>
                  <Dato rotulo="Estado">{caso.pago.estado}</Dato>
                  <Dato rotulo="Aprobado">
                    {fechaCorta(caso.pago.aprobadoEl)}
                  </Dato>
                  <Dato rotulo="Referencia">
                    {caso.pago.referenciaExterna ?? "sin referencia externa"}
                  </Dato>
                </>
              ) : (
                <p className="text-sm text-ink-soft">
                  Sin cobro aprobado todavía. Antes de reubicar conviene
                  confirmar que el pago entró.
                </p>
              )}
            </div>
            <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
              Van {esperadas === 1 ? "1 butaca" : `${esperadas} butacas`} según
              lo que pagó. El servidor lo verifica igual.
            </p>
          </Panel>

          <Panel titulo="Abierto el">
            <div className="space-y-4 p-5">
              <Dato rotulo="Fecha">{fechaCorta(caso.creadoEl)}</Dato>

              {!cerrado && (
                <div className="space-y-3 border-t border-line pt-4">
                  {caso.estado === "ABIERTA" && (
                    <AccionConfirmada
                      etiqueta="Lo estoy atendiendo"
                      confirmar="Sí, marcarlo"
                      accion={tomarCaso.bind(null, caso.id)}
                      pregunta="Marca el caso como «en curso». Es sólo un aviso para el resto: no cambia nada de la compra."
                    />
                  )}
                  <Resolver id={caso.id} />
                </div>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
