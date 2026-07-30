import { ubicacion } from "@/lib/formato";
import type { Entrada } from "@/lib/tipos";

/**
 * Una entrada. La ubicación es lo más grande de la tarjeta porque es lo que el
 * comprador va a mirar en la puerta del salón, probablemente con poca luz.
 *
 * El recorte a los costados imita el troquelado de un ticket: dos circulos del
 * color del fondo, sin imagen ni clip-path raro.
 */
export function TarjetaEntrada({
  entrada,
  titular,
}: {
  entrada: Entrada;
  titular: string;
}) {
  return (
    <li className="relative overflow-hidden rounded-sm border border-line bg-surface-raised">
      <div className="flex items-center justify-between gap-4 border-b border-dashed border-line px-5 py-3">
        <p className="dato">Entrada</p>
        <p className="text-xs text-ink-faint tabular">
          {entrada.codigo.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Troquelado */}
      <span
        aria-hidden
        className="absolute -left-2 top-[49px] size-4 rounded-full bg-surface"
      />
      <span
        aria-hidden
        className="absolute -right-2 top-[49px] size-4 rounded-full bg-surface"
      />

      <div className="px-5 py-6">
        <p className="font-display text-3xl text-ink tabular">
          {ubicacion(entrada.mesa, entrada.silla)}
        </p>
        <p className="mt-3 text-sm text-ink-soft">{titular}</p>
      </div>
    </li>
  );
}
