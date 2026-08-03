"use server";

import { refresh } from "next/cache";
import { TIMEOUT_MAIL_MS, enviarAdmin } from "../api";
import { motivoSchema } from "../validacion";

/**
 * Las tres acciones sobre una entrada emitida.
 *
 * Todas piden token, tambien las dos que viven en `api-frontend.md`
 * (`/validar` y `/anular`): son de la puerta, no del comprador.
 */

/** Lo que devuelve `/validar`. Mostrar el titular y la ubicacion no es opcional. */
export type EntradaValidada = {
  codigo: string;
  mesaNumero: number;
  asientoNumero: number;
  titular: string;
};

export type ResultadoValidacion =
  | { ok: true; entrada: EntradaValidada }
  | { ok: false; error: string };

/**
 * El escaneo del dia del evento.
 *
 * Es POST y no GET porque **quema el codigo**: la segunda llamada con el mismo
 * UUID falla a proposito.
 *
 * Devuelve la entrada porque saber que el codigo es valido no alcanza: hay que
 * poder decirle a la persona a que mesa va. Sin eso la puerta valida y despues
 * tiene que volver a buscar en la lista.
 */
export async function validarEntrada(
  codigo: string,
): Promise<ResultadoValidacion> {
  const resultado = await enviarAdmin<EntradaValidada>(
    `/api/entradas/${encodeURIComponent(codigo)}/validar`,
    {},
  );

  if (!resultado.ok) {
    // 409 tiene dos significados —"ya se uso el 03/08 21:14" y "fue anulada"— y
    // son dos situaciones distintas para quien esta en la puerta. El backend los
    // distingue en el `mensaje`, que se muestra tal cual.
    return { ok: false, error: resultado.error };
  }

  refresh();

  return { ok: true, entrada: resultado.datos };
}

/**
 * Da de baja la entrada y devuelve la butaca a la venta.
 *
 * Es idempotente: anular dos veces no es error. **409 si la entrada ya se uso**
 * — esa persona esta adentro, y liberar su silla la pondria a la venta con
 * alguien sentado.
 *
 * El motivo es obligatorio y queda en el historial. Anular no devuelve la plata
 * —el reintegro lo hace el equipo a mano— asi que ese texto es lo unico que
 * despues explica por que esa butaca volvio al mapa.
 */
export async function anularEntrada(
  codigo: string,
  motivo: string,
): Promise<{ ok: boolean; error?: string }> {
  const validacion = motivoSchema.safeParse(motivo);

  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0].message };
  }

  const resultado = await enviarAdmin<null>(
    `/api/entradas/${encodeURIComponent(codigo)}/anular`,
    { motivo: validacion.data },
  );

  if (!resultado.ok) return { ok: false, error: resultado.error };

  refresh();

  return { ok: true };
}

/**
 * Mueve la entrada a otra silla.
 *
 * **El codigo no cambia**: el UUID que ya viajo por WhatsApp sigue sirviendo. Se
 * reenvia el PDF de la orden completa automaticamente, porque el papel impreso
 * dice la butaca vieja — de ahi el timeout largo.
 *
 * Solo viaja el destino: cual es la entrada lo dice el codigo de la ruta, y de
 * que butaca sale lo lee el backend.
 */
export async function cambiarButaca(
  codigo: string,
  asientoId: number,
): Promise<{ ok: boolean; error?: string; asientosOcupados?: number[] }> {
  const resultado = await enviarAdmin<null>(
    `/api/admin/entradas/${encodeURIComponent(codigo)}/cambiar-butaca`,
    { asientoId },
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
