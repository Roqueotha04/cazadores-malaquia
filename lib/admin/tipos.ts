// Tipos del panel de administracion.
//
// El contrato es `.claude/api-admin-frontend.md`. Valen las mismas convenciones
// que en el front de venta: plata en centavos, fechas ISO-8601 con offset,
// vocabulario del backend.
//
// Igual que en `lib/consultas.ts`, cada tipo tiene su gemelo "en el cable" con
// las fechas como string. La conversion pasa una sola vez, en el borde
// (`lib/admin/consultas.ts`), y de ahi para adentro son `Date`.

import type { EstadoOrden, OrigenOrden, UsuarioOrden } from "@/lib/tipos";

export type MedioPago = "MERCADOPAGO" | "EFECTIVO" | "TRANSFERENCIA";

/** Los dos medios que se cobran afuera. Mercado Pago no se carga a mano. */
export type MedioManual = Extract<MedioPago, "EFECTIVO" | "TRANSFERENCIA">;

// Vive en `lib/tipos.ts` porque el detalle de orden lo necesita y ese tipo lo
// comparte el flujo de compra publico. Se reexporta para no tocar a quienes ya
// lo importan de acá.
export type { OrigenOrden };

/**
 * Los cuatro motivos por los que se abre un caso.
 *
 * Los dos primeros dejan a alguien sin lugar; `BUTACAS_INCOMPLETAS` deja a
 * alguien con menos entradas de las que pago —llega a la puerta y falta una— y
 * `MONTO_DISTINTO` es una diferencia de plata que no bloquea a nadie.
 */
export type TipoIncidencia =
  | "PAGO_TARDIO"
  | "SIN_BUTACA"
  | "BUTACAS_INCOMPLETAS"
  | "MONTO_DISTINTO";
export type EstadoIncidencia = "ABIERTA" | "EN_CURSO";

/** El de arriba a la derecha. `GET /api/auth/yo`. */
export type Cuenta = {
  email: string;
  nombre: string;
};

// ---------------------------------------------------------------- Tablero

/**
 * `GET /api/admin/resumen`.
 *
 * `porMedio` trae siempre los tres medios y `ordenesPorEstado` los cinco
 * estados, aunque esten en cero: al panel no le tienen que aparecer renglones
 * nuevos a medida que avanza la venta.
 */
export type Resumen = {
  butacas: {
    total: number;
    /** Entradas emitidas. No se pisa con `reservadas`. */
    vendidas: number;
    /** Butacas agarradas sin pagar. */
    reservadas: number;
    libres: number;
    entradasUsadas: number;
    /**
     * Entradas dadas de baja. **No se resta de nada**: la butaca de una anulada
     * ya salio de `vendidas` y volvio a `libres` sola. Va aparte porque cada una
     * es plata que hay que devolver a mano, y escondida no la reclama nadie.
     */
    entradasAnuladas: number;
  };
  recaudacion: {
    totalCentavos: number;
    porMedio: { medio: MedioPago; totalCentavos: number; cantidad: number }[];
    ordenesPorEstado: { estado: EstadoOrden; cantidad: number }[];
  };
  incidenciasPendientes: number;
  /**
   * Errores operativos sin atender. **No son casos**: los tres `COBRO_*` son
   * plata mal cobrada que hay que devolver a mano, y un `MAIL_NO_ENVIADO` es
   * alguien que pago y no tiene sus entradas.
   */
  erroresPendientes: number;
};

// ------------------------------------------------------- Errores operativos

/**
 * Cuanto quema. Es un conjunto cerrado y es lo que decide el color de la fila
 * —a diferencia de `TipoError`, que puede crecer sin aviso.
 */
export type Gravedad = "URGENTE" | "REVISAR";

/**
 * Que fue lo que paso.
 *
 * **Es una lista abierta**: la columna no tiene `CHECK` en la base, asi que un
 * tipo nuevo puede aparecer sin migracion y sin que este archivo se entere. El
 * `(string & {})` es justamente para eso — deja que TypeScript siga
 * autocompletando los conocidos pero acepta cualquier otro. Nada de `switch`
 * exhaustivo: lo desconocido se muestra con su `mensaje` tal cual y se pinta por
 * `gravedad`.
 *
 * Los tres `COBRO_*` son plata: uno cobrado dos veces, uno cobrado sobre una
 * compra dada de baja y uno devuelto o desconocido.
 */
