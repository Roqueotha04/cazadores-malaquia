import "server-only";

import { cache } from "react";
import { aFecha } from "@/lib/api";
import {
  aOrden,
  obtenerEntradasPorToken,
  obtenerOrdenPorToken,
} from "@/lib/consultas";
import { diaClave } from "@/lib/formato";
import { pedirAdmin, pedirAdminOpcional } from "./api";
import type {
  Caso,
  CasoJson,
  Cuenta,
  DiaDeVenta,
  EntradaVendida,
  ErrorOperativo,
  ErrorOperativoJson,
  EstadoIncidencia,
  Incidencia,
  IncidenciaJson,
  Invitado,
  InvitadoJson,
  OrdenAdmin,
  OrdenAdminJson,
  Resumen,
  Tope,
  VentaManual,
  VentaManualJson,
} from "./tipos";
import type { Entrada, EstadoOrden, Orden } from "@/lib/tipos";

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
 * El corte de venta vigente. La pantalla de Evento precarga el resto del
 * formulario con el público `GET /api/evento` (`obtenerEvento` de
 * `lib/consultas.ts`); esto es lo único que pasa por acá, porque el corte es
 * información operativa que esa ruta pública no expone.
 */
export async function obtenerTope(): Promise<Tope> {
  return pedirAdmin<Tope>("/api/admin/evento/tope");
}

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

/**
 * Las compras pagadas, agrupadas por el dia en que entro la plata.
 *
 * **No hay un endpoint que liste entradas.** Esto se arma con la misma lista de
 * ordenes de arriba, filtrada en `PAGADA`, y de ahi salen todos los encabezados
 * de la pantalla sin pedir nada mas: la cantidad de butacas de un dia es la suma
 * de `orden.butacas` y la plata, la de `totalCentavos`.
 *
 * Hereda el tope de 100 de `/api/admin/ordenes`, que no tiene paginado ni filtro
 * por fecha. Por eso devuelve `total`: es lo unico que despues deja avisar que
 * la lista quedo corta.
 *
 * El dia sale de `pagadoEl` en hora de Buenos Aires. Una orden `PAGADA` sin
 * `pagadoEl` es un dato roto —no deberia existir— y se junta aparte en vez de
 * caer en un dia inventado.
 */
export async function obtenerDiasDeVenta(q?: string): Promise<{
  dias: DiaDeVenta[];
  sinFecha: OrdenAdmin[];
  total: number;
}> {
  const { ordenes, total } = await buscarOrdenes({ estado: "PAGADA", q });

  const porDia = new Map<string, DiaDeVenta>();
  const sinFecha: OrdenAdmin[] = [];

  for (const orden of ordenes) {
    if (!orden.pagadoEl) {
      sinFecha.push(orden);
      continue;
    }

    const clave = diaClave(orden.pagadoEl);
    const dia = porDia.get(clave);

    if (dia) {
      dia.ordenes.push(orden);
      dia.butacas += orden.butacas;
      dia.totalCentavos += orden.totalCentavos;
    } else {
      porDia.set(clave, {
        clave,
        fecha: orden.pagadoEl,
        ordenes: [orden],
        butacas: orden.butacas,
        totalCentavos: orden.totalCentavos,
      });
    }
  }

  // Lo mas nuevo primero, y adentro de cada dia tambien: la pantalla se abre el
  // dia del evento y lo que interesa es lo ultimo que se vendio.
  const dias = [...porDia.values()].sort((a, b) => b.clave.localeCompare(a.clave));

  for (const dia of dias) {
    dia.ordenes.sort(
      (a, b) => (b.pagadoEl?.getTime() ?? 0) - (a.pagadoEl?.getTime() ?? 0),
    );
  }

  return { dias, sinFecha, total };
}

/**
 * Las entradas emitidas de un dia, una por butaca.
 *
 * Dos pedidos por orden, todos en paralelo. `/api/ordenes/{token}/entradas` es
 * el unico lugar donde estan los codigos, y sin codigo no hay ni "cambiar
 * butaca" ni "anular"; `/api/ordenes/{token}` es el unico que trae al comprador
 * entero, y de ahi sale el mail al que fue el PDF —la lista de ordenes del
 * panel no lo incluye—. La pantalla llama a esto para todos sus dias de una:
 * son doscientos pedidos como techo —el tope de la lista de ordenes es cien— y
 * salen juntos.
 *
 * Es el endpoint publico, sin token de admin, y es a proposito: el contrato dice
 * que el detalle de una compra no tiene version admin.
 *
 * **Lo de `anulada` es deduccion, no dato.** Ese listado no trae `anuladaEl`,
 * pero anular devuelve la butaca a la venta y la saca de las que la orden
 * conserva. Entonces: si el dia trae mas entradas que butacas conservadas, esas
 * de mas estan anuladas, y para saber *cuales* se miran las butacas que la orden
 * conserva, que las lista el mismo detalle que ya se pidio por el mail.
 *
 * Si el cruce no cierra —porque el backend ya filtra las anuladas de ese listado,
 * o porque cambio lo que devuelve— **no se marca ninguna**. Tachar la entrada
 * equivocada es peor que no tachar ninguna: la de al lado es de otra persona.
 */
