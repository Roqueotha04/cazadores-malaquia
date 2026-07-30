"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Boton } from "@/components/ui/boton";
import { enviarCompra, type EstadoFormulario } from "@/lib/acciones/compra";

const CAMPOS = [
  {
    nombre: "nombre",
    etiqueta: "Nombre",
    tipo: "text",
    autoComplete: "given-name",
    mitad: true,
  },
  {
    nombre: "apellido",
    etiqueta: "Apellido",
    tipo: "text",
    autoComplete: "family-name",
    mitad: true,
  },
  {
    nombre: "dni",
    etiqueta: "DNI",
    tipo: "text",
    autoComplete: "off",
    inputMode: "numeric" as const,
    ayuda: "Sin puntos ni espacios",
  },
  {
    nombre: "email",
    etiqueta: "Email",
    tipo: "email",
    autoComplete: "email",
    ayuda: "Ahí te mandamos las entradas",
  },
  {
    nombre: "celular",
    etiqueta: "Celular",
    tipo: "tel",
    autoComplete: "tel",
    inputMode: "tel" as const,
    ayuda: "Con característica, sin 0 ni 15",
  },
];

export function FormularioDatos({ asientos }: { asientos: number[] }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    enviarCompra,
    {},
  );

  return (
    <form action={accion} noValidate>
      <input type="hidden" name="asientos" value={asientos.join(",")} />

      {estado.error && (
        <div
          role="alert"
          className="mb-7 rounded-sm border border-error/50 bg-error/10 px-4 py-3.5"
        >
          <p className="text-sm font-medium text-ink">{estado.error}</p>
          {estado.ocupadas && (
            <Link
              href={`/comprar?asientos=${asientos.join(",")}`}
              className="mt-2 inline-block text-sm font-semibold text-brass underline decoration-brass/40 underline-offset-4 hover:decoration-brass"
            >
              Volver al plano y elegir otras
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {CAMPOS.map((campo) => {
          const error = estado.errores?.[campo.nombre]?.[0];
          const idAyuda = `${campo.nombre}-ayuda`;

          return (
            <div
              key={campo.nombre}
              className={campo.mitad ? "" : "sm:col-span-2"}
            >
              <label
                htmlFor={campo.nombre}
                className="block text-sm font-medium text-ink"
              >
                {campo.etiqueta}
              </label>

              <input
                id={campo.nombre}
                name={campo.nombre}
                type={campo.tipo}
                inputMode={campo.inputMode}
                autoComplete={campo.autoComplete}
                required
                aria-invalid={!!error}
                aria-describedby={campo.ayuda || error ? idAyuda : undefined}
                /* min-h de 52px y text-base: en iOS un input de menos de 16px
                   hace que el navegador haga zoom solo al enfocarlo. */
                className={`mt-2 min-h-[52px] w-full rounded-sm border bg-surface-sunken px-3.5 py-3 text-base text-ink transition-colors duration-200 placeholder:text-ink-faint ${
                  error
                    ? "border-error"
                    : "border-line-strong hover:border-ink-faint focus:border-brass"
                }`}
              />

              {(error || campo.ayuda) && (
                <p
                  id={idAyuda}
                  className={`mt-2 text-sm ${
                    error ? "font-medium text-error" : "text-ink-faint"
                  }`}
                >
                  {error ?? campo.ayuda}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <label className="mt-7 flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          required
          className="mt-0.5 size-5 shrink-0 accent-brass"
        />
        <span>
          Usamos tus datos solamente para emitir la entrada y controlar el
          ingreso al salón. No los compartimos con nadie.
        </span>
      </label>

      <Boton
        type="submit"
        disabled={enviando}
        cargando={enviando}
        className="mt-8 w-full sm:w-auto"
      >
        {enviando ? "Reservando tus sillas…" : "Reservar y seguir al pago"}
      </Boton>

      <p className="mt-4 text-sm text-ink-faint">
        Todavía no se cobra nada. En el paso siguiente confirmás y pagás.
      </p>
    </form>
  );
}
