"use client";

import { Silla } from "./silla";
import { Boton } from "@/components/ui/boton";
import type { Mesa } from "@/lib/tipos";

/**
 * En el celular el plano se recorre en dos pasos: primero elegís la mesa de esta
 * grilla, después la silla. 730 chips de 20px en un teléfono no se pueden tocar,
 * y este público compra casi todo del celular.
 *
 * Las fichas van agrupadas por hilera y con el rótulo de dónde queda cada una:
 * es lo que ata la lista al plano de arriba. Sin eso "Mesa 9" no dice nada.
 */
export function GrillaMesas({
  arriba,
  abajo,
  elegidos,
  onAbrir,
}: {
  arriba: Mesa[];
  abajo: Mesa[];
  elegidos: Set<number>;
  onAbrir: (numero: number) => void;
}) {
  const hileras = [
    { clave: "ARRIBA", lado: "lado del escenario", mesas: arriba },
    { clave: "ABAJO", lado: "lado de la entrada", mesas: abajo },
  ].filter((hilera) => hilera.mesas.length > 0);

  return (
    <div className="mt-6 space-y-6">
      {hileras.map((hilera) => (
        <section key={hilera.clave}>
          <h3 className="dato">{rotulo(hilera.mesas, hilera.lado)}</h3>

          <ul className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {hilera.mesas.map((mesa) => (
              <li key={mesa.numero}>
                <TarjetaMesa
                  mesa={mesa}
                  elegidos={elegidos}
                  onAbrir={onAbrir}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** "Mesas 1 a 7 · lado del escenario" — los números salen de los datos. */
function rotulo(mesas: Mesa[], lado: string) {
  const numeros = mesas.map((m) => m.numero);
  return `Mesas ${Math.min(...numeros)} a ${Math.max(...numeros)} · ${lado}`;
}

function TarjetaMesa({
  mesa,
  elegidos,
  onAbrir,
}: {
  mesa: Mesa;
  elegidos: Set<number>;
  onAbrir: (numero: number) => void;
}) {
  const libres = mesa.asientos.filter((a) => a.estado === "DISPONIBLE").length;
  const mias = mesa.asientos.filter((a) => elegidos.has(a.id)).length;
  const llena = libres === 0;

  return (
    <button
      type="button"
      onClick={() => onAbrir(mesa.numero)}
      disabled={llena && mias === 0}
      className={[
        "w-full rounded-sm border p-4 text-left",
        "transition-[border-color,background-color,transform] duration-200 ease-[var(--ease-salida)]",
        "disabled:opacity-45 enabled:active:translate-y-px",
        mias > 0
          ? "border-brass/60 bg-surface-high"
          : "border-line bg-surface-raised enabled:hover:border-brass enabled:hover:bg-surface-high",
      ].join(" ")}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-display text-3xl leading-none text-ink tabular">
          {mesa.numero}
        </span>
        {mias > 0 && (
          <span className="rounded-full bg-brass px-2 py-0.5 text-xs font-semibold text-carbon tabular">
            {mias}
          </span>
        )}
      </span>

      <span className="mt-3 block text-sm text-ink-soft tabular">
        {llena ? "Sin lugares" : `${libres} de ${mesa.capacidad} libres`}
      </span>

      <span
        className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-sunken"
        aria-hidden
      >
        <span
          className={`block h-full ${llena ? "bg-silla-tomada" : "bg-silla-libre"}`}
          style={{ width: `${(libres / mesa.capacidad) * 100}%` }}
        />
      </span>
    </button>
  );
}

/** Las sillas de una sola mesa, en botones de 44px con el número a la vista. */
export function DetalleMesa({
  mesa,
  elegidos,
  topeAlcanzado,
  onElegir,
  onVolver,
}: {
  mesa: Mesa;
  elegidos: Set<number>;
  topeAlcanzado: boolean;
  onElegir: (id: number) => void;
  onVolver: () => void;
}) {
  const izquierda = mesa.asientos.filter((a) => a.lado === "IZQUIERDA");
  const derecha = mesa.asientos.filter((a) => a.lado === "DERECHA");
  const libres = mesa.asientos.filter((a) => a.estado === "DISPONIBLE").length;
  const mias = mesa.asientos.filter((a) => elegidos.has(a.id)).length;

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-ink">Mesa {mesa.numero}</h2>
          <p className="mt-1 text-sm text-ink-faint tabular">
            {libres} de {mesa.capacidad} sillas libres
          </p>
        </div>

        <Boton tono="secundario" medida="chico" onClick={onVolver}>
          <span aria-hidden>←</span> Ver todas las mesas
        </Boton>
      </div>

      <div className="mt-6 flex justify-center gap-4">
        {[izquierda, derecha].map((columna, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <p className="dato pb-1">{i === 0 ? "Lado A" : "Lado B"}</p>
            {columna.map((asiento) => (
              <Silla
                key={asiento.id}
                id={asiento.id}
                mesa={mesa.numero}
                silla={asiento.numero}
                estado={asiento.estado}
                elegida={elegidos.has(asiento.id)}
                bloqueada={topeAlcanzado && !elegidos.has(asiento.id)}
                tamano="grande"
                onElegir={onElegir}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Una mesa larga son 26 sillas por lado: mil trescientos pixeles de
          alto. La salida tiene que estar tambien al final, o para volver al
          salón hay que scrollear todo para arriba. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-ink-soft tabular">
          {mias === 0
            ? "Todavía no elegiste ninguna silla de esta mesa."
            : `${mias} ${mias === 1 ? "silla elegida" : "sillas elegidas"} en la mesa ${mesa.numero}.`}
        </p>

        <Boton tono="secundario" medida="chico" onClick={onVolver}>
          <span aria-hidden>←</span> Ver todas las mesas
        </Boton>
      </div>
    </div>
  );
}
