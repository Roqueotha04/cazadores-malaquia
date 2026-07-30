const PASOS = ["Elegir sillas", "Tus datos", "Pagar"] as const;

/**
 * "Paso 2 de 3", con los tres nombrados.
 *
 * Es la respuesta directa a que buena parte de este publico no tiene costumbre
 * de comprar online: saber cuanto falta es lo que evita que abandonen en el
 * formulario. Va arriba de cada pantalla del flujo.
 */
export function Pasos({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Progreso de la compra">
      <p className="dato mb-3 sm:hidden">
        Paso {actual} de 3 · {PASOS[actual - 1]}
      </p>

      <ol className="flex items-center gap-2 sm:gap-3">
        {PASOS.map((nombre, i) => {
          const n = i + 1;
          const hecho = n < actual;
          const aqui = n === actual;

          return (
            <li key={nombre} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className={[
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular",
                    aqui
                      ? "bg-brass text-carbon"
                      : hecho
                        ? "bg-surface-high text-ink"
                        : "border border-line text-ink-faint",
                  ].join(" ")}
                >
                  {hecho ? "✓" : n}
                </span>

                <span
                  className={[
                    "hidden truncate text-sm sm:block",
                    aqui
                      ? "font-semibold text-ink"
                      : hecho
                        ? "text-ink-soft"
                        : "text-ink-faint",
                  ].join(" ")}
                >
                  {nombre}
                </span>
              </div>

              {/* La linea que une un paso con el siguiente. */}
              {n < PASOS.length && (
                <span
                  aria-hidden
                  className={`h-px flex-1 ${hecho ? "bg-brass/50" : "bg-line"}`}
                />
              )}

              <span className="sr-only">
                {aqui ? "(paso actual)" : hecho ? "(completado)" : "(pendiente)"}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
