"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { enviarAdmin } from "../api";
import { desdeInputFechaHora } from "../fecha";
import type { Tope } from "../tipos";
import { eventoSchema } from "../validacion";

/**
 * Configuracion del evento.
 *
 * Abrir y cerrar son endpoints propios y no un campo del formulario: cerrar es
 * lo que se hace con apuro cuando algo va mal, y en ese momento nadie tiene que
 * estar completando el nombre y el lugar para poder frenar la venta.
 */

export type EstadoEvento = {
  error?: string;
  errores?: Record<string, string[] | undefined>;
  ok?: boolean;
  valores?: Record<string, string>;
};

const CAMPOS = [
  "nombre",
  "fecha",
  "lugar",
  "precio",
  "maxAsientosPorCompra",
  "minutosReserva",
  "tarifaServicioPorcentaje",
] as const;

/**
 * Guardar la configuracion.
 *
 * Es un reemplazo completo, no un parche: los siete campos viajan siempre, por
 * eso el formulario se precarga con lo que devuelve `GET /api/evento`.
 */
export async function guardarEvento(
  _previo: EstadoEvento,
  datos: FormData,
): Promise<EstadoEvento> {
  const crudos = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(datos.get(campo) ?? "")]),
  );

  const validacion = eventoSchema.safeParse(crudos);

  if (!validacion.success) {
    const { fieldErrors, formErrors } = z.flattenError(validacion.error);
    return { errores: fieldErrors, error: formErrors[0], valores: crudos };
  }

  const { precio, fecha, ...resto } = validacion.data;

  const resultado = await enviarAdmin<unknown>("/api/admin/evento", {
    ...resto,
    // El input no tiene zona: la hora se fija en la de Buenos Aires antes de
    // salir, para que no se corra segun donde este parado el que edita.
    fecha: desdeInputFechaHora(fecha),
    precioCentavos: precio * 100,
  });

  if (!resultado.ok) {
    return {
      error: resultado.error,
      errores: aErroresDeCampo(resultado.campos),
      valores: crudos,
    };
  }

  refresh();

  return { ok: true };
}

/** Los dos devuelven el evento actualizado; al panel le alcanza con refrescar. */
export async function abrirVentas(): Promise<{ ok: boolean; error?: string }> {
  return cambiarVenta("abrir-ventas");
}

export async function cerrarVentas(): Promise<{ ok: boolean; error?: string }> {
  return cambiarVenta("cerrar-ventas");
}

async function cambiarVenta(verbo: "abrir-ventas" | "cerrar-ventas") {
  const resultado = await enviarAdmin<unknown>(`/api/admin/evento/${verbo}`, {});

  if (!resultado.ok) return { ok: false, error: resultado.error };

  refresh();

  return { ok: true };
}

export type EstadoTope = {
  error?: string;
  ok?: boolean;
  valores?: Record<string, string>;
};

/**
 * Guarda el corte de venta.
 *
 * A diferencia de `guardarEvento` no es un reemplazo silencioso: acá "vaciar
 * el campo" y "sacar el corte" son dos cosas distintas, así que sacarlo tiene
 * su propio botón (`sacarTope`) y este formulario siempre manda los dos
 * campos con algo. La validación real —el margen tiene que cubrir al menos una
 * compra entera, y no se puede tocar si el tope ya se alcanzó— la hace el
 * backend; acá solo se frena lo obviamente vacío para no gastar un viaje.
 */
export async function guardarTope(
  _previo: EstadoTope,
  datos: FormData,
): Promise<EstadoTope> {
  const crudos = {
    topeVendidas: String(datos.get("topeVendidas") ?? ""),
    margen: String(datos.get("margen") ?? ""),
  };

  const topeVendidas = Number(crudos.topeVendidas);
  const margen = Number(crudos.margen);

  if (
    !Number.isInteger(topeVendidas) ||
    topeVendidas <= 0 ||
    !Number.isInteger(margen) ||
    margen <= 0
  ) {
    return {
      error: "Completá los dos campos con números enteros mayores a cero.",
      valores: crudos,
    };
  }

  const resultado = await enviarAdmin<Tope>("/api/admin/evento/tope", {
    topeVendidas,
    margen,
  });

  if (!resultado.ok) return { error: resultado.error, valores: crudos };

  refresh();

  return { ok: true };
}

/** Saca el corte: la web vuelve a vender sin más límite que el interruptor general. */
export async function sacarTope(): Promise<{ ok: boolean; error?: string }> {
  const resultado = await enviarAdmin<Tope>("/api/admin/evento/tope", {
    topeVendidas: null,
    margen: null,
  });

  if (!resultado.ok) return { ok: false, error: resultado.error };

  refresh();

  return { ok: true };
}

/**
 * `{ "precioCentavos": "..." }` → `{ precio: ["..."] }`.
 *
 * El backend nombra el campo como lo recibe; el formulario lo conoce por el
 * nombre de su input. Sin esta traduccion el error queda arriba de todo en vez
 * de debajo del campo que lo causo.
 */
function aErroresDeCampo(campos?: Record<string, string>) {
  if (!campos) return undefined;

  const equivalencias: Record<string, string> = { precioCentavos: "precio" };

  return Object.fromEntries(
    Object.entries(campos).map(([ruta, mensaje]) => {
      const hoja = ruta.split(".").pop() ?? ruta;
      return [equivalencias[hoja] ?? hoja, [mensaje]];
    }),
  );
}
