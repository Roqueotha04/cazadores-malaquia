"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reloj } from "@/lib/formato";

/**
 * Cuenta atrás hasta que vence la reserva.
 *
 * Al llegar a cero no adivina nada: le pide el estado real al servidor, porque
 * la compra puede haberse confirmado en el medio.
 *
 * Los ultimos 5 minutos cambian el color a alerta y los ultimos 2 a error, para
 * que el apuro se vea antes de que sea tarde.
 */
export function Contador({ expiraEn }: { expiraEn: string }) {
  const router = useRouter();
  const [restante, setRestante] = useState(() => faltan(expiraEn));

  useEffect(() => {
    const id = setInterval(() => {
      const segundos = faltan(expiraEn);
      setRestante(segundos);
      if (segundos <= 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [expiraEn, router]);

  const critico = restante <= 120;
  const apurado = restante <= 300;

  const color = critico
    ? "text-error"
    : apurado
      ? "text-alerta"
      : "text-ink";

  return (
    <div className="flex items-baseline gap-3">
      <p
        className={`font-display text-4xl leading-none tabular ${color}`}
        /* Sin aria-live: un contador que se anuncia cada segundo hace inusable
           un lector de pantalla. El texto de al lado da el contexto. */
        aria-live="off"
      >
        {reloj(restante)}
      </p>
      <p className={`text-sm ${critico ? "font-medium text-error" : "text-ink-soft"}`}>
        {critico
          ? "¡se está por vencer!"
          : apurado
            ? "queda poco tiempo"
            : "para completar la compra"}
      </p>
    </div>
  );
}

function faltan(expiraEn: string) {
  return Math.round((new Date(expiraEn).getTime() - Date.now()) / 1000);
}
