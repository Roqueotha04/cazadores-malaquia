import "server-only";

import { aFecha, pedir, pedirOpcional } from "./api";
import type {
  Asiento,
  Entrada,
  EstadoAsiento,
  Evento,
  Mapa,
  Mesa,
  Orden,
} from "./tipos";

/**
 * Lecturas del frontend. Las paginas solo llaman a estas funciones.
 *
 * El contrato es `.claude/api-frontend.md`. De el salen tres cosas que se
 * asumen en todo este archivo:
 *
 *   1. El JSON viene en camelCase, igual que `lib/tipos.ts`.
 *   2. Las fechas son strings ISO-8601 con offset ("2026-08-03T21:00:00-03:00").
 *   3. Los montos son enteros en centavos.
 */

// Los tipos "en el cable": iguales a los del dominio pero con las fechas como
// string, que es lo unico que sabe transportar JSON.
type EventoJson = Omit<Evento, "fecha"> & { fecha: string | null };
type EntradaJson = Omit<Entrada, "usadoEl"> & { usadoEl: string | null };

export type OrdenJson = Omit<Orden, "creadoEl" | "expiraEn" | "pagadoEl"> & {
  creadoEl: string | null;
  expiraEn: string | null;
  pagadoEl: string | null;
};

export async function obtenerEvento(): Promise<Evento> {
  const evento = await pedir<EventoJson>("/api/evento");

  return { ...evento, fecha: aFecha(evento.fecha) };
}

/**
 * El plano completo: el evento, las 14 mesas y sus butacas con el estado de
 * cada una.
 *
 * `GET /api/mapa` devuelve solo las mesas, asi que el evento se pide en
 * paralelo: los componentes del plano necesitan el precio, el tope por compra y
 * si las ventas estan abiertas.
 */
export async function obtenerMapa(): Promise<Mapa> {
  const [evento, mesas] = await Promise.all([obtenerEvento(), pedirMesas()]);

  return { evento, mesas };
}

/** Cuantas butacas quedan libres, para mostrarlo en la landing. */
export async function contarDisponibles(): Promise<number> {
  return contar(await pedirMesas());
}

/** Las butacas elegidas, con su mesa y su numero, para mostrar el resumen. */
export async function obtenerAsientosElegidos(
  ids: number[],
): Promise<AsientoConsultado[]> {
  if (ids.length === 0) return [];

  const porId = new Map<number, AsientoConsultado>();

  for (const mesa of await pedirMesas()) {
    for (const asiento of mesa.asientos) {
      porId.set(asiento.id, {
        id: asiento.id,
        mesa: mesa.numero,
        silla: asiento.numero,
        estado: asiento.estado,
      });
    }
  }

  // Un id que no existe en el salon se descarta: la pagina que llama trata la
  // lista vacia como "no elegiste nada".
  return ids
    .map((id) => porId.get(id))
    .filter((a): a is AsientoConsultado => !!a);
}

export type AsientoConsultado = {
  id: number;
  mesa: number;
  silla: number;
  estado: EstadoAsiento;
};

/** Una orden, buscada por su token. Devuelve null si el token no existe. */
export async function obtenerOrdenPorToken(
  token: string,
): Promise<Orden | null> {
  // Un token que no es uuid no puede existir: se corta antes de salir a la red.
  if (!esUuid(token)) return null;

  const orden = await pedirOpcional<OrdenJson>(
    `/api/ordenes/${encodeURIComponent(token)}`,
  );

  return orden ? aOrden(orden) : null;
}

/** Las entradas emitidas de una compra. Vacio mientras la orden no este pagada. */
export async function obtenerEntradasPorToken(
  token: string,
): Promise<Entrada[]> {
  if (!esUuid(token)) return [];

  const entradas = await pedirOpcional<EntradaJson[]>(
    `/api/ordenes/${encodeURIComponent(token)}/entradas`,
  );

  return (entradas ?? []).map((entrada) => ({
    ...entrada,
    usadoEl: aFecha(entrada.usadoEl),
  }));
}

/**
 * `OrdenResponse` → `Orden`. Lo comparten el GET y `/reconciliar`, que devuelven
 * exactamente el mismo cuerpo.
 */
export function aOrden(orden: OrdenJson): Orden {
  return {
    ...orden,
    creadoEl: aFecha(orden.creadoEl),
    expiraEn: aFecha(orden.expiraEn),
    pagadoEl: aFecha(orden.pagadoEl),
    butacas: orden.butacas ?? [],
  };
}

/**
 * Las mesas del salon, ya en orden de dibujo.
 *
 * `orden` es la posicion de la mesa dentro de su fila. Ordenar por el campo y no
 * confiar en como vino el array es lo que garantiza que el plano se dibuje de
 * izquierda a derecha como esta el salon.
 */
async function pedirMesas(): Promise<Mesa[]> {
  const { mesas } = await pedir<{ mesas: Mesa[] }>("/api/mapa");

  return [...mesas].sort((a, b) => a.orden - b.orden);
}

function contar(mesas: Mesa[]) {
  return mesas.reduce((total, mesa) => total + libres(mesa.asientos), 0);
}

function libres(asientos: Asiento[]) {
  return asientos.filter((a) => a.estado === "DISPONIBLE").length;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un token invalido termina en un 404 nuestro, no en un viaje al backend. */
export function esUuid(token: string) {
  return UUID.test(token);
}
