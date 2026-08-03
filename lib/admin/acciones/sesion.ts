"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { enviar } from "@/lib/api";
import { borrarSesion, destinoSeguro, guardarSesion } from "../sesion";
import { loginSchema } from "../validacion";

/**
 * Entrar al panel.
 *
 * `POST /api/auth/login` es publico —es el unico endpoint del panel que no pide
 * token— asi que sale por `lib/api.ts` directo y no por `lib/admin/api.ts`, que
 * exige una sesion que todavia no existe.
 *
 * El token vale 12 horas y no hay refresh. Se guarda en una cookie httpOnly,
 * nunca en localStorage: ver el comentario largo en `lib/admin/sesion.ts`.
 */

export type EstadoLogin = {
  error?: string;
  errores?: Record<string, string[] | undefined>;
  /** El email tipeado, para no borrarlo al volver con error. */
  email?: string;
};

export async function entrar(
  _previo: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const email = String(datos.get("email") ?? "");
  const volver = String(datos.get("volver") ?? "");

  const validacion = loginSchema.safeParse({
    email,
    password: String(datos.get("password") ?? ""),
  });

  if (!validacion.success) {
    const { fieldErrors } = z.flattenError(validacion.error);
    return { errores: fieldErrors, email };
  }

  const resultado = await enviar<{ token: string; expiraEn: string }>(
    "/api/auth/login",
    validacion.data,
  );

  if (!resultado.ok) {
    // El backend contesta el mismo mensaje si el email no existe y si la
    // contraseña esta mal, a proposito. No lo desglosamos por campo: seria
    // inventar una precision que la respuesta no tiene.
    return { error: resultado.error, email };
  }

  if (!resultado.datos?.token) {
    console.error("entrar: el backend no devolvio un token");
    return { error: "No pudimos abrir la sesión. Probá de nuevo.", email };
  }

  await guardarSesion({
    token: resultado.datos.token,
    expiraEn: resultado.datos.expiraEn,
  });

  // Fuera de todo try: redirect() funciona lanzando una señal que Next atrapa.
  redirect(destinoSeguro(volver));
}

/**
 * Salir del panel.
 *
 * Es una accion y no un link a `/admin/salir` a proposito: cerrar sesion cambia
 * estado, y un link lo dejaria a tiro de cualquier precarga o de un `<img>` con
 * esa direccion. El route handler sigue existiendo para el otro camino, el del
 * 401 en medio de un render, donde no se puede escribir una cookie.
 */
export async function salir(): Promise<void> {
  await borrarSesion();

  redirect("/admin/login");
}
