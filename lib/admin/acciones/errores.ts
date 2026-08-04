"use server";

import { refresh } from "next/cache";
import { enviarAdmin } from "../api";

/**
 * Los errores operativos que abre el backend solo.
 *
 * A diferencia de un caso, acá no hay nada que arreglar desde la app: la plata
 * la devuelve el equipo por fuera y el mail se reenvia desde la orden. Lo unico
 * que se hace desde esta pantalla es marcar que alguien ya se ocupo.
 */

/**
 * Marca el error como atendido.
 *
 * Es idempotente —apretarlo dos veces no cambia nada— y no pide motivo, a
 * diferencia de anular una entrada o dar de baja una venta: acá no se deshace
 * nada, se deja de mirar. Devuelve 204, y 404 si el id no existe.
 */
export async function atenderError(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  const resultado = await enviarAdmin<null>(
    `/api/admin/errores/${id}/atender`,
    {},
  );

  if (!resultado.ok) return { ok: false, error: resultado.error };

  refresh();

  return { ok: true };
}
