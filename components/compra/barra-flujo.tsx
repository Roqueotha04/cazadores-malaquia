import Image from "next/image";
import Link from "next/link";
import logo from "@/public/logo.png";

/**
 * Barra del flujo de compra. A proposito mas pobre que la navbar de la landing:
 * el comprador ya esta comprando, asi que nada compite con la accion de la
 * pantalla. Sin CTA, sin menu de secciones.
 */
export function BarraFlujo() {
  return (
    <header className="sticky top-0 z-[var(--z-nav)] border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Armería Bonifacio Malaquía, ir al inicio"
        >
          <Image
            src={logo}
            alt=""
            width={36}
            height={36}
            className="size-9"
            priority
          />
          <span className="font-display text-sm text-ink sm:text-base">
            Cena de Cazadores 2026
          </span>
        </Link>

        <p className="hidden text-xs text-ink-faint sm:block">
          Compra segura · Armería Bonifacio Malaquía
        </p>
      </div>
    </header>
  );
}
