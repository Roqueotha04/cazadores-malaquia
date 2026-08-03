"use client";

import { useEffect } from "react";
import { Boton, BotonLink } from "@/components/ui/boton";

/**
 * Red de seguridad del panel.
 *
 * Es propia y no la general del sitio porque el publico es otro: acá el error se
 * lee mientras hay alguien esperando del otro lado del mostrador, y lo que hace
 * falta es saber si conviene reintentar o llamar a quien mantiene esto. El
 * digest se muestra grande por eso.
 *
 * El 401 no llega hasta acá: `lib/admin/api.ts` lo convierte en un viaje al
 * login antes de que sea un error.
 */
export default function ErrorPanel({
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
    <div className="rounded-sm border border-error/40 bg-error/10 p-6">
      <h1 className="text-xl">No pudimos cargar esta pantalla</h1>

      <p className="mt-3 max-w-[65ch] text-ink-soft">
        Puede ser que el servidor esté tardando de más o que se haya caído. Los
        datos no se tocaron: si estabas cargando algo, no quedó a medias.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Boton onClick={() => unstable_retry()}>Probar de nuevo</Boton>
        <BotonLink href="/admin" tono="secundario">
          Ir al tablero
        </BotonLink>
      </div>

      {error.digest && (
        <p className="mt-6 border-t border-error/30 pt-4 text-sm text-ink-faint">
          Código del error: <span className="text-ink tabular">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
