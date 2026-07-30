import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * El unico boton del sitio.
 *
 * Antes cada pantalla escribia sus clases a mano y no habia dos iguales: el
 * "Elegir mi silla" de la landing y el de la seccion de entradas tenian colores
 * distintos. Un solo vocabulario, tres tonos, y todos los estados que un boton
 * tiene que tener — incluido `cargando`, que en un flujo de pago no es opcional.
 *
 * Radio chico a proposito: el borde casi recto se lee institucional, de placa
 * grabada, y es lo que aleja esto del boton redondeado de SaaS.
 */

type Tono = "principal" | "secundario" | "fantasma";
type Medida = "base" | "chico";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-semibold " +
  "transition-[background-color,border-color,color,transform] duration-200 " +
  "ease-[var(--ease-salida)] active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:opacity-45";

const tonos: Record<Tono, string> = {
  // El laton es el unico acento del sistema: solo la accion principal lo usa.
  principal: "bg-brass text-carbon hover:bg-brass-light",
  secundario:
    "border border-line-strong text-ink hover:border-brass hover:bg-surface-raised",
  fantasma: "text-ink-soft hover:text-ink hover:bg-surface-raised",
};

// 52px y 44px: el minimo de PRODUCT.md es 44, y este publico compra del celular.
const medidas: Record<Medida, string> = {
  base: "min-h-[52px] px-7 py-4 text-base",
  chico: "min-h-[44px] px-5 py-2.5 text-sm",
};

function clases(tono: Tono, medida: Medida, extra?: string) {
  return [base, tonos[tono], medidas[medida], extra].filter(Boolean).join(" ");
}

type Comunes = { tono?: Tono; medida?: Medida; children: ReactNode };

export function Boton({
  tono = "principal",
  medida = "base",
  cargando = false,
  className,
  children,
  ...resto
}: Comunes & { cargando?: boolean } & ComponentProps<"button">) {
  return (
    <button
      {...resto}
      aria-busy={cargando || undefined}
      className={clases(tono, medida, className)}
    >
      {cargando && <Girando />}
      {children}
    </button>
  );
}

export function BotonLink({
  tono = "principal",
  medida = "base",
  className,
  children,
  ...resto
}: Comunes & ComponentProps<typeof Link>) {
  return (
    <Link {...resto} className={clases(tono, medida, className)}>
      {children}
    </Link>
  );
}

/** Indicador de trabajo en curso. `motion-reduce` lo deja quieto. */
function Girando() {
  return (
    <span
      aria-hidden
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}