export async function obtenerEntradasDelDia(
  ordenes: OrdenAdmin[],
): Promise<EntradaVendida[]> {
  const porOrden = await Promise.all(
    ordenes.map(async (orden) => {
      const [entradas, detalle] = await Promise.all([
        obtenerEntradasPorToken(orden.token),
        obtenerOrdenPorToken(orden.token),
      ]);

      const anuladas = deducirAnuladas(orden, entradas, detalle);

      return entradas.map((entrada) => ({
        ...entrada,
        anulada: anuladas.has(entrada.asientoNumero),
        ordenToken: orden.token,
        dni: orden.dni,
        comprador: orden.comprador,
        email: detalle?.usuario.email ?? null,
        origen: orden.origen,
        pagadoEl: orden.pagadoEl,
      }));
    }),
  );

  return porOrden
    .flat()
    .sort((a, b) => (b.pagadoEl?.getTime() ?? 0) - (a.pagadoEl?.getTime() ?? 0));
}

/** Los numeros de butaca anulados de una orden, o vacio si el cruce no cierra. */
function deducirAnuladas(
  orden: OrdenAdmin,
  entradas: Entrada[],
  detalle: Orden | null,
): Set<number> {
  const sobran = entradas.length - orden.butacas;

  if (sobran <= 0) return new Set();

  if (!detalle) return new Set();

  const conserva = new Set(detalle.butacas.map((butaca) => butaca.numero));
  const fuera = entradas.filter((e) => !conserva.has(e.asientoNumero));

  // Los numeros tienen que dar exactamente. Si no dan, algo no es lo que
  // creemos —empezando por que `asientoNumero` y `numero` sean la misma
  // numeracion— y marcar de mas seria mentir sobre entradas que valen.
  return fuera.length === sobran
    ? new Set(fuera.map((e) => e.asientoNumero))
    : new Set();
}

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
 * **Es una pista, no la verdad.** El backend deriva la cantidad del cobro y no
 * la manda en ningun campo: si no coincide, contesta 422 diciendo cuantas pago y
 * cuantas se mandaron, y ese mensaje es mas exacto que cualquier cuenta de este
 * lado. Por eso la pantalla la muestra pero no la usa para bloquear nada.
 *
 * Se calcula como el backend: plata cobrada dividida el precio que se le
 * congelo a esa orden. Solo vale si divide exacto — `MONTO_DISTINTO` es
 * justamente el caso en que Mercado Pago informo un importe que no es el que se
 * pidio cobrar, y ahi la division no cierra. Cuando no cierra, o cuando todavia
 * no hay cobro aprobado, cae en las butacas que la orden conserva.
 *
 * Contar las butacas no alcanza solo: en `SIN_BUTACA` son cero y en
 * `BUTACAS_INCOMPLETAS` son menos de las que se pagaron.
 */
export function butacasEsperadas(caso: Caso): number {
  const precio = caso.orden.precioUnitarioCentavos;
  const cobrado = caso.pago?.montoCentavos ?? 0;

  if (precio > 0 && cobrado > 0 && cobrado % precio === 0) {
    return cobrado / precio;
  }

  return caso.orden.butacas.length;
}

/**
 * Lo que se rompio del lado del servidor y necesita una mano.
 *
 * No son casos: los tres `COBRO_*` son plata que hay que devolver, y un
 * `MAIL_NO_ENVIADO` es alguien que pago y no tiene sus entradas.
 *
 * **Llega ordenado y no se reordena acá**: urgentes arriba y, dentro de cada
 * gravedad, lo mas nuevo primero. Con `pendientes` en false vienen tambien los
 * ya atendidos.
 */
export async function obtenerErrores(pendientes = true): Promise<ErrorOperativo[]> {
  const errores = await pedirAdmin<ErrorOperativoJson[]>(
    `/api/admin/errores?pendientes=${pendientes}`,
  );

  return errores.map((error) => ({
    ...error,
    ocurrioEl: aFecha(error.ocurrioEl),
    atendidoEl: aFecha(error.atendidoEl),
  }));
}

/** Un caso ya cerrado no admite tomar, reubicar ni resolver: contesta 422. */
export function estaResuelto(estado: EstadoIncidencia, resueltaEl: Date | null) {
  return resueltaEl !== null || !["ABIERTA", "EN_CURSO"].includes(estado);
}
