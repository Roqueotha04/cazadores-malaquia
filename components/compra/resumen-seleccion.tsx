"use client";

import { Boton } from "@/components/ui/boton";
import { precio, ubicacion } from "@/lib/formato";
import type { AsientoElegido } from "@/lib/tipos";

export function ResumenSeleccion({
  elegidos,
  precioCentavos,
  tope,
  minutos,
  ventasAbiertas,
  enviando,
  onQuitar,
  onContinuar,
}: {
  elegidos: AsientoElegido[];
  precioCentavos: number;
  tope: number;
  /** Cuánto se guardan las sillas, ya con el colchón del pago descontado. */
  minutos: number;
  ventasAbiertas: boolean;
  enviando: boolean;
  onQuitar: (id: number) => void;
  onContinuar: () => void;
}) {
  const total = elegidos.length * precioCentavos;
  const vacio = elegidos.length === 0;

  const motivo = !ventasAbiertas
    ? "La venta no está abierta."
    : vacio
      ? "Elegí al menos una silla para seguir."
      : null;

  return (
    <div className="rounded-sm border border-line bg-surface-raised">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-ink">Tu selección</h2>
        <span className="text-sm text-ink-faint tabular">
          {elegidos.length} de {tope}
        </span>
      </div>

      <div className="px-5 py-4">
        {vacio ? (
          /* Estado vacio que enseña la interfaz, no un "no hay nada". */
          <div className="py-2">
            <p className="text-sm text-ink-soft">
              Todavía no elegiste ninguna silla.
            </p>
            <p className="mt-2 text-sm text-ink-faint">
              Tocá las sillas libres del plano. Podés llevar hasta {tope} y las
              guardamos {minutos} minutos mientras completás tus datos.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {elegidos.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-sm bg-surface-sunken pl-3"
              >
                <span className="text-sm font-medium text-ink tabular">
                  {ubicacion(a.mesa, a.silla)}
                </span>
                <button
                  type="button"
                  onClick={() => onQuitar(a.id)}
                  className="min-h-[44px] rounded-sm px-3 text-sm text-ink-faint transition-colors duration-200 ease-[var(--ease-salida)] hover:bg-error/10 hover:text-error"
                  aria-label={`Quitar ${ubicacion(a.mesa, a.silla)}`}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="dato">Total</span>
          <span className="font-display text-2xl text-ink tabular">
            {precio(total)}
          </span>
        </div>

        <Boton
          onClick={onContinuar}
          disabled={!!motivo || enviando}
          cargando={enviando}
          className="mt-4 w-full"
        >
          {enviando ? "Un momento…" : "Continuar"}
        </Boton>

        {motivo && (
          <p className="mt-2.5 text-center text-sm text-ink-faint">{motivo}</p>
        )}
      </div>
    </div>
  );
}
