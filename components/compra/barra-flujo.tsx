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
      {/* `py-2` y no `py-3`: el logo pasa de 36 a 56px —abajo de eso el
          line-art no se lee— y sin recortar el padding la barra crecia 20px
          sobre una pantalla que ya tiene la barra de pasos abajo. */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Cena de Cazadores y Tiradores, ir al inicio"
        >
          <Image src={logo} alt="" className="h-14 w-auto" priority />
          <span className="font-display text-sm text-ink sm:text-base">
            Cena de Cazadores y Tiradores
          </span>
        </Link>

        <p className="hidden text-xs text-ink-faint sm:block">
          Compra segura · Bonifacio Malaquía
        </p>
      </div>
    </header>
  );
}
