import "server-only";

import { redirect, unstable_rethrow } from "next/navigation";
import { ErrorApi, enviar, pedir, pedirOpcional, type Fallo } from "@/lib/api";
import { requerirSesion } from "./sesion";

/**
 * El unico camino del panel hacia el backend.
 *
 * Sale por `lib/api.ts` como todo lo demas —un solo lugar arma el fetch— pero
 * agrega las dos cosas que el panel necesita y el front de venta no: el
 * `Authorization: Bearer` de la cuenta, y que un 401 termine en el login en vez
 * de en la pantalla de error.
 *
 * Que la sesion se pida aca, pegado al dato, y no solo en el layout, es a
 * proposito: por el render parcial de Next un chequeo en el layout no se vuelve
 * a correr al navegar entre pantallas del panel. Ninguna pagina del panel
 * llama a `lib/api.ts` directo.
 */

/**
 * Los cuatro endpoints que mandan mail —`reenviar-entradas`, `cambiar-butaca`,
 * `POST /ventas` y `reubicar`— esperan al servidor de correo. Para el resto, los
 * 8 segundos de `lib/api.ts` sobran.
 */
export const TIMEOUT_MAIL_MS = 30_000;

type Opciones = { timeoutMs?: number };

/**
 * El token vencio o el backend lo rechazo.
 *
 * No alcanza con mandar al login: la cookie sigue puesta, el proxy la ve y
 * rebota de vuelta al panel — un rulo. `/admin/salir` es un route handler, que
 * es el unico contexto donde se puede borrar una cookie tanto viniendo de un
 * render como de una accion.
 */
function alLogin(): never {
  redirect("/admin/salir?vencida=1");
}

/** Lectura del panel. Lanza si el backend falla: lo atrapa el error boundary. */
export async function pedirAdmin<T>(
  ruta: string,
  opciones?: Opciones,
): Promise<T> {
  const { token } = await requerirSesion();

  try {
    return await pedir<T>(ruta, { ...opciones, headers: autorizacion(token) });
  } catch (e) {
    unstable_rethrow(e);

    if (e instanceof ErrorApi && e.status === 401) alLogin();

    throw e;
  }
}

/** Lectura que puede no existir. Devuelve null en 404, para hacer `notFound()`. */
export async function pedirAdminOpcional<T>(
  ruta: string,
  opciones?: Opciones,
): Promise<T | null> {
  const { token } = await requerirSesion();

  try {
    return await pedirOpcional<T>(ruta, {
      ...opciones,
      headers: autorizacion(token),
    });
  } catch (e) {
    unstable_rethrow(e);

    if (e instanceof ErrorApi && e.status === 401) alLogin();

    throw e;
  }
}

/**
 * Escritura del panel. Nunca lanza: devuelve el error como valor.
 *
 * El `status` viaja en el `Fallo` porque acá si importa cual fue: el 422 de
 * `/reubicar` dice cuantas butacas pagó la orden, el 409 de `/cambiar-butaca`
 * puede ser "ya entró" o "la butaca esta tomada", y un 404 de
 * `/reenviar-entradas` significa que la orden no está pagada.
 */
export async function enviarAdmin<T>(
  ruta: string,
  cuerpo: unknown,
  opciones?: Opciones,
): Promise<{ ok: true; datos: T } | Fallo> {
  const { token } = await requerirSesion();

  const resultado = await enviar<T>(ruta, cuerpo, {
    ...opciones,
    headers: autorizacion(token),
  });

  if (!resultado.ok && resultado.status === 401) alLogin();

  return resultado;
}

function autorizacion(token: string) {
  return { authorization: `Bearer ${token}` };
}
