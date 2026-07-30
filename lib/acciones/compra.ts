"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { enviar, SIN_BACKEND } from "../api";
import { obtenerEvento } from "../consultas";
import { crearReservaSchema } from "../validacion";

export type EstadoFormulario = {
  /** Error general, arriba del formulario. */
  error?: string;
  /** Errores por campo, debajo de cada input. */
  errores?: Record<string, string[] | undefined>;
  /** Sillas que se llevó otra persona mientras esta completaba sus datos. */
  ocupadas?: number[];
};

/**
 * Acción del formulario de compra.
 *
 * Valida de este lado para dar feedback rápido, manda la compra al backend y
 * lleva a la página de la reserva. Si algo falla devuelve el error para
 * mostrarlo en pantalla: nunca lanza al navegador.
 *
 * La validación de acá es por comodidad, no por seguridad: el backend valida
 * todo otra vez y es el único que decide.
 */
export async function enviarCompra(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const evento = await obtenerEvento();

  if (!evento.ventasAbiertas) {
    return { error: "La venta de entradas no está abierta." };
  }

  const validacion = crearReservaSchema(evento.maxAsientosPorCompra).safeParse({
    nombre: datos.get("nombre"),
    apellido: datos.get("apellido"),
    dni: datos.get("dni"),
    email: datos.get("email"),
    celular: datos.get("celular"),
    asientosIds: String(datos.get("asientos") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number),
  });

  if (!validacion.success) {
    const { fieldErrors, formErrors } = z.flattenError(validacion.error);
    return {
      errores: fieldErrors,
      error: formErrors[0] ?? fieldErrors.asientosIds?.[0],
    };
  }

  // Sin repetidos y ordenados: el backend los necesita asi para tomar las
  // filas siempre en el mismo orden.
  const asientosIds = [...new Set(validacion.data.asientosIds)].sort(
    (a, b) => a - b,
  );

  const resultado = SIN_BACKEND
    ? { ok: true as const, datos: { token: crypto.randomUUID() } }
    : await enviar<{ token: string }>("/api/reservas", {
        ...validacion.data,
        asientosIds,
      });

  if (!resultado.ok) {
    return { error: resultado.error, ocupadas: resultado.asientosOcupados };
  }

  // Fuera de todo try: redirect() funciona lanzando una señal que Next atrapa.
  redirect(`/reserva/${resultado.datos.token}`);
}

/** El comprador abandona: se liberan las sillas para que las tome otro. */
export async function cancelarReserva(token: string): Promise<void> {
  if (!SIN_BACKEND) {
    const resultado = await enviar<null>(
      `/api/reservas/${encodeURIComponent(token)}/cancelar`,
      {},
    );

    // Si falla no hay nada que mostrarle: la reserva vence sola en 30 minutos.
    if (!resultado.ok) console.error("cancelarReserva:", resultado.error);
  }

  redirect("/comprar");
}
