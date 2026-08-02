"use client";

import { useActionState, useEffect, useRef } from "react";
import { Boton } from "@/components/ui/boton";
import { campo } from "@/components/ui/clases";
import { enviarContacto, type EstadoContacto } from "@/lib/acciones/contacto";

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
    nombre: "celular",
    etiqueta: "Celular",
    tipo: "tel",
    autoComplete: "tel",
    inputMode: "tel" as const,
    ayuda: "Con característica, sin 0 ni 15",
  },
];

/**
 * Consulta desde la landing.
 *
 * Mismo patron que el formulario de la compra: `useActionState`, errores por
 * campo debajo del input y el boton con su estado de carga. Al salir bien se
 * reemplaza por el acuse en el mismo lugar — no redirige ni abre un alert.
 */
export function FormularioContacto() {
  const [estado, accion, enviando] = useActionState<EstadoContacto, FormData>(
    enviarContacto,
    {},
  );

  const alerta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alerta.current?.focus();
  }, [estado.error]);

  if (estado.ok) {
    return (
      <div
        role="status"
        className="rounded-sm border border-exito/50 bg-exito/10 px-6 py-8"
      >
        <p className="font-display text-2xl text-ink">
          Recibimos tu mensaje.
        </p>
        <p className="mt-3 text-ink-soft">
          Te respondemos por WhatsApp o mail. Si es urgente, escribinos directo
          por WhatsApp: contestamos más rápido.
        </p>
      </div>
    );
  }

  return (
    <form action={accion} noValidate>
      {estado.error && (
        <div
          ref={alerta}
          tabIndex={-1}
          role="alert"
          className="mb-7 rounded-sm border border-error/50 bg-error/10 px-4 py-3.5"
        >
          <p className="text-sm font-medium text-ink">{estado.error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {CAMPOS.map((c) => {
          const error = estado.errores?.[c.nombre]?.[0];
          const idAyuda = `contacto-${c.nombre}-ayuda`;

          return (
            <div key={c.nombre} className={c.mitad ? "" : "sm:col-span-2"}>
              <label
                htmlFor={`contacto-${c.nombre}`}
                className="block text-sm font-medium text-ink"
              >
                {c.etiqueta}
              </label>

              <input
                id={`contacto-${c.nombre}`}
                name={c.nombre}
                type={c.tipo}
                inputMode={c.inputMode}
                autoComplete={c.autoComplete}
                required
                /* React 19 resetea el formulario cuando termina la action,
                   aunque haya devuelto errores: los valores vuelven del estado
                   para que nadie tenga que escribir dos veces. */
                defaultValue={estado.valores?.[c.nombre]}
                aria-invalid={!!error}
                aria-describedby={c.ayuda || error ? idAyuda : undefined}
                className={campo(!!error)}
              />

              {(error || c.ayuda) && (
                <p
                  id={idAyuda}
                  className={`mt-2 text-sm ${
                    error ? "font-medium text-error" : "text-ink-faint"
                  }`}
                >
                  {error ?? c.ayuda}
                </p>
              )}
            </div>
          );
        })}

        <div className="sm:col-span-2">
          <label
            htmlFor="contacto-motivo"
            className="block text-sm font-medium text-ink"
          >
            ¿En qué te damos una mano?
          </label>

          <textarea
            id="contacto-motivo"
            name="motivo"
            rows={4}
            required
            maxLength={600}
            defaultValue={estado.valores?.motivo}
            aria-invalid={!!estado.errores?.motivo?.[0]}
            aria-describedby={
              estado.errores?.motivo?.[0] ? "contacto-motivo-ayuda" : undefined
            }
            className={campo(!!estado.errores?.motivo?.[0], "min-h-[120px]")}
          />

          {estado.errores?.motivo?.[0] && (
            <p
              id="contacto-motivo-ayuda"
              className="mt-2 text-sm font-medium text-error"
            >
              {estado.errores.motivo[0]}
            </p>
          )}
        </div>
      </div>

      <Boton
        type="submit"
        disabled={enviando}
        cargando={enviando}
        className="mt-7 w-full sm:w-auto"
      >
        {enviando ? "Enviando…" : "Enviar consulta"}
      </Boton>
    </form>
  );
}
