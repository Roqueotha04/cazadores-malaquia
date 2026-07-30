import "server-only";

import { unstable_rethrow } from "next/navigation";

/**
 * Unico punto de contacto con el backend.
 *
 * Todo el resto del frontend habla con `lib/consultas.ts` y `lib/acciones/`,
 * que llaman aca. Cuando cambie el contrato de la API, este es el archivo que
 * se toca.
 *
 * Mientras `API_URL` no este definida el proyecto corre con datos de ejemplo
 * (`lib/fixtures.ts`), asi se puede trabajar el frontend sin el backend arriba.
 */

const base = process.env.API_URL?.replace(/\/$/, "");

/** Sin `API_URL` en el entorno, las consultas responden con fixtures. */
export const SIN_BACKEND = !base;

// Si el backend se cuelga, la pagina no se cuelga con el.
const TIMEOUT_MS = 8000;

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

async function llamar(ruta: string, init?: RequestInit): Promise<Response> {
  if (!base) {
    throw new Error(
      `Falta API_URL: se intento llamar a ${ruta} sin backend configurado`,
    );
  }

  try {
    return await fetch(`${base}${ruta}`, {
      ...init,
      // Los datos de este sistema cambian con cada compra. Nada se cachea.
      // En esta version de Next `fetch` ya no cachea por defecto, pero lo
      // dejamos escrito para que la intencion quede clara.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
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
export async function pedir<T>(ruta: string): Promise<T> {
  const res = await llamar(ruta);

  if (!res.ok) throw new ErrorApi(res.status, ruta, await texto(res));

  return res.json() as Promise<T>;
}

/** Lectura por token. Devuelve null en 404 para que la pagina haga notFound(). */
export async function pedirOpcional<T>(ruta: string): Promise<T | null> {
  const res = await llamar(ruta);

  if (res.status === 404) return null;
  if (!res.ok) throw new ErrorApi(res.status, ruta, await texto(res));

  return res.json() as Promise<T>;
}

/**
 * Lo que devuelve el backend cuando rechaza una escritura.
 *
 * CONTRATO A CONFIRMAR con el .md del backend: hoy se asume este sobre.
 */
type ErrorDelBackend = {
  error?: string;
  mensaje?: string;
  /** En un 409 al crear la reserva: las sillas que se llevo otra persona. */
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
): Promise<
  { ok: true; datos: T } | { ok: false; error: string; asientosOcupados?: number[] }
> {
  let res: Response;

  try {
    res = await llamar(ruta, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
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
      error:
        detalle?.error ??
        detalle?.mensaje ??
        "No pudimos completar la operación. Probá de nuevo.",
      asientosOcupados: detalle?.asientosOcupados,
    };
  }

  return { ok: true, datos: (await json<T>(res)) as T };
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
 * JSON no tiene fechas: el backend las manda como string ISO y los componentes
 * esperan `Date`. La conversion pasa siempre aca, en el borde.
 */
export function aFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
