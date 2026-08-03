"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { TIMEOUT_MAIL_MS, enviarAdmin } from "../api";
import { corregirUsuarioSchema } from "../validacion";

/**
 * Acciones sobre una orden ya creada.
 *
 * Ninguna de las dos cambia de titular una entrada: una reenvia el PDF a donde
 * ya estaba, la otra arregla los datos de contacto de la persona.
 */

/**
 * Reenvia el PDF de las entradas a la direccion que tiene el comprador.
 *
 * El del cliente (`POST /api/ordenes/reenviar`) pide DNI y **el email con el que
 * se hizo esa compra** —el contacto quedo congelado en la orden, asi que un mail
 * nuevo no encuentra nada— y contesta 204 igual aunque no encuentre, para que no
 * sirva para averiguar quien compro. Este avisa cuando algo no cierra, porque
 * del otro lado hay alguien atendiendo un telefono y necesita poder decir por
 * que no salio.
 *
 * Espera al servidor de correo: por eso el timeout largo.
 */
export async function reenviarEntradas(
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  const resultado = await enviarAdmin<null>(
    `/api/admin/ordenes/${encodeURIComponent(token)}/reenviar-entradas`,
    {},
    { timeoutMs: TIMEOUT_MAIL_MS },
  );

  if (resultado.ok) return { ok: true };

  // El 404 acá no es "no existe" a secas: el backend usa el mismo status para
  // la orden que no esta pagada, que es el caso que de verdad pasa. Su
  // `mensaje` lo explica, asi que se muestra tal cual.
  return { ok: false, error: resultado.error };
}

export type EstadoCorreccion = {
  error?: string;
  errores?: Record<string, string[] | undefined>;
  ok?: boolean;
  valores?: Record<string, string>;
};

const CAMPOS = ["nombre", "apellido", "email", "celular"] as const;

/**
 * Arregla los datos de contacto del comprador.
 *
 * Es un reemplazo, no un parche: los cuatro campos viajan siempre, por eso el
 * formulario se precarga con lo que ya esta. Sirve sobre todo para el apellido
 * mal tipeado, que es con lo que se busca a alguien en la puerta.
 *
 * El DNI va en la ruta y no en el cuerpo: identifica a la persona, y las
 * compras, las entradas y la busqueda de la puerta cuelgan de el. No cambia los
 * PDF ya emitidos y no reenvia nada.
 */
export async function corregirUsuario(
  dni: string,
  _previo: EstadoCorreccion,
  datos: FormData,
): Promise<EstadoCorreccion> {
  const crudos = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(datos.get(campo) ?? "")]),
  );

  const validacion = corregirUsuarioSchema.safeParse(crudos);

  if (!validacion.success) {
    const { fieldErrors } = z.flattenError(validacion.error);
    return { errores: fieldErrors, valores: crudos };
  }

  const resultado = await enviarAdmin<unknown>(
    `/api/admin/usuarios/${encodeURIComponent(dni)}/corregir`,
    validacion.data,
  );

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

/** `{ "usuario.email": "..." }` → `{ email: ["..."] }`. */
function aErroresDeCampo(campos?: Record<string, string>) {
  if (!campos) return undefined;

  return Object.fromEntries(
    Object.entries(campos).map(([ruta, mensaje]) => [
      ruta.split(".").pop() ?? ruta,
      [mensaje],
    ]),
  );
}
