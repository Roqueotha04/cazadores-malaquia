import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * La sesion del panel.
 *
 * El JWT del backend vive en una cookie httpOnly y el navegador nunca lo ve.
 * No es una decision de estilo: `API_URL` es server-only a proposito (ver
 * `.env.local`), asi que todo el fetch pasa por el servidor de Next. Si el
 * token estuviera en localStorage el navegador tendria que hablarle al backend
 * directo, y ahi entrarian el CORS y la posibilidad de que un XSS se lleve la
 * credencial de la cuenta que puede todo.
 *
 * Guardamos tambien `expiraEn` —que el login devuelve— para poder avisar antes
 * de que la sesion se corte en medio de la fila, en vez de enterarse con un 401.
 * Son 12 horas y no hay refresh: cuando vence, se vuelve a entrar.
 */

export const COOKIE = "cm_sesion";

export type Sesion = {
  token: string;
  /** ISO-8601 con offset, tal como lo manda el backend. */
  expiraEn: string;
};

/**
 * La sesion, o null si no hay.
 *
 * `cache()` la memoiza durante un render: el layout, la pagina y cada Server
 * Component del shell la piden por separado y esto se lee una sola vez.
 */
export const leerSesion = cache(async (): Promise<Sesion | null> => {
  const crudo = (await cookies()).get(COOKIE)?.value;

  if (!crudo) return null;

  try {
    const sesion = JSON.parse(crudo) as Sesion;

    if (!sesion?.token) return null;

    // Una cookie vencida no deberia llegar —el navegador la borra sola— pero
    // el reloj del cliente puede estar corrido. Un token vencido es un 401
    // seguro: mejor mandarlo al login antes de gastar el viaje.
    if (sesion.expiraEn && new Date(sesion.expiraEn) <= new Date()) return null;

    return sesion;
  } catch {
    // Cookie manoseada o de una version vieja del formato.
    return null;
  }
});

/**
 * La sesion o el login. Es la puerta de todo el panel.
 *
 * La llaman las paginas y las acciones, no solo el layout: por el render
 * parcial de Next un chequeo en el layout no se vuelve a correr al navegar
 * entre pantallas del panel.
 */
export async function requerirSesion(volverA?: string): Promise<Sesion> {
  const sesion = await leerSesion();

  if (!sesion) redirect(rutaLogin(volverA));

  return sesion;
}

/** 12 horas, lo que dura el token. Solo se usa si el backend no mando `expiraEn`. */
const DURACION_MS = 12 * 60 * 60 * 1000;

export async function guardarSesion(sesion: Sesion): Promise<void> {
  const almacen = await cookies();

  // Una cookie con `expires` invalido es una cookie de sesion: sobreviviria al
  // token y dejaria al proxy creyendo que hay sesion cuando ya no la hay.
  const vence = new Date(sesion.expiraEn);
  const expires = Number.isNaN(vence.getTime())
    ? new Date(Date.now() + DURACION_MS)
    : vence;

  almacen.set(COOKIE, JSON.stringify({ ...sesion, expiraEn: expires.toISOString() }), {
    httpOnly: true,
    // En dev el panel se abre por http://localhost: con `secure` fijo la
    // cookie no se guardaria nunca y no se podria entrar.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // La cookie muere cuando muere el token. No hay refresh que la estire.
    expires,
  });
}

export async function borrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * `/admin/login`, con a donde volver.
 *
 * Se guarda la ruta para no dejar a alguien que abrio un caso puntual de vuelta
 * en el tablero despues de entrar.
 */
export function rutaLogin(volverA?: string): string {
  if (!volverA || volverA === "/admin") return "/admin/login";

  return `/admin/login?volver=${encodeURIComponent(volverA)}`;
}

/**
 * A donde mandar despues del login. Solo rutas del panel.
 *
 * `volver` viene del querystring y lo escribe cualquiera: sin este filtro, un
 * link armado a mano usaria el login como trampolin a otro sitio.
 */
export function destinoSeguro(volver: string | undefined): string {
  if (!volver) return "/admin";
  if (!volver.startsWith("/admin")) return "/admin";
  // `//otro-sitio` es un host, no una ruta.
  if (volver.startsWith("//")) return "/admin";
  if (volver === "/admin/login") return "/admin";

  return volver;
}