export type TipoError =
  | "COBRO_DUPLICADO"
  | "COBRO_DE_ORDEN_CAIDA"
  | "COBRO_DEVUELTO"
  | "MAIL_NO_ENVIADO"
  | "ERROR_INESPERADO"
  | "COMMIT_FALLIDO"
  | (string & {});

/** `GET /api/admin/errores`. Llega ya ordenado: urgentes arriba, lo nuevo primero. */
export type ErrorOperativo = {
  id: number;
  tipo: TipoError;
  gravedad: Gravedad;
  /** Escrito para leerse. Es lo que se muestra, siempre. */
  mensaje: string;
  detalle: string | null;
  /**
   * `ordenId` y `ruta` son excluyentes en la practica: los urgentes traen orden,
   * los de revisar traen ruta. **No viene el token de la orden por ningun
   * campo** —es la credencial con la que se bajan esas entradas y una pantalla
   * se comparte por captura—, asi que para abrir la compra hay que buscarla.
   */
  ordenId: number | null;
  /**
   * El **patron** del endpoint, no la URL que se pidio: llega
   * `"GET /api/ordenes/{token}/entradas.pdf"` con la llave literal. No sirve
   * para abrir nada ni para saber a que compra le paso, y es a proposito.
   */
  ruta: string | null;
  ocurrioEl: Date | null;
  /** `null` = pendiente. No hay estado intermedio. */
  atendidoEl: Date | null;
};

export type ErrorOperativoJson = Omit<
  ErrorOperativo,
  "ocurrioEl" | "atendidoEl"
> & {
  ocurrioEl: string | null;
  atendidoEl: string | null;
};

// ----------------------------------------------------------------- Puerta

/** Una entrada como la ve la puerta. Es la unica que trae `anuladaEl`. */
export type EntradaInvitado = {
  codigo: string;
  mesaNumero: number;
  asientoNumero: number;
  titular: string;
  /** `null` hasta que la escanean en la puerta. */
  usadoEl: Date | null;
  /**
   * Dada de baja. La lista trae tambien las entradas anuladas: sin mirar esto
   * una butaca anulada se lee como vigente y la puerta deja pasar a alguien
   * que ya no tiene lugar.
   */
  anuladaEl: Date | null;
};

export type Invitado = {
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  celular: string;
  /**
   * Compro y no llego a pagar. Sin este dato, quien llega diciendo que compro y
   * no tiene ninguna entrada aparece igual que quien nunca compro.
   */
  tieneOrdenSinPagar: boolean;
  entradas: EntradaInvitado[];
};

export type InvitadoJson = Omit<Invitado, "entradas"> & {
  entradas: (Omit<EntradaInvitado, "usadoEl" | "anuladaEl"> & {
    usadoEl: string | null;
    anuladaEl: string | null;
  })[];
};

// ---------------------------------------------------------------- Ordenes

export type OrdenAdmin = {
  token: string;
  estado: EstadoOrden;
  /** `WEB` es la compra del cliente; `ADMIN`, la que cargo el equipo. */
  origen: OrigenOrden;
  comprador: string;
  dni: string;
  creadoEl: Date | null;
  pagadoEl: Date | null;
  /** Las que la orden **todavia conserva**: una CANCELADA muestra 0. */
  butacas: number;
  totalCentavos: number;
};

export type OrdenAdminJson = Omit<OrdenAdmin, "creadoEl" | "pagadoEl"> & {
  creadoEl: string | null;
  pagadoEl: string | null;
};

// ---------------------------------------------------- Ventas cobradas a mano

export type VentaManual = {
  token: string;
  comprador: string;
  dni: string;
  /** Cuando se **cargo** la venta, no cuando se cobro. */
  creadoEl: Date | null;
  butacas: number;
  /**
   * `null` si la venta no tiene cobro aprobado. No deberia pasar: es un dato
   * roto y hay que mostrarlo como tal, nunca como cero.
   */
  medio: MedioManual | null;
  montoCentavos: number | null;
};

export type VentaManualJson = Omit<VentaManual, "creadoEl"> & {
  creadoEl: string | null;
};

