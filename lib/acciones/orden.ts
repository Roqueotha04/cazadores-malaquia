"use server";

import { enviar } from "../api";
import { aOrden, type OrdenJson } from "../consultas";
import type { Orden, Resultado } from "../tipos";

/**
 * El endpoint mas lento de la API: le pregunta a Mercado Pago por cada intento
 * de cobro de la orden, en serie. Con dos intentos rechazados previos son tres
 * consultas encadenadas.
 */
const TIMEOUT_MS = 45_000;

/**
 * Le vuelve a preguntar a Mercado Pago por los cobros de esta orden.
 *
 * Es lo que hay que llamar al volver del checkout, y es la única forma honesta
 * de saber si un pago entró: el querystring con el que Mercado Pago devuelve al
 * comprador es falsificable, y el GET de la orden sólo lee la base.
 *
 * Es idempotente y barata de repetir: si el aviso ya había llegado por webhook,
 * no le pregunta nada a nadie. Si vuelve `ACTIVA`, el pago quedó en proceso y se
 * puede reintentar.
 *
 * Hay que llamarla **aunque el último intento figure rechazado**: Checkout Pro
 * deja reintentar con otra tarjeta sobre la misma preferencia, así que un intento
 * rechazado todavía puede terminar cobrando y esta llamada es la única red que
 * queda si el webhook no llegó.
 *
 * Con la orden `CANCELADA` o `ANULADA` no le pregunta nada a Mercado Pago:
 * devuelve la orden tal como está y no la toca. Una compra cancelada **no vuelve
 * a `PAGADA` nunca más** — si el cobro entró igual, queda asentado del otro lado
 * y el reintegro lo hace el equipo a mano. Insistir sobre una cancelada esperando
 * que cambie es esperar algo que no va a pasar.
 */
export async function reconciliar(token: string): Promise<Resultado<Orden>> {
  const resultado = await enviar<OrdenJson>(
    `/api/ordenes/${encodeURIComponent(token)}/reconciliar`,
    {},
    { timeoutMs: TIMEOUT_MS },
  );

  if (!resultado.ok) return { ok: false, error: resultado.error };

  if (!resultado.datos?.token) {
    console.error("reconciliar: el backend no devolvio la orden");
    return { ok: false, error: "No pudimos verificar tu pago. Probá de nuevo." };
  }

  return { ok: true, datos: aOrden(resultado.datos) };
}
