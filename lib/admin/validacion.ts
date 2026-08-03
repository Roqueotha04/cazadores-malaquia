import { z } from "zod";
import { contactoComprador, dniSchema } from "@/lib/validacion";

/**
 * Schemas del panel. Los usan el formulario y la accion, igual que en el front
 * de venta: un solo lugar define que es valido.
 *
 * Los limites son los del contrato (`.claude/api-admin-frontend.md`). Validar
 * acá es por comodidad, no por seguridad: el backend valida todo otra vez y es
 * el unico que decide.
 */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Revisá el email")),
  // Sin minimo ni forma: la contraseña es la que es, y adivinar reglas que el
  // backend no tiene solo lograria rechazar la correcta.
  password: z.string().min(1, "Escribí la contraseña"),
});

/**
 * Carga de una venta cobrada afuera.
 *
 * Sin tope de butacas a proposito: el contrato dice que la carga a mano no
 * valida `maxAsientosPorCompra` ni `ventasAbiertas`. Se puede cargar con la
 * venta cerrada y por encima del maximo.
 */
export const ventaManualSchema = z.object({
  ...contactoComprador,
  dni: dniSchema,
  medio: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
    error: "Elegí cómo se cobró",
  }),
  asientoIds: z
    .array(z.number().int().positive())
    .min(1, "Elegí al menos una butaca"),
});

/**
 * Correccion de los datos de contacto.
 *
 * Los cuatro campos son obligatorios y viajan siempre: es un reemplazo, no un
 * parche. El DNI no esta porque no se corrige — va en la ruta e identifica a la
 * persona.
 */
export const corregirUsuarioSchema = z.object(contactoComprador);

/** La nota con la que se cierra un caso sin reubicar. */
export const notaSchema = z
  .string()
  .trim()
  .min(1, "Contá qué pasó: un caso cerrado sin nota no se puede reconstruir")
  .max(500, "Máximo 500 caracteres");

export const LARGO_NOTA = 500;

export const resolverSchema = z.object({ nota: notaSchema });

export const reubicarSchema = z.object({
  asientoIds: z
    .array(z.number().int().positive())
    .min(1, "Elegí las butacas nuevas"),
});

export const cambiarButacaSchema = z.object({
  asientoId: z.number().int().positive("Elegí la butaca de destino"),
});

/** Los limites que declara el contrato para la configuracion del evento. */
export const MIN_RESERVA = 5;
export const MAX_RESERVA = 180;
export const MIN_ASIENTOS = 1;
export const MAX_ASIENTOS = 50;

/**
 * Configuracion del evento. Es un reemplazo completo, no un parche: todos los
 * campos son obligatorios y hay que precargar el formulario con lo que devuelve
 * `GET /api/evento`.
 *
 * La fecha **no** se valida como futura, a proposito: el dia del evento es justo
 * cuando puede hacer falta corregir el lugar o la hora.
 */
export const eventoSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre del evento").max(120),
  fecha: z
    .string()
    .trim()
    .min(1, "Ingresá la fecha y la hora"),
  lugar: z.string().trim().min(2, "Ingresá el lugar").max(200),
  // En pesos: es lo que se tipea. La accion lo pasa a centavos antes de enviar.
  precio: z.coerce
    .number({ error: "Ingresá el precio" })
    .int("El precio va en pesos enteros")
    .positive("El precio tiene que ser mayor a cero"),
  maxAsientosPorCompra: z.coerce
    .number({ error: "Ingresá el máximo de butacas" })
    .int()
    .min(MIN_ASIENTOS, `Mínimo ${MIN_ASIENTOS}`)
    .max(MAX_ASIENTOS, `Máximo ${MAX_ASIENTOS}`),
  minutosReserva: z.coerce
    .number({ error: "Ingresá los minutos de reserva" })
    .int()
    .min(MIN_RESERVA, `Mínimo ${MIN_RESERVA} minutos`)
    .max(MAX_RESERVA, `Máximo ${MAX_RESERVA} minutos`),
});
