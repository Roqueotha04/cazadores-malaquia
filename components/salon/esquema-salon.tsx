"use client";

import type { Mesa } from "@/lib/tipos";

/**
 * El salon en miniatura, para el celular.
 *
 * En el telefono las 730 sillas no se pueden tocar y se elige por mesa, de una
 * lista de fichas. El problema de la lista sola es que "Mesa 9" no le dice nada
 * a nadie: no se sabe si queda cerca del escenario, del baño o de la puerta.
 * Esto va arriba de la lista y contesta esa pregunta —el mismo plano de
 * escritorio, sin sillas— asi la mesa se elige mirando el salon y se confirma
 * en la ficha, que es donde entra el detalle.
 *
 * **No se toca.** Es una guia visual, no un segundo selector: se mira acá y se
 * elige abajo. Por eso son cajas y no botones, y por eso las mesas pueden ser
 * angostas y altas —la proporcion real de una mesa larga— sin pelearse con el
 * minimo de 44px, que solo rige para lo que se toca. Sin botones tampoco mete
 * catorce paradas nuevas en el tabulador.
 *
 * Va `aria-hidden` a proposito: cada mesa esta abajo en su ficha, con el numero
 * y cuanto le queda libre en texto, y las fichas van agrupadas por hilera con
 * el rotulo de donde queda cada una. Repetirlo acá seria leer dos veces el
 * mismo salon.
 */
export function EsquemaSalon({
  arriba,
  abajo,
  elegidos,
  abierta,
}: {
  arriba: Mesa[];
  abajo: Mesa[];
  elegidos: Set<number>;
  /** La mesa que esta abierta abajo, para marcarla en el plano. */
  abierta: number | null;
}) {
  return (
    /* El ancho tope mantiene la proporcion de las mesas en tablet: sin el, a
       768px quedan siete cuadrados anchos en vez de siete mesas largas. */
    <div className="mx-auto mt-3 max-w-sm" aria-hidden>
      {/* Los baños flanquean el escenario, como en el salón real. El 18% es la
          misma tajada que se llevan en el plano de escritorio. */}
      <div className="flex items-stretch gap-1.5">
        <Marca className="w-[18%] shrink-0">Baño</Marca>
        <Marca className="flex-1">Escenario</Marca>
        <Marca className="w-[18%] shrink-0">Baño</Marca>
      </div>

      {/* Las mesas arrancan un poco mas abajo que el resto de los huecos: el
          escenario necesita su aire para leerse como escenario. */}
      <Hilera
        mesas={arriba}
        elegidos={elegidos}
        abierta={abierta}
        className="mt-3"
      />

      {/* La entrada es una puerta contra la pared izquierda, no un frente
          abierto de punta a punta. Misma proporcion que en escritorio —dos de
          ancho por tres de alto—, con el rotulo en vertical: acostado no entra
          en 40px, y parado se lee como el marco de una puerta. */}
      <div className="my-2 flex">
        <Marca className="h-15 w-10 [writing-mode:vertical-rl]">Entrada</Marca>
      </div>

      <Hilera
        mesas={abajo}
        elegidos={elegidos}
        abierta={abierta}
        className="mt-2"
      />
    </div>
  );
}

/** Escenario, baños, entrada: los puntos de referencia del salón real. */
function Marca({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`dato flex min-h-8 items-center justify-center rounded-sm border border-dashed border-line px-1 text-center text-[0.625rem] leading-tight ${className}`}
    >
      {children}
    </p>
  );
}

/** Una hilera de siete mesas, vistas desde arriba. */
function Hilera({
  mesas,
  elegidos,
  abierta,
  className,
}: {
  mesas: Mesa[];
  elegidos: Set<number>;
  abierta: number | null;
  /** La separacion con lo que tiene arriba: el escenario pide mas que la puerta. */
  className: string;
}) {
  return (
    /* Los porcentajes copian el reparto del plano de escritorio: 2.5% de
       pasillo contra cada pared y un hueco entre mesas de la mitad del ancho
       de una mesa. Con `gap-1.5` fijo las catorce quedaban amontonadas y las
       dos vistas no se parecian en nada. */
    <ul className={`grid grid-cols-7 gap-x-[5%] px-[2.5%] ${className}`}>
      {mesas.map((mesa) => {
        const libres = mesa.asientos.filter(
          (a) => a.estado === "DISPONIBLE",
        ).length;
        const mias = mesa.asientos.filter((a) => elegidos.has(a.id)).length;
        const llena = libres === 0;

        return (
          <li
            key={mesa.numero}
            className={[
              "flex h-30 flex-col items-center rounded-sm border pt-1.5",
              abierta === mesa.numero
                ? "ring-2 ring-brass ring-offset-1 ring-offset-surface-sunken"
                : "",
              mias > 0
                ? "border-brass bg-surface-high"
                : llena
                  ? // Mismo lenguaje que la silla ocupada: rayas ademas de
                    // color, para que no dependa de distinguir tonos.
                    "rayada border-line bg-silla-tomada/40"
                  : "border-line-strong bg-surface-raised",
            ].join(" ")}
          >
            <span
              className={`font-display text-sm leading-none tabular ${
                mias > 0 ? "text-brass" : llena ? "text-ink-faint" : "text-ink-soft"
              }`}
            >
              {mesa.numero}
            </span>

            {/* Cuánto le queda libre, a lo largo de la mesa: la misma lectura
                que la barra de la ficha, puesta en vertical porque acá la mesa
                es alta y angosta. */}
            <span className="my-2 flex w-1.5 flex-1 flex-col justify-end overflow-hidden rounded-full bg-surface-sunken">
              <span
                className="w-full bg-silla-libre"
                style={{ height: `${(libres / mesa.capacidad) * 100}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
