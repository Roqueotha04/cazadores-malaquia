"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DiaDeVenta } from "@/lib/admin/tipos";
import { diaLargo, precio } from "@/lib/formato";

/**
 * Un dia de venta, plegable.
 *
 * **Abren todos.** La pantalla se lee de corrido —cuánto se vendió cada día y
 * qué butacas fueron— y plegar es para sacarse de encima un día ya mirado, no
 * para evitar una carga: las entradas de todos los días ya vinieron con la
 * pagina. Por eso el estado es local y no `?dia=` en la URL: no hay nada que
 * pedir al abrir, y con todos abiertos no queda nada que pasar armado en un
 * link.
 *
 * La tabla llega como `children`, resuelta en el servidor.
 */
export function Dia({
  dia,
  maximo,
  children,
}: {
  dia: DiaDeVenta;
  /** Butacas del dia mas cargado, para que la barrita compare contra algo. */
  maximo: number;
  children: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(true);
  const id = useId();
  const quieto = useReducedMotion();
  const proporcion = maximo > 0 ? (dia.butacas / maximo) * 100 : 0;

  // Con `prefers-reduced-motion` el panel aparece y desaparece sin recorrido.
  const transicion = quieto
    ? { duration: 0 }
    : { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <section className="rounded-sm border border-line bg-surface-raised">
      <h2>
        <button
          type="button"
          onClick={() => setAbierta((previa) => !previa)}
          aria-expanded={abierta}
          aria-controls={id}
          className="flex min-h-14 w-full cursor-pointer items-center gap-4 px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-high sm:px-5"
        >
          <motion.span
            aria-hidden
            animate={{ rotate: abierta ? 90 : 0 }}
            transition={transicion}
            className="shrink-0 text-brass"
          >
            ▶
          </motion.span>

          <span className="min-w-0 flex-1">
            <span className="block font-sans text-sm font-semibold text-ink first-letter:uppercase">
              {diaLargo(dia.fecha)}
            </span>
            <span className="mt-1 block text-xs text-ink-faint tabular">
              {dia.ordenes.length}{" "}
              {dia.ordenes.length === 1 ? "compra" : "compras"}
            </span>
          </span>

          {/* La barrita no es adorno: puesta una debajo de la otra, deja ver de
              un vistazo que dias se vendio fuerte y cuales casi nada. */}
          <span
            aria-hidden
            className="hidden h-2 w-28 shrink-0 self-center rounded-sm bg-surface-sunken sm:block"
          >
            <span
              className="block h-full rounded-sm bg-brass/70"
              style={{ width: `${proporcion}%` }}
            />
          </span>

          <span className="shrink-0 text-right">
            <span className="block text-sm font-semibold text-ink tabular">
              {dia.butacas} {dia.butacas === 1 ? "entrada" : "entradas"}
            </span>
            <span className="mt-1 block text-xs text-ink-faint tabular">
              {precio(dia.totalCentavos)}
            </span>
          </span>
        </button>
      </h2>

      {/* `initial={false}`: al cargar la pantalla los dias ya estan abiertos y no
          tienen que desplegarse solos. */}
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            id={id}
            key="contenido"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transicion}
            className="overflow-hidden"
          >
            <div className="border-t border-line">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
