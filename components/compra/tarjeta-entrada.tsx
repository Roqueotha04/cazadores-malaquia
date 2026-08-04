import { ubicacion } from "@/lib/formato";
import type { Entrada } from "@/lib/tipos";

/**
 * Una entrada. La ubicación es lo más grande de la tarjeta porque es lo que el
 * comprador va a mirar en la puerta del salón, probablemente con poca luz.
 *
 * Formato horizontal: quien compra 6 sillas tiene 6 de estas, y en tarjetas
 * altas la lista se volvía un scroll largo donde la comparación entre una y
 * otra se perdía. Apiladas y bajas se leen de un vistazo.
 *
 * El código va completo y seleccionable. Todavía no hay QR: en la puerta buscan
 * al invitado por DNI y este código es lo único que confirma que la entrada es
 * la que dice ser, así que recortarlo a ocho caracteres no confirmaba nada.
 *
 * El recorte a los costados imita el troquelado de un ticket: dos circulos del
 * color del fondo, sin imagen ni clip-path raro.
 */
export function TarjetaEntrada({ entrada }: { entrada: Entrada }) {
  return (
    <li className="relative overflow-hidden rounded-sm border border-line bg-surface-raised px-6 py-4">
      {/* Troquelado. Centrado con transform y no con un top fijo: así no hay que
          recalcularlo si cambia el alto de la tarjeta. */}
      <span
        aria-hidden
        className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-surface"
      />
      <span
        aria-hidden
        className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-surface"
      />

      {/* Envuelve en vez de recortar: `shrink-0` con `truncate` se anulaban entre
          si —el nombre no cedia y la tarjeta, que es `overflow-hidden` por el
          troquelado, se lo comia sin puntos suspensivos. En un telefono angosto
          "Mesa 13 · Silla 107" mas un apellido largo no entran en un renglon, y
          el nombre del titular es justo lo que se muestra en la puerta. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-xl text-ink tabular sm:text-2xl">
          {ubicacion(entrada.mesaNumero, entrada.asientoNumero)}
        </p>
        <p className="text-sm text-ink-soft">{entrada.titular}</p>
      </div>

      <div className="mt-3 border-t border-dashed border-line pt-3">
        <p className="dato">Código de la entrada</p>
        <p className="mt-1 text-xs text-ink-faint tabular select-all break-all sm:text-sm">
          {entrada.codigo}
        </p>
      </div>
    </li>
  );
}