/** Lo que pide `POST /api/admin/ventas`. Sin precio: sale del evento. */
export type NuevaVenta = {
  comprador: UsuarioOrden;
  asientoIds: number[];
  medio: MedioManual;
};

// ---------------------------------------------------------- Cola de casos

/** Un caso de la lista: lo justo para llamar por telefono. */
export type Incidencia = {
  id: number;
  tipo: TipoIncidencia;
  estado: EstadoIncidencia;
  comprador: string;
  dni: string;
  celular: string;
  creadoEl: Date | null;
};

export type IncidenciaJson = Omit<Incidencia, "creadoEl"> & {
  creadoEl: string | null;
};

export type Pago = {
  montoCentavos: number;
  medio: MedioPago;
  estado: string;
  aprobadoEl: Date | null;
  /** `null` en las ventas cargadas a mano. */
  referenciaExterna: string | null;
};

/**
 * El caso completo. La `orden` viene con **todas** sus butacas, incluidas las
 * liberadas: son las que esa persona habia elegido y perdio.
 */
export type Caso = Incidencia & {
  detalle: string | null;
  resueltaEl: Date | null;
  resueltaPor: string | null;
  orden: import("@/lib/tipos").Orden;
  /** `null` si todavia no hay cobro aprobado. */
  pago: Pago | null;
};

export type CasoJson = IncidenciaJson & {
  detalle: string | null;
  resueltaEl: string | null;
  resueltaPor: string | null;
  orden: import("@/lib/consultas").OrdenJson;
  pago:
    | (Omit<Pago, "aprobadoEl"> & { aprobadoEl: string | null })
    | null;
};

// -------------------------------------------------------------- Etiquetas

/** Los rotulos que se muestran. El backend manda el enum, la UI muestra esto. */
export const MEDIO: Record<MedioPago, string> = {
  MERCADOPAGO: "Mercado Pago",
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

export const ESTADO_ORDEN: Record<EstadoOrden, string> = {
  ACTIVA: "Activa",
  PAGADA: "Pagada",
  EXPIRADA: "Expirada",
  CANCELADA: "Cancelada",
  ANULADA: "Anulada",
};

export const ORIGEN: Record<OrigenOrden, string> = {
  WEB: "Web",
  ADMIN: "Cargada a mano",
};

export const TIPO_INCIDENCIA: Record<TipoIncidencia, string> = {
  PAGO_TARDIO: "Pago tardío",
  SIN_BUTACA: "Sin butaca",
  BUTACAS_INCOMPLETAS: "Faltan butacas",
  MONTO_DISTINTO: "Monto distinto",
};

export const ESTADO_INCIDENCIA: Record<EstadoIncidencia, string> = {
  ABIERTA: "Abierta",
  EN_CURSO: "En curso",
};

/**
 * Los tipos de error que sabemos nombrar.
 *
 * **Parcial a proposito**: la lista es abierta y va a crecer del lado del
 * backend. Lo que no este acá se muestra con su `mensaje`, que igual esta
 * escrito para leerse — nunca con la constante cruda ni con un "desconocido".
 */
export const TIPO_ERROR: Partial<Record<TipoError, string>> = {
  COBRO_DUPLICADO: "Cobrado dos veces",
  COBRO_DE_ORDEN_CAIDA: "Cobro de una compra caída",
  COBRO_DEVUELTO: "Cobro devuelto",
  MAIL_NO_ENVIADO: "Mail que no salió",
  ERROR_INESPERADO: "Error inesperado",
  COMMIT_FALLIDO: "No se pudo guardar",
};

/** El rotulo de un tipo, o nada si no lo conocemos. */
export function rotuloTipoError(tipo: TipoError): string | null {
  return TIPO_ERROR[tipo] ?? null;
}

export const GRAVEDAD: Record<Gravedad, string> = {
  URGENTE: "Urgente",
  REVISAR: "Revisar",
};

/** El orden en el que se pintan, siempre el mismo. */
export const MEDIOS: MedioPago[] = [
  "MERCADOPAGO",
  "EFECTIVO",
  "TRANSFERENCIA",
];

export const ESTADOS_ORDEN: EstadoOrden[] = [
  "ACTIVA",
  "PAGADA",
  "EXPIRADA",
  "CANCELADA",
  "ANULADA",
];
