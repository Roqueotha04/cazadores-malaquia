"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlanoSalon } from "@/components/salon/plano-salon";
import { useSeleccion } from "@/components/salon/use-seleccion";
import { ResumenSeleccion } from "./resumen-seleccion";
import { Boton } from "@/components/ui/boton";
import { COLCHON_PAGO_MIN } from "@/lib/constantes";
import { precio } from "@/lib/formato";
import type { Mapa } from "@/lib/tipos";

/**
 * La pantalla de elegir silla.
 *
 * El plano y la logica de seleccion viven en `components/salon/`: los comparte
 * con el panel, que elige butacas para cargar una venta cobrada en efectivo y
 * para reubicar a alguien que pago y se quedo sin lugar. Lo que queda acá es lo
 * que solo pasa cuando compra el dueño de la silla: el precio, el tope del
 * evento y el camino al formulario.
 */
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

  const tope = mapa.evento.maxAsientosPorCompra;

  const { elegidos, detalle, ids, alternar, topeAlcanzado } = useSeleccion(
    mapa.mesas,
    { inicial, tope },
  );

  function continuar() {
    empezarNavegacion(() =>
      router.push(`/comprar/datos?asientos=${ids.join(",")}`),
    );
  }

  return (
    /* Filas explicitas: el plano y la ficha arrancando los dos en la fila 1, a
       la misma altura. `items-start` se queda — es lo que deja al aside
       encogerse a su contenido y le da lugar para deslizarse dentro de su area
       de grilla, que es lo que hace que el sticky funcione. */
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-x-8">
      <PlanoSalon
        mesas={mapa.mesas}
        elegidos={elegidos}
        topeAlcanzado={topeAlcanzado}
        onElegir={alternar}
        /* Se muestra mientras el tope está alcanzado, no una sola vez al
           llegar: es la explicación de por qué el resto de las sillas quedó
           apagado. Como aviso de un solo disparo no se veía nunca — la silla
           que sobra ya está deshabilitada y el toque no llega. */
        aviso={
          topeAlcanzado
            ? `Llegaste al máximo de ${tope} sillas por compra. Sacá una para elegir otra.`
            : ""
        }
      />

      {/* En el celular el resumen queda debajo del plano (ahí es donde se
          quitan sillas de a una); en escritorio va fijo al costado mientras se
          recorre el salón. La barra de abajo es un atajo, no un reemplazo. */}
      <aside className="lg:sticky lg:top-24">
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
