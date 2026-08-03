"use client";

import { useCallback, useMemo, useState } from "react";
import type { AsientoElegido, Mesa } from "@/lib/tipos";

/**
 * Elegir butacas en el plano.
 *
 * Lo comparten las tres pantallas que dejan tocar sillas: la compra del sitio,
 * la carga de una venta a mano y la reubicacion de un caso. Cambia el tope y
 * cambia que se hace despues, pero "tocar una silla la agrega o la saca, y hay
 * un limite" es lo mismo en las tres.
 *
 * El tope viene por parametro y no escrito acá: en la compra sale del evento
 * (`maxAsientosPorCompra`), en la carga a mano no hay —el contrato dice que esa
 * pantalla no valida el maximo— y en una reubicacion es una cantidad exacta que
 * deriva del cobro.
 *
 * El nombre arranca en ingles y el resto del archivo no: `use` no es una palabra
 * acá, es la marca por la que React reconoce un hook. Sin ella las reglas de
 * hooks no lo analizan y los errores aparecen recien en el navegador.
 */
export function useSeleccion(
  mesas: Mesa[],
  { inicial = [], tope = Infinity }: { inicial?: number[]; tope?: number } = {},
) {
  const [elegidos, setElegidos] = useState<Set<number>>(() => new Set(inicial));

  /**
   * Sumar o sacar una silla.
   *
   * El tope se respeta acá adentro, con el estado anterior a la vista, y no con
   * un espejo del estado afuera: la identidad de esta funcion no puede cambiar
   * en cada toque. `Mesa` esta memoizada justamente para que elegir una silla de
   * la mesa 3 no redibuje las otras trece, y un callback nuevo por toque
   * anularia ese memo y volveria a dibujar los 730 botones.
   */
  const alternar = useCallback(
    (id: number) => {
      setElegidos((previos) => {
        if (previos.has(id)) {
          const siguientes = new Set(previos);
          siguientes.delete(id);
          return siguientes;
        }

        // En la practica no se llega: al tocar la ultima silla permitida el
        // resto queda deshabilitado. Es la red por si alguna pantalla dibuja el
        // plano sin pasar `topeAlcanzado`.
        if (previos.size >= tope) return previos;

        return new Set(previos).add(id);
      });
    },
    [tope],
  );

  const limpiar = useCallback(() => setElegidos(new Set()), []);

  // id de silla → mesa y numero de silla. Es lo que traduce los ids que maneja
  // la API a "Mesa 13 · Silla 632", que es lo unico que se le dice a una
  // persona.
  const ubicaciones = useMemo(() => {
    const porId = new Map<number, AsientoElegido>();

    for (const mesa of mesas) {
      for (const asiento of mesa.asientos) {
        porId.set(asiento.id, {
          id: asiento.id,
          mesa: mesa.numero,
          silla: asiento.numero,
        });
      }
    }

    return porId;
  }, [mesas]);

  const detalle = useMemo(
    () =>
      [...elegidos]
        .map((id) => ubicaciones.get(id))
        .filter((a): a is AsientoElegido => !!a)
        .sort((a, b) => a.mesa - b.mesa || a.silla - b.silla),
    [elegidos, ubicaciones],
  );

  // Los ids listos para enviar: sin repetidos —el Set ya lo garantiza— y
  // ordenados. El backend cuenta los repetidos una sola vez igual, pero mandar
  // la lista limpia evita discutirlo.
  const ids = useMemo(() => [...elegidos].sort((a, b) => a - b), [elegidos]);

  return {
    elegidos,
    detalle,
    ubicaciones,
    ids,
    alternar,
    limpiar,
    topeAlcanzado: elegidos.size >= tope,
  };
}

/** "Mesa 3 · Silla 145, Mesa 3 · Silla 146" — para nombrar butacas en un aviso. */
export function nombrarButacas(
  ids: number[],
  ubicaciones: Map<number, AsientoElegido>,
) {
  return ids
    .map((id) => {
      const a = ubicaciones.get(id);
      return a ? `Mesa ${a.mesa} · Silla ${a.silla}` : `#${id}`;
    })
    .join(", ");
}
