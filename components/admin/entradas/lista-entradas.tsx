import Link from "next/link";
import { anularEntrada } from "@/lib/admin/acciones/puerta";
import { ORIGEN, type EntradaVendida } from "@/lib/admin/tipos";
import { hora, ubicacion } from "@/lib/formato";
import { AccionConfirmada } from "@/components/admin/ui/accion-confirmada";
import { Celda, Tabla } from "@/components/admin/ui/tabla";
import { Pildora } from "@/components/admin/ui/piezas";

/**
 * Las butacas de un dia, una por fila.
 *
 * No pide nada: las entradas llegan ya resueltas desde la pantalla, que las trae
 * todas de una para todos los dias. Ver `EntradasPage`.
 */
export function ListaEntradas({
  entradas,
  q,
}: {
  entradas: EntradaVendida[];
  q?: string;
}) {
  if (entradas.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-ink-soft sm:px-5">
        Las compras de este día están pagadas pero todavía no tienen entradas
        emitidas. Suele ser cuestión de segundos; si sigue así, mirá la pantalla
        de Errores.
      </p>
    );
  }

  return (
    <Tabla
      columnas={[
        { clave: "butaca", rotulo: "Butaca" },
        { clave: "titular", rotulo: "Titular" },
        { clave: "compra", rotulo: "Compra" },
        { clave: "estado", rotulo: "Estado" },
        { clave: "acciones", rotulo: "" },
      ]}
    >
      {entradas.map((entrada) => (
        <Fila key={entrada.codigo} entrada={entrada} q={q} />
      ))}
    </Tabla>
  );
}

function Fila({ entrada, q }: { entrada: EntradaVendida; q?: string }) {
  const usada = entrada.usadoEl !== null;
  const volver = q?.trim() ? `&q=${encodeURIComponent(q.trim())}` : "";

  return (
    <tr className="align-top transition-colors duration-200 hover:bg-surface-high">
      <Celda>
        <span
          className={
            // Tachada, no escondida: la butaca anulada existio y esa plata hay
            // que devolverla. Si no apareciera, no la reclama nadie.
            entrada.anulada
              ? "font-medium text-ink-faint line-through"
              : "font-medium text-ink"
          }
        >
          {ubicacion(entrada.mesaNumero, entrada.asientoNumero)}
        </span>
      </Celda>

      <Celda>
        <span className="block text-ink">{entrada.titular}</span>
        <span className="block text-xs text-ink-faint tabular">
          DNI {entrada.dni}
        </span>
      </Celda>

      <Celda>
        <Link
          href={`/admin/ordenes/${entrada.ordenToken}`}
          className="subrayado-vivo text-ink-soft tabular"
        >
          {hora(entrada.pagadoEl)}
        </Link>
        <span className="block text-xs text-ink-faint">
          {ORIGEN[entrada.origen]}
        </span>
      </Celda>

      <Celda>
        {entrada.anulada ? (
          <Pildora tono="error">Anulada</Pildora>
        ) : usada ? (
          <Pildora tono="neutro">Entró {hora(entrada.usadoEl)}</Pildora>
        ) : (
          <span className="text-xs text-ink-faint">Sin usar</span>
        )}
      </Celda>

      <Celda>
        {/* Una anulada ya no se toca: la butaca volvio a la venta y puede ser de
            otro. Una usada tampoco se mueve —esa persona esta sentada— pero eso
            lo decide el backend, que contesta 409 con el motivo escrito. */}
        {!entrada.anulada && (
          <div className="flex flex-wrap items-start gap-2">
            <Link
              href={`/admin/entradas/${entrada.codigo}/butaca?mesa=${entrada.mesaNumero}&silla=${entrada.asientoNumero}${volver}`}
              className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-4 text-sm whitespace-nowrap text-ink-soft transition-colors duration-200 hover:border-brass hover:text-ink"
            >
              Cambiar butaca
            </Link>

            <AccionConfirmada
              etiqueta="Anular"
              confirmar="Sí, anular la entrada"
              tono="fantasma"
              medida="base"
              accion={anularEntrada.bind(null, entrada.codigo)}
              motivo={{
                rotulo: "Por qué se anula",
                ayuda:
                  "Queda asentado. Anular no devuelve la plata: el reintegro lo hace el equipo a mano, y esto es lo único que después explica por qué.",
                placeholder: "El invitado avisó que no viene",
              }}
              pregunta={
                <>
                  La butaca{" "}
                  <strong className="text-ink">
                    {ubicacion(entrada.mesaNumero, entrada.asientoNumero)}
                  </strong>{" "}
                  de <strong className="text-ink">{entrada.titular}</strong>{" "}
                  vuelve a la venta y esta entrada deja de valer. El código que
                  tenga impreso o en el teléfono no va a servir más.
                </>
              }
            />
          </div>
        )}
      </Celda>
    </tr>
  );
}
