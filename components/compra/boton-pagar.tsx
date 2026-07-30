"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { crearPreferencia } from "@/lib/acciones/pago";
import { cancelarReserva } from "@/lib/acciones/compra";

/**
 * Manda al comprador a pagar.
 *
 * El backend decide el destino: el checkout de Mercado Pago cuando esté
 * conectado. Este botón no aprueba nada, sólo lleva.
 */
export function BotonPagar({ token }: { token: string }) {
  const [procesando, empezar] = useTransition();
  const [error, setError] = useState("");

  function pagar() {
    empezar(async () => {
      const resultado = await crearPreferencia(token);

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      // El destino es de otro dominio, asi que no va por el router de Next.
      // Sin replace: que el "atras" del navegador vuelva a la reserva.
      window.location.href = resultado.datos.url;
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Boton
          onClick={pagar}
          disabled={procesando}
          cargando={procesando}
          className="w-full sm:w-auto"
        >
          {procesando ? "Abriendo el pago…" : "Pagar y confirmar"}
        </Boton>

        <Boton
          tono="fantasma"
          onClick={() => empezar(() => cancelarReserva(token))}
          disabled={procesando}
        >
          Cancelar y elegir otras
        </Boton>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-sm border border-error/50 bg-error/10 px-4 py-3 text-sm font-medium text-ink"
        >
          {error}
        </p>
      )}

      <p className="mt-4 text-sm text-ink-faint">
        Te vamos a llevar a Mercado Pago para completar el pago. Tus sillas
        quedan guardadas mientras tanto.
      </p>
    </div>
  );
}
