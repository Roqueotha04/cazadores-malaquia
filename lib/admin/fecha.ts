/**
 * La fecha del evento, entre el backend y un `<input type="datetime-local">`.
 *
 * El backend manda y espera ISO-8601 con offset ("2026-08-03T21:00:00-03:00").
 * El input, en cambio, no tiene zona: da y toma "2026-08-03T21:00" a secas, en
 * la hora local del navegador. Si mandaramos eso tal cual, la hora de la cena se
 * correria segun donde este parado el que edita.
 *
 * Argentina no mueve el reloj desde 2009: son -03:00 todo el año. Por eso el
 * offset se escribe fijo en vez de calcularlo. Si algun dia vuelve el horario de
 * verano, este es el archivo que se toca.
 */

export const OFFSET_AR = "-03:00";

const partes = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** `Date` → "2026-08-03T21:00", en hora de Buenos Aires. Para precargar. */
export function paraInputFechaHora(fecha: Date | null): string {
  if (!fecha) return "";

  const partido = Object.fromEntries(
    partes.formatToParts(fecha).map((p) => [p.type, p.value]),
  );

  // en-CA da el dia como "2026-08-03" y la hora como "21:00", que es justo el
  // formato del input. `hour12: false` puede devolver "24" a la medianoche.
  const horas = partido.hour === "24" ? "00" : partido.hour;

  return `${partido.year}-${partido.month}-${partido.day}T${horas}:${partido.minute}`;
}

/** "2026-08-03T21:00" → "2026-08-03T21:00:00-03:00". Para enviar. */
export function desdeInputFechaHora(valor: string): string {
  const limpio = valor.trim();

  // Algunos navegadores agregan los segundos si el input tiene `step`.
  const conSegundos = /T\d{2}:\d{2}:\d{2}$/.test(limpio)
    ? limpio
    : `${limpio}:00`;

  return `${conSegundos}${OFFSET_AR}`;
}
