// Tipos compartidos entre el servidor y los componentes de cliente.
//
// Siguen el vocabulario del backend (`.claude/api-frontend.md`): lo que aca se
// llama orden es lo que el back llama orden. La url publica sigue siendo
// /reserva/{token} porque es la que el comprador tiene guardada.

export type EstadoAsiento = "DISPONIBLE" | "RESERVADO" | "VENDIDO";

/**
 * `ANULADA` no es lo mismo que `CANCELADA`, aunque las dos terminen con las
 * butacas de vuelta en el mapa: cancelar lo hace el comprador con algo que nunca
 * se pago, anular lo hace el equipo con algo que si se cobro. La diferencia es
 * plata que hay que devolver a mano.
 */
export type EstadoOrden =
  | "ACTIVA"
  | "PAGADA"
  | "EXPIRADA"
  | "CANCELADA"
  | "ANULADA";

/** `WEB` es la compra del cliente; `ADMIN`, la que cargo el equipo a mano. */
export type OrigenOrden = "WEB" | "ADMIN";

export type Evento = {
  nombre: string;
  fecha: Date | null;
  lugar: string | null;
  precioCentavos: number;
  /**
   * De 0 a 100, hasta 2 decimales (ej. 4.00 para 4%). Cubre la comisión que
   * cobra Mercado Pago; no se muestra en el plano ni al elegir sillas, solo
   * a partir de que existe una orden (ver `Orden.tarifaServicioUnitarioCentavos`).
   */
  tarifaServicioPorcentaje: number;
  maxAsientosPorCompra: number;
  minutosReserva: number;
  ventasAbiertas: boolean;
};

/**
 * Una butaca del plano.
 *
 * `numero` es el identificador global, 1 a 730: es el que ve la gente, el que
 * imprime el PDF de la entrada y el que se canta en la puerta. La mesa 3 no
 * tiene butaca 1, va de la 107 a la 158.
 *
 * `posicion` es el lugar dentro del lado de la mesa (1 a capacidad) y sirve solo
 * para dibujar la columna en orden. No es unico en el salon: hay catorce
 * butacas con `posicion` 1.
 */
export type Asiento = {
  id: number;
  numero: number;
  posicion: number;
  lado: "IZQUIERDA" | "DERECHA";
  estado: EstadoAsiento;
};

export type Mesa = {
  id: number;
  numero: number;
  fila: "ARRIBA" | "ABAJO";
  /** Posicion de la mesa dentro de su fila, para dibujarlas de izquierda a derecha. */
  orden: number;
  capacidad: number;
  asientos: Asiento[];
};

export type Mapa = {
  evento: Evento;
  mesas: Mesa[];
};

/** Una butaca con su mesa, para mostrarla como "Mesa 13 · Silla 632". */
export type AsientoElegido = {
  id: number;
  mesa: number;
  /** El `numero` global del asiento, no su posicion en la mesa. */
  silla: number;
};

export type UsuarioOrden = {
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  celular: string;
};

/** Una butaca dentro de una orden. `numero` es el global; `asientoId`, la clave. */
export type Butaca = {
  asientoId: number;
  numero: number;
  mesaNumero: number;
};

export type Orden = {
  token: string;
  estado: EstadoOrden;
  /**
   * Opcional a proposito: el ejemplo de `OrdenResponse` en `api-frontend.md`
   * todavia no lo lista, y este tipo lo comparte el flujo de compra publico.
   * Solo se pinta si viene.
   */
  origen?: OrigenOrden;
  /** Congelado al crear la orden: vale lo que se le mostro al comprador. */
  precioUnitarioCentavos: number;
  /**
   * Parte de `precioUnitarioCentavos` que es tarifa de servicio, ya congelada.
   * La entrada sola es `precioUnitarioCentavos - tarifaServicioUnitarioCentavos`.
   * En ventas cargadas a mano siempre es 0: ahi no hay comision de Mercado Pago
   * que cubrir.
   */
  tarifaServicioUnitarioCentavos: number;
  totalCentavos: number;
  creadoEl: Date | null;
  /** `null` cuando la orden ya esta pagada: esa reserva no vence nunca mas. */
  expiraEn: Date | null;
  pagadoEl: Date | null;
  usuario: UsuarioOrden;
  butacas: Butaca[];
};

export type Entrada = {
  /** El uuid completo. Sin QR todavia, es lo unico que confirma la entrada. */
  codigo: string;
  mesaNumero: number;
  asientoNumero: number;
  titular: string;
  /** `null` hasta que la escanean en la puerta. */
  usadoEl: Date | null;
};

/** "Nombre Apellido": el back manda los dos campos por separado. */
export function titularDe(usuario: UsuarioOrden) {
  return `${usuario.nombre} ${usuario.apellido}`.trim();
}

/** Lo que devuelven todas las acciones. Nunca lanzan al navegador. */
export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string; asientosOcupados?: number[] };
