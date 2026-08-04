"use client";

import { memo } from "react";
import type { EstadoAsiento } from "@/lib/tipos";

type Props = {
  id: number;
  mesa: number;
  silla: number;
  estado: EstadoAsiento;
  elegida: boolean;
  /** true cuando ya se llegó al tope de sillas y esta no está elegida */
  bloqueada: boolean;
  /** El plano de escritorio usa chips chicos sin número; el celular, botones grandes. */
  tamano: "chico" | "grande";
  /** Si entra en el recorrido del tabulador. Ver el comentario en mesa.tsx. */
  tabuladle?: boolean;
  onElegir: (id: number) => void;
};

/**
 * Una silla del plano.
 *
 * Los tres estados se distinguen por luminosidad, no por tono: ocupada oscura,
 * libre media, elegida la mas clara y la unica con el laton. Encima la ocupada
 * lleva `rayada`. Son tres canales (luz, tono, textura) para que funcione con
 * daltonismo rojo-verde.
 *
 * Todas llevan borde: es el borde el que cumple el 3:1 de contraste no-textual
 * contra el fondo del plano, lo que deja libertad para que los rellenos se
 * diferencien entre si.
 */
function SillaBase({
  id,
  mesa,
  silla,
  estado,
  elegida,
  bloqueada,
  tamano,
  tabuladle = true,
  onElegir,
}: Props) {
  const tomada = estado !== "DISPONIBLE";
  const grande = tamano === "grande";

  const etiqueta = `Mesa ${mesa}, silla ${silla}, ${
    tomada ? "ocupada" : elegida ? "elegida" : "libre"
  }`;

  // El `title` suma lo que el estado no dice: que tocarla de nuevo la saca. El
  // `aria-label` se queda seco —el lector de pantalla ya canta `aria-pressed`—
  // para no leer una instruccion en cada una de las 730.
  const ayuda = elegida ? `${etiqueta} — tocá para sacarla` : etiqueta;

  return (
    <button
      type="button"
      onClick={() => onElegir(id)}
      disabled={tomada || bloqueada}
      tabIndex={tabuladle ? 0 : -1}
      aria-pressed={elegida}
      aria-label={etiqueta}
      title={ayuda}
      className={[
        "relative rounded-[2px] border font-medium tabular",
        "transition-[transform,background-color,border-color,box-shadow] duration-150 ease-[var(--ease-salida)]",
        grande
          ? "flex size-11 items-center justify-center text-sm"
          : "h-3.5 w-5",
        tomada
          ? "rayada cursor-not-allowed border-line bg-silla-tomada text-ink/60"
          : elegida
            ? // La elegida tambien reacciona al mouse: sin esto la silla propia
              // es la unica del plano que no contesta, y no hay señal de que
              // tocandola se saca.
              "border-brass-light bg-silla-elegida text-carbon shadow-[0_0_0_1px_var(--color-carbon)_inset] hover:z-[var(--z-plano)] hover:scale-110 hover:bg-brass-light hover:ring-2 hover:ring-brass-light/60"
            : bloqueada
              ? "cursor-not-allowed border-line bg-silla-libre/30 text-ink/40"
              : // La escala se queda: en un chip de 20×14 ayuda a apuntar. El
                // anillo es el que hace que se vea cual esta bajo el mouse
                // cuando hay 730 juntas.
                "border-line-strong bg-silla-libre text-carbon hover:z-[var(--z-plano)] hover:scale-125 hover:border-brass hover:bg-brass hover:ring-2 hover:ring-brass-light/50",
      ].join(" ")}
    >
      {grande ? (elegida ? "✓" : silla) : null}
    </button>
  );
}

export const Silla = memo(SillaBase);
