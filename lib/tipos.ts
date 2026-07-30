// Tipos compartidos entre el servidor y los componentes de cliente.

export type EstadoAsiento = "DISPONIBLE" | "RESERVADO" | "VENDIDO";
export type EstadoReserva = "ACTIVA" | "PAGADA" | "EXPIRADA" | "CANCELADA";
export type EstadoPago = "PENDIENTE" | "APROBADO" | "RECHAZADO";

export type Evento = {
  nombre: string;
  fecha: Date | null;
  lugar: string | null;
  precioCentavos: number;
  maxAsientosPorCompra: number;
  minutosReserva: number;
  ventasAbiertas: boolean;
};

export type Asiento = {
  id: number;
  posicion: number;
  lado: "IZQUIERDA" | "DERECHA";
  estado: EstadoAsiento;
};

export type Mesa = {
  numero: number;
  fila: "ARRIBA" | "ABAJO";
  capacidad: number;
  asientos: Asiento[];
};

export type Mapa = {
  evento: Evento;
  mesas: Mesa[];
};

/** Un asiento con su mesa, para mostrarlo como "Mesa 13 · Silla 6". */
export type AsientoElegido = {
  id: number;
  mesa: number;
  silla: number;
};

export type Reserva = {
  token: string;
  estado: EstadoReserva;
  expiraEn: Date;
  titular: string;
  email: string;
  asientos: AsientoElegido[];
  montoCentavos: number;
  estadoPago: EstadoPago;
};

export type Entrada = {
  codigo: string;
  mesa: number;
  silla: number;
};

/** Lo que devuelven todas las acciones. Nunca lanzan al navegador. */
export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string; asientosOcupados?: number[] };
