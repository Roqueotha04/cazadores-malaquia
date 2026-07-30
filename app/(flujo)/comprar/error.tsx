"use client";

import { useEffect } from "react";
import { Boton, BotonLink } from "@/components/ui/boton";

/**
 * El plano es la pantalla que más depende del backend: si no hay datos, no hay
 * nada que dibujar. Tiene su propio boundary para que el mensaje hable de sillas
 * y no de "algo se rompió".
 */
export default function ErrorComprar({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-24">
      <h1>No pudimos cargar el plano del salón</h1>

      <p className="mt-4 text-lg text-ink-soft">
        No llegamos a leer qué sillas están libres, así que preferimos no
        mostrarte un plano que puede estar equivocado. Probá de nuevo.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Boton onClick={() => unstable_retry()} className="w-full sm:w-auto">
          Cargar el plano otra vez
        </Boton>
        <BotonLink href="/" tono="secundario">
          Volver al inicio
        </BotonLink>
      </div>
    </div>
  );
}
