"use client";

import { memo, useMemo, type KeyboardEvent } from "react";
import { Silla } from "./silla";
import type { Mesa as MesaDatos } from "@/lib/tipos";

type Props = {
  mesa: MesaDatos;
  /** Ids elegidos de ESTA mesa, en un string. Es lo que hace efectivo el memo:
   *  elegir una silla de la mesa 3 no vuelve a dibujar las otras 13. */
  seleccion: string;
  topeAlcanzado: boolean;
  onElegir: (id: number) => void;
};

function MesaBase({ mesa, seleccion, topeAlcanzado, onElegir }: Props) {
  const elegidos = useMemo(
    () => new Set(seleccion ? seleccion.split(",").map(Number) : []),
    [seleccion],
  );

  const izquierda = mesa.asientos.filter((a) => a.lado === "IZQUIERDA");
  const derecha = mesa.asientos.filter((a) => a.lado === "DERECHA");
  const mias = elegidos.size;

  // Solo la primera silla de cada mesa entra en el recorrido del tabulador:
  // 730 paradas de Tab no las usa nadie. Dentro de la mesa se mueve con flechas.
  function mover(e: KeyboardEvent<HTMLDivElement>) {
    const dir = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: 0, ArrowRight: 0 }[e.key];
    if (dir === undefined) return;

    const botones = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
    );
    const actual = botones.indexOf(document.activeElement as HTMLButtonElement);
    if (actual < 0) return;

    const corte = izquierda.length;
    const enIzquierda = actual < corte;
    const posicion = enIzquierda ? actual : actual - corte;

    let destino: number;
    if (e.key === "ArrowLeft") destino = enIzquierda ? actual : posicion;
    else if (e.key === "ArrowRight") destino = enIzquierda ? corte + posicion : actual;
    else destino = actual + dir;

    e.preventDefault();
    botones[destino]?.focus();
  }

  return (
    <div
      role="group"
      aria-label={`Mesa ${mesa.numero}`}
      className={[
        "rounded-sm border p-1.5 transition-colors duration-200",
        mias > 0
          ? "border-brass/60 bg-surface-high"
          : "border-line bg-surface-raised",
      ].join(" ")}
    >
      <p
        className={[
          "pb-1.5 text-center font-display text-lg leading-none tabular",
          mias > 0 ? "text-brass" : "text-ink-soft",
        ].join(" ")}
      >
        {mesa.numero}
      </p>

      <div className="flex justify-center gap-1" onKeyDown={mover}>
        {[izquierda, derecha].map((columna, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {columna.map((asiento, j) => (
              <Silla
                key={asiento.id}
                id={asiento.id}
                mesa={mesa.numero}
                // El numero global (1..730), que es el que ve la gente y el que
                // imprime el PDF. `posicion` solo ordena la columna.
                silla={asiento.numero}
                estado={asiento.estado}
                elegida={elegidos.has(asiento.id)}
                bloqueada={topeAlcanzado && !elegidos.has(asiento.id)}
                tamano="chico"
                onElegir={onElegir}
                tabuladle={i === 0 && j === 0}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const Mesa = memo(MesaBase);
