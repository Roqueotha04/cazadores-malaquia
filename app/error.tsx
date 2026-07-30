"use client";

import { useEffect } from "react";
import { Boton, BotonLink } from "@/components/ui/boton";

/**
 * Red de seguridad para cualquier error no atrapado.
 *
 * Existe porque los datos vienen de otro servicio por HTTP: se puede caer,
 * tardar de más o estar desplegándose justo en este momento. Antes una falla así
 * era rara; ahora es un estado normal del sistema y tiene que verse decente.
 */
export default function ErrorGeneral({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // TODO: cuando haya un servicio de errores, reportarlo acá.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-24">
      <h1>No pudimos cargar esta página</h1>

      <p className="mt-4 text-lg text-ink-soft">
        Puede ser un problema momentáneo nuestro. Probá de nuevo en unos
        segundos: si estabas en medio de una compra, tus sillas siguen
        reservadas.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Boton onClick={() => unstable_retry()} className="w-full sm:w-auto">
          Probar de nuevo
        </Boton>
        <BotonLink href="/" tono="secundario">
          Volver al inicio
        </BotonLink>
      </div>

      {error.digest && (
        <p className="mt-12 border-t border-line pt-5 text-sm text-ink-faint">
          Código del error, por si nos escribís:{" "}
          <span className="text-ink tabular">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
