import { atenderError } from "@/lib/admin/acciones/errores";
import {
  GRAVEDAD,
  rotuloTipoError,
  type ErrorOperativo,
} from "@/lib/admin/tipos";
import { fechaCorta } from "@/lib/formato";
import { AccionConfirmada } from "../ui/accion-confirmada";
import { Pildora, type Tono } from "../ui/piezas";

/**
 * Un error operativo, como ficha.
 *
 * Ficha y no fila de tabla porque el dato principal es el `mensaje`, que es
 * prosa escrita para leerse: en una celda de tabla se corta o desarma la grilla.
 *
 * **El color sale de `gravedad`, nunca del tipo.** La lista de tipos es abierta
 * —la columna no tiene `CHECK` en la base— y uno nuevo puede aparecer sin aviso.
 * Si no lo conocemos, la ficha se pinta igual y el `mensaje` cuenta lo que pasó.
 */
export function FichaError({ error }: { error: ErrorOperativo }) {
  const atendido = error.atendidoEl !== null;
  const rotulo = rotuloTipoError(error.tipo);

  return (
    <li
      className={`rounded-sm border bg-surface-raised p-4 sm:p-5 ${
        atendido
          ? "border-line"
          : error.gravedad === "URGENTE"
            ? "border-error/50"
            : "border-alerta/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="max-w-[65ch] text-ink">{error.mensaje}</p>
          {error.detalle && (
            <p className="mt-1.5 max-w-[65ch] text-sm text-ink-soft">
              {error.detalle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Pildora tono={atendido ? "neutro" : TONO_GRAVEDAD[error.gravedad]}>
            {GRAVEDAD[error.gravedad]}
          </Pildora>
          {/* Sin rotulo conocido no se muestra la constante cruda: no le dice
              nada a quien atiende y el mensaje ya explica el caso. */}
          {rotulo && <Pildora tono="neutro">{rotulo}</Pildora>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
        <span className="tabular">{fechaCorta(error.ocurrioEl)}</span>

        {error.ordenId !== null && (
          <span className="tabular">
            Orden n.º {error.ordenId}
            {/* El token no viene por ningun campo, y es a proposito: es la
                credencial con la que se bajan esas entradas y esta pantalla se
                comparte por captura. Para abrir la compra hay que buscarla por
                el comprador. */}
            <span className="ml-2 text-xs text-ink-faint">
              buscala por DNI o apellido en Órdenes
            </span>
          </span>
        )}

        {error.ruta && (
          /* `break-all`: el patron del endpoint es una tira sin espacios y en un
             telefono se pasa del ancho de la ficha si no se le deja cortar. */
          <span className="min-w-0 tabular">
            <code className="break-all text-ink-soft">{error.ruta}</code>
            <span className="ml-2 text-xs text-ink-faint">
              es el patrón del endpoint, no una dirección que se pueda abrir
            </span>
          </span>
        )}
      </div>

      <div className="mt-4">
        {atendido ? (
          <p className="text-sm text-ink-faint tabular">
            Atendido el {fechaCorta(error.atendidoEl)}
          </p>
        ) : (
          <AccionConfirmada
            etiqueta="Marcar como atendido"
            confirmar="Sí, ya me ocupé"
            accion={atenderError.bind(null, error.id)}
            pregunta="Sale de la lista de pendientes. No deshace ni arregla nada: es la marca de que alguien ya se ocupó de esto por fuera de la app."
          />
        )}
      </div>
    </li>
  );
}

/** Urgente es plata o gente sin entradas. Revisar puede esperar al lunes. */
const TONO_GRAVEDAD: Record<ErrorOperativo["gravedad"], Tono> = {
  URGENTE: "error",
  REVISAR: "alerta",
};
