import "server-only";

import type {
  Asiento,
  Entrada,
  Evento,
  Mapa,
  Mesa,
  Reserva,
} from "./tipos";

/**
 * Datos de ejemplo para trabajar el frontend sin el backend arriba.
 *
 * Se usan cuando no hay `API_URL` en el entorno. Reproducen la carga del salon
 * de `sql/02_seed.sql`: 14 mesas, 730 sillas, mesas 1 y 2 con 53.
 *
 * TEMPORAL: todo este archivo se borra cuando el backend este conectado.
 *
 * Tokens con comportamiento distinto, para poder ver las tres pantallas:
 *
 *   /reserva/lo-que-sea      → reserva ACTIVA, vence en 30 minutos
 *   /reserva/algo-pagada     → reserva PAGADA (redirige a las entradas)
 *   /reserva/algo-vencida    → reserva EXPIRADA
 *   /entradas/algo-pagada    → las entradas emitidas
 */

const PRECIO_CENTAVOS = 15_000_000; // $150.000

export function evento(): Evento {
  return {
    nombre: "Cena de Cazadores 2026",
    fecha: new Date("2026-10-02T20:00:00-03:00"),
    lugar: "A confirmar",
    precioCentavos: PRECIO_CENTAVOS,
    maxAsientosPorCompra: 10,
    minutosReserva: 30,
    ventasAbiertas: true,
  };
}

/**
 * Estado de una silla, estable entre recargas: la misma silla siempre da lo
 * mismo. Deja alrededor de un 15% ocupado para ver los tres colores del plano.
 */
function estadoDe(id: number): Asiento["estado"] {
  const mezcla = (id * 2654435761) % 100;

  if (mezcla < 10) return "VENDIDO";
  if (mezcla < 15) return "RESERVADO";

  return "DISPONIBLE";
}

function mesas(): Mesa[] {
  const salon: Mesa[] = [];
  let id = 1; // numero global de silla, 1..730

  for (let numero = 1; numero <= 14; numero++) {
    const capacidad = numero <= 2 ? 53 : 52;
    const mitad = Math.ceil(capacidad / 2);
    const asientos: Asiento[] = [];

    for (let posicion = 1; posicion <= capacidad; posicion++) {
      asientos.push({
        id,
        posicion,
        lado: posicion <= mitad ? "IZQUIERDA" : "DERECHA",
        estado: estadoDe(id),
      });
      id++;
    }

    salon.push({
      numero,
      fila: numero <= 7 ? "ARRIBA" : "ABAJO",
      capacidad,
      asientos,
    });
  }

  return salon;
}

export function mapa(): Mapa {
  return { evento: evento(), mesas: mesas() };
}

export function disponibles(): number {
  return mesas().reduce(
    (total, mesa) =>
      total + mesa.asientos.filter((a) => a.estado === "DISPONIBLE").length,
    0,
  );
}

/** De un id global de silla a su mesa y su posicion, sin recorrer el salon. */
function ubicacionDe(id: number) {
  let restante = id;

  for (let numero = 1; numero <= 14; numero++) {
    const capacidad = numero <= 2 ? 53 : 52;

    if (restante <= capacidad) return { mesa: numero, silla: restante };

    restante -= capacidad;
  }

  return { mesa: 14, silla: 52 };
}

export function asientosElegidos(ids: number[]) {
  return ids.map((id) => ({
    id,
    ...ubicacionDe(id),
    estado: estadoDe(id),
  }));
}

const ASIENTOS_DE_EJEMPLO = [1, 2, 55];

export function reserva(token: string): Reserva {
  const pagada = token.includes("pagada");
  const vencida = token.includes("vencida");

  return {
    token,
    estado: pagada ? "PAGADA" : vencida ? "EXPIRADA" : "ACTIVA",
    // Vence en 30 minutos para que el contador de la pantalla funcione.
    expiraEn: new Date(Date.now() + (vencida ? -60_000 : 30 * 60_000)),
    titular: "Bonifacio Malaquía",
    email: "bonifacio@ejemplo.com",
    asientos: ASIENTOS_DE_EJEMPLO.map((id) => ({ id, ...ubicacionDe(id) })),
    montoCentavos: ASIENTOS_DE_EJEMPLO.length * PRECIO_CENTAVOS,
    estadoPago: pagada ? "APROBADO" : vencida ? "RECHAZADO" : "PENDIENTE",
  };
}

export function entradas(token: string): Entrada[] {
  if (!token.includes("pagada")) return [];

  return ASIENTOS_DE_EJEMPLO.map((id, i) => ({
    codigo: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    ...ubicacionDe(id),
  }));
}
