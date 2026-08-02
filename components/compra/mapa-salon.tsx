"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mesa } from "./mesa";
import { GrillaMesas, DetalleMesa } from "./vista-celular";
import { ResumenSeleccion } from "./resumen-seleccion";
import { Boton } from "@/components/ui/boton";
import { COLCHON_PAGO_MIN } from "@/lib/constantes";
import { precio } from "@/lib/formato";
import type { AsientoElegido, Mapa } from "@/lib/tipos";

export function MapaSalon({
  mapa,
  inicial,
}: {
  mapa: Mapa;
  /** Sillas ya elegidas, si la persona volvió desde el formulario. */
  inicial: number[];
}) {
  const router = useRouter();
  const [navegando, empezarNavegacion] = useTransition();

  const [elegidos, setElegidos] = useState<Set<number>>(() => new Set(inicial));
  const [mesaAbierta, setMesaAbierta] = useState<number | null>(null);
  const [aviso, setAviso] = useState("");

  const tope = mapa.evento.maxAsientosPorCompra;
  const topeAlcanzado = elegidos.size >= tope;

  // id de silla → mesa y número de silla, para armar el resumen y los avisos.
  const ubicaciones = useMemo(() => {
    const mapaIds = new Map<number, AsientoElegido>();
    for (const mesa of mapa.mesas) {
      for (const a of mesa.asientos) {
        mapaIds.set(a.id, { id: a.id, mesa: mesa.numero, silla: a.numero });
      }
    }
    return mapaIds;
  }, [mapa]);

  const detalle = useMemo(
    () =>
      [...elegidos]
        .map((id) => ubicaciones.get(id))
        .filter((a): a is AsientoElegido => !!a)
        .sort((a, b) => a.mesa - b.mesa || a.silla - b.silla),
    [elegidos, ubicaciones],
  );

  // Un string por mesa con sus sillas elegidas: es lo que hace que elegir una
  // silla no vuelva a dibujar las otras 13 mesas.
  const seleccionPorMesa = useMemo(() => {
    const porMesa = new Map<number, number[]>();
    for (const a of detalle) {
      porMesa.set(a.mesa, [...(porMesa.get(a.mesa) ?? []), a.id]);
    }
    return porMesa;
  }, [detalle]);

  const alternar = useCallback(
    (id: number) => {
      setElegidos((previos) => {
        const siguientes = new Set(previos);

        if (siguientes.has(id)) {
          siguientes.delete(id);
          setAviso("");
          return siguientes;
        }

        if (siguientes.size >= tope) {
          setAviso(`Llegaste al máximo de ${tope} sillas por compra.`);
          return previos;
        }

        siguientes.add(id);
        setAviso("");
        return siguientes;
      });
    },
    [tope],
  );

  function continuar() {
    const ids = [...elegidos].sort((a, b) => a - b).join(",");
    empezarNavegacion(() => router.push(`/comprar/datos?asientos=${ids}`));
  }

  const mesaDetalle = mapa.mesas.find((m) => m.numero === mesaAbierta);

  return (
    /* Filas explicitas: la leyenda arriba de todo, y el plano y la ficha
       arrancando los dos en la fila 2, a la misma altura. `items-start` se
       queda — es lo que deja al aside encogerse a su contenido y le da lugar
       para deslizarse dentro de su area de grilla, que es lo que hace que el
       sticky funcione. */
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-5">
      <Referencias />

      <div className="lg:col-start-1 lg:row-start-2">
        {/* Escritorio: el salón entero */}
        <div className="veteada hidden overflow-x-auto rounded-sm border border-line bg-surface-sunken p-6 lg:block">
          <div className="min-w-3xl">
            {/* Los baños flanquean el escenario, como en el salón real. */}
            <div className="flex items-stretch gap-3">
              <Bano>Baño mujeres</Bano>
              <Hito className="flex-1">Escenario</Hito>
              <Bano>Baño hombres</Bano>
            </div>

            <div className="mt-5 flex justify-center gap-3">
              {mapa.mesas
                .filter((m) => m.fila === "ARRIBA")
                .map((mesa) => (
                  <Mesa
                    key={mesa.numero}
                    mesa={mesa}
                    seleccion={(seleccionPorMesa.get(mesa.numero) ?? []).join(",")}
                    topeAlcanzado={topeAlcanzado}
                    onElegir={alternar}
                  />
                ))}
            </div>

            <div className="my-5">
              <Hito>Entrada</Hito>
            </div>

            <div className="flex justify-center gap-3">
              {mapa.mesas
                .filter((m) => m.fila === "ABAJO")
                .map((mesa) => (
                  <Mesa
                    key={mesa.numero}
                    mesa={mesa}
                    seleccion={(seleccionPorMesa.get(mesa.numero) ?? []).join(",")}
                    topeAlcanzado={topeAlcanzado}
                    onElegir={alternar}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Celular: elegir mesa, después silla */}
        <div className="veteada rounded-sm border border-line bg-surface-sunken p-5 lg:hidden">
          {mesaDetalle ? (
            <DetalleMesa
              mesa={mesaDetalle}
              elegidos={elegidos}
              topeAlcanzado={topeAlcanzado}
              onElegir={alternar}
              onVolver={() => setMesaAbierta(null)}
            />
          ) : (
            <>
              <h2 className="text-ink">Elegí tu mesa</h2>
              <p className="mt-1.5 pb-5 text-sm text-ink-soft">
                El escenario está del lado de las mesas 1 a 7, con los baños a
                los costados.
              </p>
              <GrillaMesas
                mesas={mapa.mesas}
                elegidos={elegidos}
                onAbrir={setMesaAbierta}
              />
            </>
          )}
        </div>

        <p
          aria-live="polite"
          className="mt-3 min-h-6 text-sm font-medium text-alerta"
        >
          {aviso}
        </p>
      </div>

      {/* En el celular el resumen queda debajo del plano (ahí es donde se
          quitan sillas de a una); en escritorio va fijo al costado mientras se
          recorre el salón. La barra de abajo es un atajo, no un reemplazo. */}
      <aside className="lg:col-start-2 lg:row-start-2 lg:sticky lg:top-24">
        <ResumenSeleccion
          elegidos={detalle}
          precioCentavos={mapa.evento.precioCentavos}
          tope={tope}
          minutos={mapa.evento.minutosReserva - COLCHON_PAGO_MIN}
          ventasAbiertas={mapa.evento.ventasAbiertas}
          enviando={navegando}
          onQuitar={alternar}
          onContinuar={continuar}
        />
      </aside>

      {/* Barra fija: la acción principal siempre al alcance del pulgar. */}
      {detalle.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[var(--z-barra)] border-t border-line bg-surface-high/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div>
              <p className="text-xs text-ink-faint tabular">
                {detalle.length} {detalle.length === 1 ? "silla" : "sillas"} de{" "}
                {tope}
              </p>
              <p className="font-display text-xl text-ink tabular">
                {precio(detalle.length * mapa.evento.precioCentavos)}
              </p>
            </div>
            <Boton
              onClick={continuar}
              disabled={navegando || !mapa.evento.ventasAbiertas}
              cargando={navegando}
            >
              Continuar
            </Boton>
          </div>
        </div>
      )}
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

function Referencias() {
  const items = [
    { clase: "border-line-strong bg-silla-libre", texto: "Libre" },
    { clase: "border-brass-light bg-silla-elegida", texto: "Tu elección" },
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
