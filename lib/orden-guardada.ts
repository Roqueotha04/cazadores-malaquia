/**
 * El token de la orden, guardado en el navegador. Hoy es un respaldo.
 *
 * El backend arma la back-url de cada pago con el token adentro
 * (`/checkout/exito/{token}`), asi que la pantalla de vuelta ya no depende de
 * esto: funciona igual si el comprador vuelve en otra pestaña. Queda para las
 * compras que salieron con una preferencia armada antes de ese cambio, que
 * vuelven a `/checkout/exito` pelado y sin nada que las identifique.
 *
 * Se escribe al llegar a la reserva y se lee al volver del pago.
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
