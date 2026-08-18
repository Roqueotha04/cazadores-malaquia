"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { enviarAdmin } from "../api";
import { desdeInputFechaHora } from "../fecha";
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
