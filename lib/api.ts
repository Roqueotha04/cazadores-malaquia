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
 * 15 segundos para lo que solo toca la base de datos. Eran 8 y quedaban cortos:
 * el backend Spring recien levantado, o la primera consulta despues de un rato
 * —cuando el pool de Supabase tiene que abrir conexion— se pasan de ahi sin que
 * nada este roto, y el comprador ve "no pudimos conectar" en una pantalla que
 * hubiera cargado bien un segundo despues.
 *
 * Sigue siendo un limite y no una eternidad: si el backend no contesta en 15s
 * hay un problema de verdad y quedarse esperando no lo arregla.
 *
 * `/pagar` y `/reconciliar` salen a hablar con Mercado Pago —el SDK del back
 * espera hasta 20s por intento y reintenta— asi que esos dos piden su propio
 * limite igual. Cortarlos acá seria mostrarle "no pudimos conectar" a alguien
 * que pago perfecto.
 */
const TIMEOUT_MS = 15_000;

type Opciones = {
  timeoutMs?: number;
  /**
   * Cabeceras extra. Hoy solo el `Authorization: Bearer` del panel: el front de
   * venta no manda ninguna. Va aca y no en cada funcion porque `pedir` y
   * `enviar` no arman el `RequestInit`, lo arma `llamar`.
   */
  headers?: Record<string, string>;
};

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
  { timeoutMs = TIMEOUT_MS, headers }: Opciones = {},
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
      headers: { accept: "application/json", ...init?.headers, ...headers },
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
 * Descarga binaria: devuelve la `Response` cruda para reenviar el cuerpo tal
 * cual, sin pasarlo por JSON.
 *
 * Hoy solo el PDF de las entradas. Va por el servidor de Next —y no con un
 * `<a>` apuntando derecho al backend— por lo mismo que todo el resto: el
 * navegador no habla con el backend, no tiene por que saber donde vive, y asi
 * no hay que declarar el dominio del front en el CORS del otro lado.
 */
export async function pedirArchivo(
  ruta: string,
  opciones?: Opciones,
): Promise<Response> {
  const res = await llamar(ruta, undefined, {
    ...opciones,
    headers: { accept: "application/pdf", ...opciones?.headers },
  });

  if (!res.ok) throw new ErrorApi(res.status, ruta, await texto(res));

  return res;
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
  /**
   * El status del backend, o 503 si no contesto.
   *
   * El front de venta no lo mira —le alcanza con `error`— pero el panel si:
   * el 422 de `/reubicar` y el 409 de `/cambiar-butaca` se explican distinto, y
   * un 404 de `/reenviar-entradas` significa "la orden no esta pagada".
   */
  status: number;
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
    return {
      ok: false,
      status: 503,
      error: "No pudimos conectar con el servidor. Probá de nuevo.",
    };
  }

  if (!res.ok) {
    // Un 406 llega sin cuerpo por contrato, y cualquier otro puede llegar sin
    // cuerpo si algo se rompio antes de escribirlo. `json` devuelve null en vez
    // de lanzar y de ahi salimos con el texto generico.
    const detalle = await json<ErrorDelBackend>(res);

    if (!detalle) {
      console.error(`POST ${ruta}: ${res.status} sin cuerpo`);
    }

    return {
      ok: false,
      status: res.status,
      // `mensaje` primero y `error` ni de reserva: mostrarle "Conflict" a
      // alguien que esta comprando no le dice nada.
      error: detalle?.mensaje ?? generico(res.status),
      campos: detalle?.campos,
      asientosOcupados: detalle?.asientosOcupados,
    };
  }

  // 204: `/cancelar` no devuelve cuerpo.
  const datos = res.status === 204 ? null : await json<T>(res);

  return { ok: true, datos: datos as T };
}

/**
 * Lo que se muestra cuando el backend no mando `mensaje`.
 *
 * El 503 va aparte: no es un pedido mal hecho ni algo que se rompio: la base no
 * contesto o no se pudo abrir la transaccion. La diferencia importa porque manda
 * la conducta —esto se reintenta y suele andar— y "hubo un error" invita a
 * llamar por telefono o a pagar de nuevo.
 */
function generico(status: number) {
  return status === 503
    ? "El sistema está sobrecargado. Esperá un momento y probá de nuevo: no se perdió nada."
    : "No pudimos completar la operación. Probá de nuevo.";
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
