"use client";

import { useMemo, useState } from "react";
import { Mesa } from "@/components/compra/mesa";
import { GrillaMesas, DetalleMesa } from "@/components/compra/vista-celular";
import { EsquemaSalon } from "./esquema-salon";
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
 * publico compra casi todo del celular. Ahi el salon igual va arriba, en
 * miniatura y sin sillas (`EsquemaSalon`), porque la mesa se elige por donde
 * queda —escenario, puerta— y eso una lista de fichas sola no lo dice.
 *
 * Cual de las dos vistas va no lo decide solo el ancho: pide `lg` **y** un
 * puntero fino. Un iPad en horizontal mide 1194px y con la regla de ancho sola
 * caia en el plano de escritorio, donde cada silla es un chip de 20×14 — el
 * minimo del proyecto es 44 y con el dedo eso no se acierta. `pointer: fine`
 * mira el puntero primario, asi que un notebook con pantalla tactil pero
 * trackpad sigue viendo el salon entero, que es lo correcto. Si el navegador no
 * entiende la consulta, la que queda es la vista tocable: el error barato.
 */
export function PlanoSalon({
  mesas,
  elegidos,
  topeAlcanzado = false,
  onElegir,
  aviso,
  tituloCelular = "Elegí tu mesa",
  ayudaCelular = "Ubicala en el plano y tocá su ficha para ver las sillas.",
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

  // Las dos hileras, cada una en el orden en que se dibujan de izquierda a
  // derecha. El orden lo manda `orden` y no la posicion en el array: el backend
  // no promete devolverlas ordenadas.
  const arriba = useMemo(() => hilera(mesas, "ARRIBA"), [mesas]);
  const abajo = useMemo(() => hilera(mesas, "ABAJO"), [mesas]);

  const mesaDetalle = mesas.find((m) => m.numero === mesaAbierta);

  return (
    <div>
      <Referencias rotuloElegida={rotuloElegida} />

      {/* Escritorio: el salón entero.

          `justify-between` reparte las mesas en pasillos parejos, y el pasillo
          contra la pared son las dos cosas juntas: el padding del panel mas el
          2.5% de cada hilera. Los hitos —escenario, baños, entrada— si van de
          pared a pared: son la pared.

          El `min-w` es esa hilera completa: siete mesas de 58px, seis huecos y
          el 5% de los costados. El viejo `min-w-3xl` (768px) hacia scrollear
          al pedo en pantallas de 1024, donde esta columna mide unos 600px. */}
      <div className="veteada mt-5 hidden overflow-x-auto overscroll-x-contain rounded-sm border border-line bg-surface-sunken px-2 py-6 lg:pointer-fine:block">
        <div className="min-w-[30rem]">
          {/* Los baños flanquean el escenario, como en el salón real. */}
          <div className="flex items-stretch gap-3">
            <Bano>Baño mujeres</Bano>
            <Hito className="flex-1">Escenario</Hito>
            <Bano>Baño hombres</Bano>
          </div>

          <div className="mt-5 flex justify-between gap-2 px-[2.5%]">
            {arriba.map((mesa) => (
              <Mesa
                key={mesa.numero}
                mesa={mesa}
                seleccion={(seleccionPorMesa.get(mesa.numero) ?? []).join(",")}
                topeAlcanzado={topeAlcanzado}
                onElegir={onElegir}
              />
            ))}
          </div>

          {/* La entrada es una puerta contra la pared izquierda, no un frente
              abierto de punta a punta: se entra por ese costado del salón. Va
              en proporcion de puerta —dos de ancho por tres de alto, 72×108—
              y con medida fija: una puerta no se estira con el salón. */}
          <div className="my-5 flex">
            <Hito className="flex h-27 w-18 items-center justify-center px-1">
              Entrada
            </Hito>
          </div>

          <div className="flex justify-between gap-2 px-[2.5%]">
            {abajo.map((mesa) => (
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

      {/* Celular: el plano arriba para ubicarse, las fichas abajo para elegir.

          Van en dos fichas separadas porque son dos cosas distintas: arriba se
          mira, abajo se toca. El plano queda a la vista tambien con una mesa
          abierta —con esa mesa marcada— asi no se pierde de donde salio. */}
      <div className="veteada mt-5 block rounded-sm border border-line bg-surface-sunken p-4 sm:p-5 lg:pointer-fine:hidden">
        <p className="dato">El salón</p>

        <EsquemaSalon
          arriba={arriba}
          abajo={abajo}
          elegidos={elegidos}
          abierta={mesaAbierta}
        />
      </div>

      <div className="veteada mt-4 block rounded-sm border border-line bg-surface-sunken p-4 sm:p-5 lg:pointer-fine:hidden">
        <h2 className="text-ink">{tituloCelular}</h2>
        <p className="mt-1.5 text-sm text-ink-soft">{ayudaCelular}</p>

        {mesaDetalle ? (
          <DetalleMesa
            mesa={mesaDetalle}
            elegidos={elegidos}
            topeAlcanzado={topeAlcanzado}
            onElegir={onElegir}
            onVolver={() => setMesaAbierta(null)}
          />
        ) : (
          <GrillaMesas
            arriba={arriba}
            abajo={abajo}
            elegidos={elegidos}
            onAbrir={setMesaAbierta}
          />
        )}
      </div>

      <p aria-live="polite" className="mt-3 min-h-6 text-sm font-medium text-alerta">
        {aviso}
      </p>
    </div>
  );
}

/** Las mesas de una hilera, de izquierda a derecha. `filter` ya copia el array. */
function hilera(mesas: MesaDatos[], fila: MesaDatos["fila"]) {
  return mesas.filter((m) => m.fila === fila).sort((a, b) => a.orden - b.orden);
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
