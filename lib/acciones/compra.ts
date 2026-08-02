"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { enviar } from "../api";
import { obtenerEvento, type OrdenJson } from "../consultas";
import { crearOrdenSchema } from "../validacion";

export type EstadoFormulario = {
  /** Error general, arriba del formulario. */
  error?: string;
  /** Errores por campo, debajo de cada input. */
  errores?: Record<string, string[] | undefined>;
  /** Sillas que se llevó otra persona mientras esta completaba sus datos. */
  ocupadas?: number[];
  /** Lo que la persona escribió, para no borrárselo al volver con errores. */
  valores?: Record<string, string>;
};

const CAMPOS = ["nombre", "apellido", "dni", "email", "celular"] as const;

/**
 * Acción del formulario de compra.
 *
 * Crea la orden —que es lo que reserva las butacas— y lleva a la pantalla de
 * pago. Si algo falla devuelve el error para mostrarlo en pantalla: nunca lanza
 * al navegador.
 *
 * La validación de acá es por comodidad, no por seguridad: el backend valida
 * todo otra vez y es el único que decide.
 */
export async function enviarCompra(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const evento = await obtenerEvento();

  // Los valores tal como los escribió la persona. React 19 resetea el
  // formulario cuando la action termina, aunque haya devuelto errores: si no
  // vuelven acá, quien se equivoca en un dígito del DNI reescribe todo.
  const crudos = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(datos.get(campo) ?? "")]),
  );

  if (!evento.ventasAbiertas) {
    return { error: "La venta de entradas no está abierta.", valores: crudos };
  }

  const validacion = crearOrdenSchema(evento.maxAsientosPorCompra).safeParse({
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
      error: formErrors[0] ?? fieldErrors.asientoIds?.[0],
      valores: crudos,
    };
  }

  const { asientoIds, ...usuario } = validacion.data;

  // Sin repetidos y ordenados. El backend igual cuenta los repetidos una sola
  // vez contra el límite, pero mandar la lista limpia evita discutirlo.
  const ids = [...new Set(asientoIds)].sort((a, b) => a - b);

  const resultado = await enviar<OrdenJson>("/api/ordenes", {
    usuario,
    asientoIds: ids,
  });

  if (!resultado.ok) {
    return {
      error: resultado.error,
      errores: aErroresDeCampo(resultado.campos),
      ocupadas: resultado.asientosOcupados,
      valores: crudos,
    };
  }

  // Fuera de todo try: redirect() funciona lanzando una señal que Next atrapa.
  redirect(`/reserva/${resultado.datos.token}`);
}

/**
 * `{ "usuario.dni": "..." }` → `{ dni: ["..."] }`.
 *
 * El backend nombra los campos por su ruta dentro del request; el formulario los
 * conoce por su nombre a secas. Sin esta traducción el error del back queda
 * arriba de todo en vez de debajo del input que lo causó.
 */
function aErroresDeCampo(campos?: Record<string, string>) {
  if (!campos) return undefined;

  return Object.fromEntries(
    Object.entries(campos).map(([ruta, mensaje]) => [
      ruta.split(".").pop() ?? ruta,
      [mensaje],
    ]),
  );
}

/** El comprador abandona: se liberan las butacas para que las tome otro. */
export async function cancelarOrden(token: string): Promise<void> {
  const resultado = await enviar<null>(
    `/api/ordenes/${encodeURIComponent(token)}/cancelar`,
    {},
  );

  // Si falla no hay nada que mostrarle: la orden vence sola.
  if (!resultado.ok) console.error("cancelarOrden:", resultado.error);

  redirect("/comprar");
}
