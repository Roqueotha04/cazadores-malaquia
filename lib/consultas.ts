import "server-only";

import { aFecha, pedir, pedirOpcional, SIN_BACKEND } from "./api";
import * as fixtures from "./fixtures";
import type { Entrada, Evento, Mapa, Reserva } from "./tipos";

/**
 * Lecturas del frontend. Las paginas solo llaman a estas funciones.
 *
 * Las firmas son las mismas de cuando el frontend hablaba directo con Postgres:
 * los componentes no saben de donde salen los datos.
 *
 * CONTRATO A CONFIRMAR con el .md del backend. Hoy se asume:
 *
 *   1. El JSON viene en camelCase (igual que `lib/tipos.ts`).
 *   2. Las fechas son strings ISO-8601 con offset ("2026-10-02T20:00:00-03:00").
 *   3. Los montos son enteros en centavos.
 *   4. El plano viene anidado: mesas, y dentro de cada mesa sus asientos.
 *   5. Un token que no existe responde 404 (no 200 con cuerpo vacio).
 *
 * Si algo de eso cambia, se ajusta aca y en `lib/api.ts`. Nada mas.
 */

// Los tipos "en el cable": iguales a los del dominio pero con las fechas como
// string, que es lo unico que sabe transportar JSON.
type EventoJson = Omit<Evento, "fecha"> & { fecha: string | null };
type ReservaJson = Omit<Reserva, "expiraEn"> & { expiraEn: string };

export async function obtenerEvento(): Promise<Evento> {
  if (SIN_BACKEND) return fixtures.evento();

  const evento = await pedir<EventoJson>("/api/evento");

  return { ...evento, fecha: aFecha(evento.fecha) };
}

/** Cuántas sillas quedan libres, para mostrarlo en la landing. */
export async function contarDisponibles(): Promise<number> {
  if (SIN_BACKEND) return fixtures.disponibles();

  const { disponibles } = await pedir<{ disponibles: number }>(
    "/api/evento/disponibles",
  );

  return disponibles;
}

/** El plano completo: el evento, las 14 mesas y sus sillas con el estado de cada una. */
export async function obtenerMapa(): Promise<Mapa> {
  if (SIN_BACKEND) return fixtures.mapa();

  const mapa = await pedir<{ evento: EventoJson; mesas: Mapa["mesas"] }>(
    "/api/mapa",
  );

  return {
    evento: { ...mapa.evento, fecha: aFecha(mapa.evento.fecha) },
    mesas: mapa.mesas,
  };
}

/** Una compra, buscada por su token. Devuelve null si el token no existe. */
export async function obtenerReservaPorToken(
  token: string,
): Promise<Reserva | null> {
  // Un token que no es uuid no puede existir: se corta antes de salir a la red.
  if (!esUuid(token)) return null;

  if (SIN_BACKEND) return fixtures.reserva(token);

  const reserva = await pedirOpcional<ReservaJson>(
    `/api/reservas/${encodeURIComponent(token)}`,
  );

  if (!reserva) return null;

  return {
    ...reserva,
    expiraEn: aFecha(reserva.expiraEn) ?? new Date(0),
    asientos: reserva.asientos ?? [],
  };
}

/** Las entradas emitidas de una compra. Vacio si todavia no se pago. */
export async function obtenerEntradasPorToken(
  token: string,
): Promise<Entrada[]> {
  if (!esUuid(token)) return [];

  if (SIN_BACKEND) return fixtures.entradas(token);

  return (
    (await pedirOpcional<Entrada[]>(
      `/api/reservas/${encodeURIComponent(token)}/entradas`,
    )) ?? []
  );
}

/** Los asientos elegidos, con su mesa y su silla, para mostrar el resumen. */
export async function obtenerAsientosElegidos(ids: number[]) {
  if (ids.length === 0) return [];

  if (SIN_BACKEND) return fixtures.asientosElegidos(ids);

  return pedir<{ id: number; mesa: number; silla: number; estado: string }[]>(
    `/api/asientos?ids=${ids.join(",")}`,
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Con fixtures cualquier token sirve, para poder probar las pantallas con urls
 * escritas a mano. Contra el backend real se exige un uuid: asi un token
 * invalido termina en un 404 y no en un error.
 */
function esUuid(token: string) {
  return SIN_BACKEND || UUID.test(token);
}
