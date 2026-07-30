import { z } from "zod";

// Estos schemas los usan los dos lados: el formulario en el navegador y la
// accion en el servidor. Un solo lugar define que es un DNI valido.

/**
 * El tope de asientos sale de la tabla `evento`, por eso es un parametro y no
 * un numero escrito aca.
 */
export const crearReservaSchema = (maxAsientos: number) =>
  z.object({
    nombre: z.string().trim().min(2, "Ingresá tu nombre").max(60),
    apellido: z.string().trim().min(2, "Ingresá tu apellido").max(60),

    // 20.123.456 y 20123456 son la misma persona.
    dni: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{7,8}$/, "El DNI tiene que tener 7 u 8 números")),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Revisá el email: ahí te mandamos las entradas"))
      .pipe(z.string().max(120)),

    // Se saca el +54, el 0 y el 15: quedan 10 digitos.
    celular: z
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
      ),

    asientosIds: z
      .array(z.number().int().positive())
      .min(1, "Elegí al menos una silla")
      .max(maxAsientos, `Como máximo ${maxAsientos} sillas por compra`),
  });

export type DatosReserva = z.infer<ReturnType<typeof crearReservaSchema>>;

/** Lo que carga la persona en el formulario, sin los asientos. */
export type DatosComprador = Omit<DatosReserva, "asientosIds">;
