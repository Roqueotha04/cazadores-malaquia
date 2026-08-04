"use server";

import { enviar } from "../api";
import type { Resultado } from "../tipos";

/**
 * Mercado Pago del otro lado: el SDK del backend espera hasta 20s por intento y
 * reintenta. Cortar en el default de `lib/api.ts` seria mostrarle un error a
 * alguien que solo tenia que esperar.
 */
const TIMEOUT_MS = 30_000;

/**
 * Arranca el cobro: abre un intento y devuelve el link de Checkout Pro.
 *
 * Confirmar el pago no es asunto del frontend. La aprobación la trae el webhook
 * del backend, o la descubre `/reconciliar` al volver del checkout. Este botón
 * no aprueba nada, sólo lleva.
 *
 * Se puede llamar más de una vez sobre la misma orden: si un intento fue
 * rechazado, las butacas siguen reservadas y el comprador puede reintentar
 * mientras no venza.
 */
export async function crearPreferencia(
  token: string,
): Promise<Resultado<{ initPoint: string }>> {
  const resultado = await enviar<{
    token: string;
    montoCentavos: number;
    initPoint: string;
  }>(`/api/ordenes/${encodeURIComponent(token)}/pagar`, {}, { timeoutMs: TIMEOUT_MS });

  if (!resultado.ok) return { ok: false, error: resultado.error };

  if (!resultado.datos?.initPoint) {
    console.error("crearPreferencia: el backend no devolvio un initPoint");
    return { ok: false, error: "No pudimos abrir el pago. Probá de nuevo." };
  }

  return { ok: true, datos: { initPoint: resultado.datos.initPoint } };
}
