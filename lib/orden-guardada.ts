/**
 * El token de la orden, guardado en el navegador.
 *
 * Mercado Pago devuelve al comprador a una back-url fija que NO lleva el token,
 * y ese token es la unica credencial que existe para nombrar una orden. Si no lo
 * guardamos nosotros, la pantalla de vuelta del checkout no tiene con que
 * preguntar si el pago entro.
 *
 * Se escribe al llegar a la reserva y se lee al volver del pago. Es lo unico que
 * el front conserva de toda la compra.
 */

const CLAVE = "cazadores:orden";

/** Nunca lanza: en modo privado o sin cuota, `localStorage` tira. */
export function recordarToken(token: string) {
  try {
    localStorage.setItem(CLAVE, token);
  } catch {
    // Sin storage el comprador depende del mail. No hay nada que hacer aca.
  }
}

export function tokenGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}
