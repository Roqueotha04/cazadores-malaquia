const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** 15000000 → "$150.000" */
export function precio(centavos: number) {
  return pesos.format(centavos / 100);
}

const fechaLarga = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function fechaEvento(fecha: Date | null) {
  return fecha ? fechaLarga.format(fecha) : "Fecha a confirmar";
}

/** 90 → "01:30" */
export function reloj(segundos: number) {
  const s = Math.max(0, segundos);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** "Mesa 13 · Silla 6" — nunca "Asiento 654". */
export function ubicacion(mesa: number, silla: number) {
  return `Mesa ${mesa} · Silla ${silla}`;
}

/* ------------------------------------------------------------------ panel
 *
 * El panel muestra decenas de fechas por pantalla y no le entra la fecha larga
 * del sitio de venta. Todo en la zona de Buenos Aires, como el resto: el
 * backend manda el offset y no hay que asumir UTC.
 */

const ZONA = "America/Argentina/Buenos_Aires";

const cortaConHora = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZONA,
});

const soloHora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZONA,
});

/** 01/08 23:10 — para tablas. `null` se muestra como raya, no como vacio. */
export function fechaCorta(fecha: Date | null, siNoHay = "—") {
  return fecha ? cortaConHora.format(fecha) : siNoHay;
}

/** 21:14 — "entró a las 21:14" en la puerta. */
export function hora(fecha: Date | null, siNoHay = "—") {
  return fecha ? soloHora.format(fecha) : siNoHay;
}

/**
 * Centavos → los pesos que se tipean en el formulario del evento.
 *
 * Sin separadores ni simbolo: es el valor de un `<input type="number">`.
 */
export function aPesos(centavos: number) {
  return Math.round(centavos / 100);
}

/**
 * Un dato que el backend mando en `null` cuando no deberia.
 *
 * `medio` y `montoCentavos` de una venta a mano pueden venir vacios si la venta
 * no tiene cobro aprobado. Mostrarlo como "$0" seria mentir: son cosas
 * distintas y la de arriba es un error que alguien tiene que ir a mirar.
 */
export const SIN_DATO = "sin cobro registrado";
