"use server";

import { refresh } from "next/cache";
import { TIMEOUT_MAIL_MS, enviarAdmin } from "../api";
import { notaSchema } from "../validacion";

/**
 * La cola de casos: compras pagadas que quedaron sin butaca.
 *
 * El pago entro tarde y la reserva ya habia vencido, o la orden figura paga sin
 * sillas vivas. Las abre el backend solo, al confirmar pagos.
 *
 * Las tres acciones contestan **422 si el caso ya estaba resuelto**. No es un
 * error del que llama: dos personas pueden estar mirando la misma cola.
 */

/** Pasa el caso a EN_CURSO. Es solo una marca de "lo estoy atendiendo". */
export async function tomarCaso(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  const resultado = await enviarAdmin<null>(
    `/api/admin/incidencias/${id}/tomar`,
    {},
  );

  if (!resultado.ok) return { ok: false, error: resultado.error };

  refresh();

  return { ok: true };
}

/**
 * La unica accion que hace algo de verdad: mueve la orden entera, emite las
 * entradas, manda el mail y recien despues cierra el caso.
 *
 * Sirve para los cuatro tipos de caso. **Mueve la orden completa**: suelta todo
 * lo que tiene y vuelve a tomar el total que pago, asi que `asientoIds` son
 * *todas* sus butacas y no las que faltan — mandar solo las nuevas da 422. De
 * paso reemite los codigos de todas las entradas, incluidas las que no se
 * movieron: los viejos dejan de servir.
 *
 * **La cantidad no viaja en el body**: el backend la deriva del cobro. Si no
 * coincide contesta 422 diciendo cuantas pago y cuantas se mandaron, y ese
 * mensaje es mas exacto que cualquier cuenta que hagamos de este lado.
 *
 * Contesta **409 si alguna entrada de la orden ya paso por la puerta**: esa
 * persona esta adentro y no se la puede mover, asi que no se toca nada.
 */
export async function reubicarCaso(
  id: number,
  asientoIds: number[],
): Promise<{ ok: boolean; error?: string; asientosOcupados?: number[] }> {
  const resultado = await enviarAdmin<null>(
    `/api/admin/incidencias/${id}/reubicar`,
    { asientoIds: [...new Set(asientoIds)].sort((a, b) => a - b) },
    // Emite entradas y manda mail: espera al servidor de correo.
    { timeoutMs: TIMEOUT_MAIL_MS },
  );

  if (!resultado.ok) {
    return {
      ok: false,
      error: resultado.error,
      asientosOcupados: resultado.asientosOcupados,
    };
  }

  refresh();

  return { ok: true };
}

/**
 * Cierra el caso sin reubicar.
 *
 * La nota es obligatoria y se agrega al detalle en vez de pisarlo: un caso
 * resuelto sin decir que paso no se puede reconstruir despues, que es justo
 * para lo que esta la tabla.
 */
export async function resolverCaso(
  id: number,
  nota: string,
): Promise<{ ok: boolean; error?: string }> {
  const validacion = notaSchema.safeParse(nota);

  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message };
  }

  const resultado = await enviarAdmin<null>(
    `/api/admin/incidencias/${id}/resolver`,
    { nota: validacion.data },
  );

  if (!resultado.ok) return { ok: false, error: resultado.error };

  refresh();

  return { ok: true };
}
