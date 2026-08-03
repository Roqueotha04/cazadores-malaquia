"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";

/**
 * Vuelve a pedir los datos de la pantalla, y dice hace cuanto se pidieron.
 *
 * El backend no avisa nada: no hay websockets ni SSE, asi que el resumen, el
 * mapa y la cola de casos envejecen apenas se pintan. Una pantalla que no dice
 * de cuando es su dato invita a decidir sobre algo de hace media hora.
 *
 * De ahi que la antiguedad se muestre siempre y no solo cuando ya pasó mucho:
 * "hace 4 s" es tan informativo como "hace 12 min", porque contesta la pregunta
 * antes de que uno tenga que hacersela.
 */
export function Refresco({ cada = 60 }: { cada?: number }) {
  const router = useRouter();
  const [pidiendo, empezar] = useTransition();

  /**
   * Los dos relojes arrancan juntos, en el mismo instante.
   *
   * Eso es lo que hace que el servidor y el navegador escriban lo mismo —
   * "hace 0 s" en los dos— y la hidratacion no se queje, sin necesidad de una
   * bandera de "ya monte" ni de dejar el rotulo vacio al principio.
   */
  const [ultimo, setUltimo] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());

  // El reloj de la etiqueta. Cada 10 s alcanza: nadie mira pasar los segundos.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (cada <= 0) return;

    const id = setInterval(() => {
      // `startTransition` deja la pantalla vieja puesta mientras llega la nueva:
      // sin esto el tablero parpadearia solo cada minuto.
      empezar(() => {
        router.refresh();
        setUltimo(Date.now());
      });
    }, cada * 1000);

    return () => clearInterval(id);
  }, [cada, router]);

  function refrescarAhora() {
    empezar(() => {
      router.refresh();
      setUltimo(Date.now());
    });
  }

  return (
    <div className="flex items-center gap-3">
      <p aria-live="polite" className="text-xs text-ink-faint tabular">
        {pidiendo ? "Actualizando…" : antiguedad(ultimo, ahora)}
      </p>
      <Boton
        tono="secundario"
        medida="chico"
        onClick={refrescarAhora}
        cargando={pidiendo}
        disabled={pidiendo}
      >
        Actualizar
      </Boton>
    </div>
  );
}

function antiguedad(ultimo: number, ahora: number) {
  const segundos = Math.max(0, Math.round((ahora - ultimo) / 1000));

  if (segundos < 60) return `Actualizado hace ${segundos} s`;

  const minutos = Math.round(segundos / 60);

  return `Actualizado hace ${minutos} min`;
}
