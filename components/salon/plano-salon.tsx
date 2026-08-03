"use client";

import { useMemo, useState } from "react";
import { Mesa } from "@/components/compra/mesa";
import { GrillaMesas, DetalleMesa } from "@/components/compra/vista-celular";
import type { Mesa as MesaDatos } from "@/lib/tipos";

/**
 * El plano del salon: catorce mesas, 730 sillas, dos formas de recorrerlo.
 *
 * Presentacion pura. No sabe para que se estan eligiendo las butacas —una
 * compra, una venta cobrada en efectivo, la reubicacion de alguien que pago y
 * se quedo sin lugar— ni a donde se va despues. Recibe que esta elegido y avisa
 * cuando se toca algo.
 *
 * En escritorio se dibuja el salon entero con las dos hileras, el escenario y
 * los baños donde estan de verdad. En el celular se recorre en dos pasos, mesa
 * y despues silla: 730 chips de 20px en un telefono no se pueden tocar, y este
 * publico compra casi todo del celular.
 */
export function PlanoSalon({
  mesas,
  elegidos,
  topeAlcanzado = false,
  onElegir,
  aviso,
  tituloCelular = "Elegí tu mesa",
  ayudaCelular = "El escenario está del lado de las mesas 1 a 7, con los baños a los costados.",
  rotuloElegida = "Tu elección",
}: {
  mesas: MesaDatos[];
  elegidos: Set<number>;
  /** Bloquea las sillas que no estan elegidas: ya no se puede sumar ninguna. */
  topeAlcanzado?: boolean;
  onElegir: (id: number) => void;
  /** Mensaje debajo del plano. Su lugar se reserva para que nada salte. */
  aviso?: string;
  tituloCelular?: string;
  ayudaCelular?: string;
  /** "Tu elección" cuando compra el dueño de la silla; "Elegida" en el panel. */
  rotuloElegida?: string;
}) {
  const [mesaAbierta, setMesaAbierta] = useState<number | null>(null);

  // Un string por mesa con sus sillas elegidas: es lo que hace efectivo el memo
  // de `Mesa`, y lo que hace que elegir una silla de la mesa 3 no vuelva a
  // dibujar las otras trece.
  const seleccionPorMesa = useMemo(() => {
    const porMesa = new Map<number, number[]>();

    for (const mesa of mesas) {
      const mias = mesa.asientos
        .filter((a) => elegidos.has(a.id))
        .map((a) => a.id);

      if (mias.length > 0) porMesa.set(mesa.numero, mias);
    }

    return porMesa;
  }, [mesas, elegidos]);

  const mesaDetalle = mesas.find((m) => m.numero === mesaAbierta);

  return (
    <div>
      <Referencias rotuloElegida={rotuloElegida} />

      {/* Escritorio: el salón entero */}
      <div className="veteada mt-5 hidden overflow-x-auto rounded-sm border border-line bg-surface-sunken p-6 lg:block">
        <div className="min-w-3xl">
          {/* Los baños flanquean el escenario, como en el salón real. */}
          <div className="flex items-stretch gap-3">
            <Bano>Baño mujeres</Bano>
            <Hito className="flex-1">Escenario</Hito>
            <Bano>Baño hombres</Bano>
          </div>

          <div className="mt-5 flex justify-center gap-3">
            {mesas
              .filter((m) => m.fila === "ARRIBA")
              .map((mesa) => (
                <Mesa
                  key={mesa.numero}
                  mesa={mesa}
                  seleccion={(seleccionPorMesa.get(mesa.numero) ?? []).join(",")}
                  topeAlcanzado={topeAlcanzado}
                  onElegir={onElegir}
                />
              ))}
          </div>

          <div className="my-5">
            <Hito>Entrada</Hito>
          </div>

          <div className="flex justify-center gap-3">
            {mesas
              .filter((m) => m.fila === "ABAJO")
              .map((mesa) => (
                <Mesa
                  key={mesa.numero}
                  mesa={mesa}
                  seleccion={(seleccionPorMesa.get(mesa.numero) ?? []).join(",")}
                  topeAlcanzado={topeAlcanzado}
                  onElegir={onElegir}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Celular: elegir mesa, después silla */}
      <div className="veteada mt-5 rounded-sm border border-line bg-surface-sunken p-5 lg:hidden">
        {mesaDetalle ? (
          <DetalleMesa
            mesa={mesaDetalle}
            elegidos={elegidos}
            topeAlcanzado={topeAlcanzado}
            onElegir={onElegir}
            onVolver={() => setMesaAbierta(null)}
          />
        ) : (
          <>
            <h2 className="text-ink">{tituloCelular}</h2>
            <p className="mt-1.5 pb-5 text-sm text-ink-soft">{ayudaCelular}</p>
            <GrillaMesas
              mesas={mesas}
              elegidos={elegidos}
              onAbrir={setMesaAbierta}
            />
          </>
        )}
      </div>

      <p aria-live="polite" className="mt-3 min-h-6 text-sm font-medium text-alerta">
        {aviso}
      </p>
    </div>
  );
}

/** Escenario / Entrada: los puntos de referencia del salón real. */
function Hito({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`dato rounded-sm border border-dashed border-line py-2 text-center ${className}`}
    >
      {children}
    </p>
  );
}

/** Mismo lenguaje que el Hito, pero angosto: van a los costados del escenario. */
function Bano({ children }: { children: React.ReactNode }) {
  return (
    <p className="dato flex w-28 shrink-0 items-center justify-center rounded-sm border border-dashed border-line px-2 text-center leading-tight">
      {children}
    </p>
  );
}

function Referencias({ rotuloElegida }: { rotuloElegida: string }) {
  const items = [
    { clase: "border-line-strong bg-silla-libre", texto: "Libre" },
    { clase: "border-brass-light bg-silla-elegida", texto: rotuloElegida },
    { clase: "border-line bg-silla-tomada rayada", texto: "Ocupada" },
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((item) => (
        <li
          key={item.texto}
          className="flex items-center gap-2 text-sm text-ink-soft"
        >
          <span
            className={`h-3.5 w-5 rounded-[2px] border ${item.clase}`}
            aria-hidden
          />
          {item.texto}
        </li>
      ))}
    </ul>
  );
}
