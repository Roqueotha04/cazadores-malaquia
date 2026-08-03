import "server-only";

import { cache } from "react";
import { aFecha } from "@/lib/api";
import { aOrden } from "@/lib/consultas";
import { pedirAdmin, pedirAdminOpcional } from "./api";
import type {
  Caso,
  CasoJson,
  Cuenta,
  EstadoIncidencia,
  Incidencia,
  IncidenciaJson,
  Invitado,
  InvitadoJson,
  OrdenAdmin,
  OrdenAdminJson,
  Resumen,
  VentaManual,
  VentaManualJson,
} from "./tipos";
import type { EstadoOrden } from "@/lib/tipos";

/**
 * Lecturas del panel. Las pantallas solo llaman a estas funciones.
 *
 * Nada de esto se cachea ni refresca solo: no hay websockets ni SSE del lado del
 * backend, asi que el resumen, el mapa y la cola de casos envejecen apenas se
 * pintan. Las pantallas que lo necesitan refrescan a mano.
 */

/**
 * La cuenta abierta. Sirve para el nombre de arriba a la derecha y para
 * confirmar al montar el panel que la sesion sigue viva: si da 401,
 * `pedirAdmin` manda al login.
 *
 * `cache()` porque la barra superior la pide en cada navegacion y no tiene
 * sentido preguntarla dos veces en el mismo render.
 */
export const obtenerCuenta = cache(async (): Promise<Cuenta> => {
  return pedirAdmin<Cuenta>("/api/auth/yo");
});

/** Como va la venta, en un solo pedido. Es la pantalla de entrada. */
export const obtenerResumen = cache(async (): Promise<Resumen> => {
  return pedirAdmin<Resumen>("/api/admin/resumen");
});

/**
 * Busqueda de la puerta: acepta DNI, apellido o numero de butaca, y el front no
 * tiene que saber cual de los tres se tipeo. Lo resuelve el backend — si `q` son
 * entre uno y cuatro digitos busca tambien por butaca y une los resultados; un
 * DNI son 7 u 8, asi que nunca se pisan. Por eso `q` viaja sin tocar.
 *
 * Encuentra al que tiene la silla agarrada aunque todavia no haya pagado: ahi
 * llega con `entradas: []` y `tieneOrdenSinPagar: true`.
 *
 * Con `q` vacio devuelve `[]` sin salir a la red: el backend contesta lo mismo
 * y el viaje no aporta nada.
 */
export async function buscarInvitados(q: string): Promise<Invitado[]> {
  const busqueda = q.trim();

  if (!busqueda) return [];

  const invitados = await pedirAdmin<InvitadoJson[]>(
    `/api/admin/invitados?q=${encodeURIComponent(busqueda)}`,
  );

  return invitados.map((invitado) => ({
    ...invitado,
    entradas: invitado.entradas.map((entrada) => ({
      ...entrada,
      usadoEl: aFecha(entrada.usadoEl),
      anuladaEl: aFecha(entrada.anuladaEl),
    })),
  }));
}

/** Tope de resultados de la puerta: con mas, se escriben dos letras mas. */
export const TOPE_INVITADOS = 20;

/**
 * Los dos filtros son opcionales y se combinan. Tope de 100 resultados.
 *
 * **`EXPIRADA` no existe en la base**: el contrato dice que se deriva del reloj
 * al responder, asi que el filtro consulta la columna y el campo de la
 * respuesta no. Pedir `EXPIRADA` no trae nada y pedir `ACTIVA` trae tambien las
 * vencidas, que llegan con `estado: "EXPIRADA"`. Por eso los dos se piden como
 * `ACTIVA` y se separan acá — no es redundante, sin esto el chip de vencidas
 * muestra una lista vacia siempre.
 *
 * `total` es cuantas filas mando el backend **antes** de separar: con el filtro
 * derivado, `ordenes.length` ya no sirve para saber si se llego al tope de 100,
 * y una lista incompleta sin aviso es peor que una lista larga.
 */
export async function buscarOrdenes({
  estado,
  q,
}: {
  estado?: EstadoOrden;
  q?: string;
}): Promise<{ ordenes: OrdenAdmin[]; total: number }> {
  const parametros = new URLSearchParams();

  const estadoBackend = estado === "EXPIRADA" ? "ACTIVA" : estado;

  if (estadoBackend) parametros.set("estado", estadoBackend);
  if (q?.trim()) parametros.set("q", q.trim());

  const consulta = parametros.toString();

  const crudas = await pedirAdmin<OrdenAdminJson[]>(
    `/api/admin/ordenes${consulta ? `?${consulta}` : ""}`,
  );

  const ordenes = crudas.map((orden) => ({
    ...orden,
    creadoEl: aFecha(orden.creadoEl),
    pagadoEl: aFecha(orden.pagadoEl),
  }));

  // Las dos mitades de lo que el backend devolvio como ACTIVA. Los demas
  // estados vienen ya filtrados de alla y no se tocan.
  const separadas =
    estado === "EXPIRADA" || estado === "ACTIVA"
      ? ordenes.filter((orden) => orden.estado === estado)
      : ordenes;

  return { ordenes: separadas, total: crudas.length };
}

export const TOPE_ORDENES = 100;

/** El historial de lo cobrado a mano, mas nuevo primero. Sin filtros. */
export async function obtenerVentasManuales(): Promise<VentaManual[]> {
  const ventas = await pedirAdmin<VentaManualJson[]>("/api/admin/ventas");

  return ventas.map((venta) => ({ ...venta, creadoEl: aFecha(venta.creadoEl) }));
}

export const TOPE_VENTAS = 100;

/** Los casos sin resolver. Traen el comprador porque lo primero es llamarlo. */
export const obtenerIncidencias = cache(async (): Promise<Incidencia[]> => {
  const incidencias = await pedirAdmin<IncidenciaJson[]>(
    "/api/admin/incidencias",
  );

  return incidencias.map((incidencia) => ({
    ...incidencia,
    creadoEl: aFecha(incidencia.creadoEl),
  }));
});

/** El caso completo, para tener a la vista antes de levantar el telefono. */
export async function obtenerCaso(id: number): Promise<Caso | null> {
  if (!Number.isInteger(id) || id <= 0) return null;

  const caso = await pedirAdminOpcional<CasoJson>(
    `/api/admin/incidencias/${id}`,
  );

  if (!caso) return null;

  return {
    ...caso,
    creadoEl: aFecha(caso.creadoEl),
    resueltaEl: aFecha(caso.resueltaEl),
    orden: aOrden(caso.orden),
    pago: caso.pago
      ? { ...caso.pago, aprobadoEl: aFecha(caso.pago.aprobadoEl) }
      : null,
  };
}

/**
 * Cuantas butacas tiene que devolverle la reubicacion a esta persona.
 *
 * El backend deriva la cantidad del cobro y no la manda en ningun campo: si no
 * coincide, contesta 422 diciendo cuantas pago y cuantas se mandaron. Esto es
 * una pista para no llegar hasta ahi —el detalle trae las butacas que habia
 * elegido y perdio, incluidas las liberadas— pero la verdad la dice el 422.
 */
export function butacasEsperadas(caso: Caso): number {
  return caso.orden.butacas.length;
}

/** Un caso ya cerrado no admite tomar, reubicar ni resolver: contesta 422. */
export function estaResuelto(estado: EstadoIncidencia, resueltaEl: Date | null) {
  return resueltaEl !== null || !["ABIERTA", "EN_CURSO"].includes(estado);
}
