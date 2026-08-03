"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { TIMEOUT_MAIL_MS, enviarAdmin } from "../api";
import { aOrden, type OrdenJson } from "@/lib/consultas";
import type { Orden } from "@/lib/tipos";
import { ventaManualSchema } from "../validacion";

/**
 * Registrar una venta cobrada por fuera de la web.
 *
 * **La app no cobra nada acá**: deja asentada una venta que ya se cobro afuera,
 * en efectivo o por transferencia. No lleva precio, sale del evento — un campo
 * menos que tipear mal a las once de la noche.
 *
 * **Y no se deshace**: no hay endpoint para anular una venta manual. Si los
 * numeros se cargan mal, quedan mal. De ahi que la pantalla obligue a revisar
 * antes de enviar.
 */

export type EstadoVenta = {
  error?: string;
  errores?: Record<string, string[] | undefined>;
  /** Butacas que se llevo otro entre que se abrio el plano y se confirmo. */
  ocupadas?: number[];
  /** La orden ya PAGADA, para mostrar en el acto que quedo asignado. */
  orden?: Orden;
  valores?: Record<string, string>;
};

const CAMPOS = [
  "nombre",
  "apellido",
  "dni",
  "email",
  "celular",
  "medio",
] as const;

export async function cargarVenta(
  _previo: EstadoVenta,
  datos: FormData,
): Promise<EstadoVenta> {
  const crudos = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(datos.get(campo) ?? "")]),
  );

  const validacion = ventaManualSchema.safeParse({
    ...crudos,
    asientoIds: String(datos.get("asientos") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number),
  });

  if (!validacion.success) {
    const { fieldErrors, formErrors } = z.flattenError(validacion.error);

    return {
      errores: fieldErrors,
      // Nunca vacio, a proposito: cuando esto falla, lo que hay en pantalla es
      // la revision, y ahi los errores por campo no se dibujan —viven en el
      // panel de datos, escondido—. Sin un texto acá el boton parece muerto.
      error:
        formErrors[0] ?? fieldErrors.asientoIds?.[0] ?? revisarEstos(fieldErrors),
      valores: crudos,
    };
  }

  const { asientoIds, medio, ...comprador } = validacion.data;

  const resultado = await enviarAdmin<OrdenJson>(
    "/api/admin/ventas",
    {
      comprador,
      asientoIds: [...new Set(asientoIds)].sort((a, b) => a - b),
      medio,
    },
    // Manda el PDF por mail: espera al servidor de correo.
    { timeoutMs: TIMEOUT_MAIL_MS },
  );

  if (!resultado.ok) {
    return {
      error: resultado.error,
      errores: aErroresDeCampo(resultado.campos),
      ocupadas: resultado.asientosOcupados,
      valores: crudos,
    };
  }

  refresh();

  return { orden: aOrden(resultado.datos) };
}

/** Como se llama cada campo en la pantalla, para poder nombrarlo en un aviso. */
const ROTULO: Record<string, string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  dni: "DNI",
  email: "Email",
  celular: "Celular",
  medio: "Cómo se cobró",
  asientoIds: "Butacas",
};

/** "Revisá estos datos: DNI, Celular." — el ultimo recurso para no quedar mudo. */
function revisarEstos(campos: Record<string, string[] | undefined>) {
  const rotos = Object.entries(campos)
    .filter(([, mensajes]) => mensajes?.length)
    .map(([campo]) => ROTULO[campo] ?? campo);

  if (rotos.length === 0) return "Revisá los datos del comprador.";

  return `Revisá estos datos: ${rotos.join(", ")}.`;
}

/** `{ "comprador.dni": "..." }` → `{ dni: ["..."] }`. */
function aErroresDeCampo(campos?: Record<string, string>) {
  if (!campos) return undefined;

  return Object.fromEntries(
    Object.entries(campos).map(([ruta, mensaje]) => [
      ruta.split(".").pop() ?? ruta,
      [mensaje],
    ]),
  );
}
