"use server";

import { enviar, SIN_BACKEND } from "../api";
import type { Resultado } from "../tipos";

/**
 * Arranca el cobro: le pide al backend a dónde tiene que ir el comprador y
 * devuelve esa URL.
 *
 * Confirmar el pago ya no es asunto del frontend. Antes había acá un
 * `confirmarPago(token)` que aprobaba la compra, y era un agujero: cualquiera
 * con un token se emitía las entradas gratis. Ahora la aprobación la dispara
 * Mercado Pago contra el webhook del backend, que es el único que puede
 * decidirlo.
 *
 * CONTRATO A CONFIRMAR con el .md del backend: se asume que este endpoint
 * devuelve `{ url }` con el destino del comprador. Mientras Mercado Pago no
 * esté conectado, el backend puede devolver ahí la URL de su pago simulado: el
 * frontend no necesita enterarse.
 */
export async function crearPreferencia(
  token: string,
): Promise<Resultado<{ url: string }>> {
  if (SIN_BACKEND) {
    // Con fixtures el pago se da por hecho, pero se vuelve por la misma pantalla
    // de retorno que va a usar Mercado Pago, para que el camino real quede
    // recorrido. El sufijo hace que la reserva se lea como PAGADA.
    //
    // Los otros estados de esa pantalla se prueban a mano, con un token que no
    // lleve el sufijo:
    //   /compra/resultado?token=abc&status=approved  → espera activa
    //   /compra/resultado?token=abc&status=pending   → pago offline
    //   /compra/resultado?token=abc&status=rejected  → rechazado
    return {
      ok: true,
      datos: {
        url: `/compra/resultado?token=${encodeURIComponent(`${token}-pagada`)}&status=approved`,
      },
    };
  }

  const resultado = await enviar<{ url: string }>("/api/pagos/preference", {
    token,
  });

  if (!resultado.ok) return { ok: false, error: resultado.error };

  if (!resultado.datos?.url) {
    console.error("crearPreferencia: el backend no devolvio una url");
    return { ok: false, error: "No pudimos abrir el pago. Probá de nuevo." };
  }

  return { ok: true, datos: resultado.datos };
}
