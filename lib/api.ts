import "server-only";

import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";

/**
 * Unico punto de contacto con el backend.
 *
 * Todo el resto del frontend habla con `lib/consultas.ts` y `lib/acciones/`,
 * que llaman aca. Cuando cambie el contrato de la API, este es el archivo que
 * se toca. El contrato vive en `.claude/api-frontend.md`.
 *
 * Todas las llamadas salen del servidor de Next, nunca del navegador: el token
 * de la orden es la credencial para bajar las entradas y no tiene por que
 * pasar por el cliente. Por eso tampoco entra CORS en juego.
 */

const base = process.env.API_URL?.replace(/\/$/, "");

/**
 * Cuanto se espera al backend.
 *
 * 8 segundos para lo que solo toca la base de datos. `/pagar` y `/reconciliar`
 * salen a hablar con Mercado Pago —el SDK del back espera hasta 20s por intento
 * y reintenta— asi que esos dos piden su propio limite. Si cortaramos a los 8s
 * le mostrariamos "no pudimos conectar" a alguien que pago perfecto.
 */
const TIMEOUT_MS = 8_000;

type Opciones = { timeoutMs?: number };

/** Error del backend. Guarda el status para poder distinguir un 404. */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly ruta: string,
    readonly detalle?: string,
  ) {
    super(`${status} en ${ruta}${detalle ? `: ${detalle}` : ""}`);
    this.name = "ErrorApi";
  }
}

async function llamar(
  ruta: string,
  init?: RequestInit,
  { timeoutMs = TIMEOUT_MS }: Opciones = {},
): Promise<Response> {
  // Ninguna pagina que toque el backend se puede prerenderizar: el mapa cambia
  // con cada compra y el estado de una orden cambia solo. `connection()` corta
  // el prerender aca, de una vez para todas, y de paso deja que el build corra
  // sin el backend arriba.
  await connection();

  if (!base) {
    throw new Error(
      `Falta API_URL en el entorno: se intento llamar a ${ruta} sin backend configurado`,
    );
  }

  try {
    return await fetch(`${base}${ruta}`, {
      ...init,
      // Los datos de este sistema cambian con cada compra. Nada se cachea: el
      // mapa envejece solo, porque el estado de cada butaca se calcula en cada
      // consulta a partir de las reservas vivas.
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "application/json", ...init?.headers },
    });
  } catch (e) {
    // Next sale del prerender estatico lanzando un error interno, y un fetch
    // con `no-store` es justo una de las cosas que lo disparan. Si lo
    // atrapamos, rompemos el mecanismo: hay que devolverselo.
    unstable_rethrow(e);

    // Timeout, DNS, connection refused: el backend no contesto.
    throw new ErrorApi(503, ruta, e instanceof Error ? e.message : undefined);
  }
}

/** Lectura. Lanza si el backend falla: lo atrapa el error boundary. */
export async function pedir<T>(ruta: string, opciones?: Opciones): Promise<T> {
  const res = await llamar(ruta, undefined, opciones);

  if (!res.ok) throw new ErrorApi(res.status, ruta, await texto(res));

  return res.json() as Promise<T>;
}

/** Lectura por token. Devuelve null en 404 para que la pagina haga notFound(). */
export async function pedirOpcional<T>(
  ruta: string,
  opciones?: Opciones,
): Promise<T | null> {
  const res = await llamar(ruta, undefined, opciones);

  if (res.status === 404) return null;
  if (!res.ok) throw new ErrorApi(res.status, ruta, await texto(res));

  return res.json() as Promise<T>;
}

/**
 * El sobre de error del backend, igual para cualquier 4xx o 5xx.
 *
 * `mensaje` es texto escrito para mostrarle al comprador. `error` es la frase
 * HTTP ("Conflict", "Bad Request") y no se muestra nunca. Los campos en null no
 * se serializan.
 */
type ErrorDelBackend = {
  status?: number;
  error?: string;
  mensaje?: string;
  /** Solo en errores de validacion, con la ruta del campo como clave. */
  campos?: Record<string, string>;
  /** Solo cuando el conflicto es por butacas tomadas. */
  asientosOcupados?: number[];
};

export type Fallo = {
  ok: false;
  error: string;
  campos?: Record<string, string>;
  asientosOcupados?: number[];
};

/**
 * Escritura. Nunca lanza: devuelve el error como valor.
 *
 * Los errores esperados de un formulario se modelan como valor de retorno, no
 * como excepcion, asi los puede mostrar `useActionState`.
 */
export async function enviar<T>(
  ruta: string,
  cuerpo: unknown,
  opciones?: Opciones,
): Promise<{ ok: true; datos: T } | Fallo> {
  let res: Response;

  try {
    res = await llamar(
      ruta,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      },
      opciones,
    );
  } catch (e) {
    unstable_rethrow(e);

    console.error(`POST ${ruta}:`, e);
    return { ok: false, error: "No pudimos conectar con el servidor. Probá de nuevo." };
  }

  if (!res.ok) {
    const detalle = await json<ErrorDelBackend>(res);

    if (!detalle) {
      console.error(`POST ${ruta}: ${res.status} sin cuerpo`);
    }

    return {
      ok: false,
      // `mensaje` primero y `error` ni de reserva: mostrarle "Conflict" a
      // alguien que esta comprando no le dice nada.
      error:
        detalle?.mensaje ?? "No pudimos completar la operación. Probá de nuevo.",
      campos: detalle?.campos,
      asientosOcupados: detalle?.asientosOcupados,
    };
  }

  // 204: `/cancelar` no devuelve cuerpo.
  const datos = res.status === 204 ? null : await json<T>(res);

  return { ok: true, datos: datos as T };
}

async function texto(res: Response) {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return undefined;
  }
}

async function json<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * JSON no tiene fechas: el backend las manda como string ISO con offset y los
 * componentes esperan `Date`. La conversion pasa siempre aca, en el borde.
 */
export function aFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
