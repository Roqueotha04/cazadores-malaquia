/**
 * El colchon del checkout, en milisegundos.
 *
 * El backend arma el link de Mercado Pago con un minuto menos de vida que la
 * orden (`mp.minutos-antes-del-vencimiento=1`): ese margen evita que un pago se
 * apruebe justo cuando la butaca ya volvio a la venta. Pedir el link dentro de
 * ese ultimo minuto no falla feo, falla igual: devuelve 409 OrdenExpirada.
 *
 * Asi que el front descuenta ese minuto de todo lo que muestra. Si la reserva
 * dura 10 minutos, el contador arranca en 9 y el boton de pagar se apaga cuando
 * llega a cero. Nadie ve tiempo que no puede usar.
 *
 * OJO: este numero no viaja en ninguna respuesta, esta escrito de los dos lados.
 * Si el back cambia esa propiedad, hay que cambiarlo aca a mano. Decision
 * tomada a sabiendas.
 */
export const COLCHON_PAGO_MS = 60_000;

/** Los mismos 60 segundos en minutos, para el copy: "te las guardamos 9 minutos". */
export const COLCHON_PAGO_MIN = COLCHON_PAGO_MS / 60_000;
