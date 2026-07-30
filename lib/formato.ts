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
