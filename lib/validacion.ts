import { z } from "zod";

// Estos schemas los usan los dos lados: el formulario en el navegador y la
// accion en el servidor. Un solo lugar define que es un DNI valido.

/**
 * Un celular argentino, normalizado: se saca el +54, el 0 y el 15, y quedan 10
 * digitos.
 *
 * Vive suelto porque lo piden dos formularios (la compra y el contacto). La
 * regla de "sin +54, sin 0, sin 15" se define una sola vez o deja de ser una
 * regla.
 */
export const celularSchema = z
  .string()
  .transform((v) =>
    v
      .replace(/\D/g, "")
      .replace(/^54/, "")
      .replace(/^0/, "")
      .replace(/^15/, ""),
  )
  .pipe(
    z
      .string()
      .regex(/^\d{10}$/, "Ingresá el celular con característica, sin 0 ni 15"),
  );

export const nombreSchema = z.string().trim().min(2, "Ingresá tu nombre").max(60);
export const apellidoSchema = z
  .string()
  .trim()
  .min(2, "Ingresá tu apellido")
  .max(60);

/**
 * 20.123.456 y 20123456 son la misma persona.
 *
 * Suelto porque lo piden la compra, la carga a mano del panel y la busqueda de
 * la puerta. Con puntos no se encuentra a nadie en la puerta.
 */
export const dniSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{7,8}$/, "El DNI tiene que tener 7 u 8 números"));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Revisá el email: ahí te mandamos las entradas"))
  .pipe(z.string().max(120));

/** Los cuatro datos de contacto de un comprador, sin el DNI. */
export const contactoComprador = {
  nombre: nombreSchema,
  apellido: apellidoSchema,
  email: emailSchema,
  celular: celularSchema,
};

/**
 * El tope de asientos sale del evento, por eso es un parametro y no un numero
 * escrito aca.
 *
 * Los campos son los mismos que pide `POST /api/ordenes`, pero planos: el
 * formulario no anida. La accion arma el `usuario` antes de mandar.
 */
export const crearOrdenSchema = (maxAsientos: number) =>
  z.object({
    ...contactoComprador,
    dni: dniSchema,

    // Singular, como lo llama el backend.
    asientoIds: z
      .array(z.number().int().positive())
      .min(1, "Elegí al menos una silla")
      .max(maxAsientos, `Como máximo ${maxAsientos} sillas por compra`),
  });

export type DatosOrden = z.infer<ReturnType<typeof crearOrdenSchema>>;

/** Lo que carga la persona en el formulario, sin los asientos. */
export type DatosComprador = Omit<DatosOrden, "asientoIds">;

/**
 * Consulta desde la landing. No pide email a proposito: el canal de respuesta
 * es el WhatsApp, que es donde este publico contesta.
 */
export const contactoSchema = z.object({
  nombre: nombreSchema,
  apellido: apellidoSchema,
  celular: celularSchema,
  motivo: z
    .string()
    .trim()
    .min(10, "Contanos un poco más")
    .max(600, "Máximo 600 caracteres"),
});

export type DatosContacto = z.infer<typeof contactoSchema>;
