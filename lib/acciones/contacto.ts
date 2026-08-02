"use server";

import { z } from "zod";
import { enviar } from "../api";
import { contactoSchema } from "../validacion";

export type EstadoContacto = {
  /** El mensaje salio: el formulario se reemplaza por el acuse. */
  ok?: true;
  /** Error general, arriba del formulario. */
  error?: string;
  /** Errores por campo, debajo de cada input. */
  errores?: Record<string, string[] | undefined>;
  /** Lo que la persona escribio, para no borrarselo al volver con errores. */
  valores?: Record<string, string>;
};

const CAMPOS = ["nombre", "apellido", "celular", "motivo"] as const;

/**
 * Consulta desde la landing.
 *
 * Misma forma que `enviarCompra`: valida de este lado para dar feedback rapido,
 * manda al backend y devuelve el error como valor. Nunca lanza al navegador.
 *
 * PENDIENTE: `POST /api/contacto` NO existe en el backend
 * (`.claude/api-frontend.md` no lo lista). Hasta que lo agreguen, este
 * formulario le va a mostrar un error a quien lo use. Quedo fuera de la
 * migracion al contrato real a proposito; hay que resolverlo aparte, o
 * agregandolo del lado del back o mandando la consulta por WhatsApp.
 */
export async function enviarContacto(
  _previo: EstadoContacto,
  datos: FormData,
): Promise<EstadoContacto> {
  const crudos = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(datos.get(campo) ?? "")]),
  );

  const validacion = contactoSchema.safeParse(crudos);

  if (!validacion.success) {
    const { fieldErrors, formErrors } = z.flattenError(validacion.error);
    return { errores: fieldErrors, error: formErrors[0], valores: crudos };
  }

  const resultado = await enviar<null>("/api/contacto", validacion.data);

  if (!resultado.ok) return { error: resultado.error, valores: crudos };

  return { ok: true };
}
