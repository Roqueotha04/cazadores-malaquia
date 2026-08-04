import Image from "next/image";
import Link from "next/link";
import logo from "@/public/logo.png";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken px-5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Image src={logo} alt="" className="h-10 w-auto" />
            <p className="font-display text-base text-ink">
              Cena de Cazadores y Tiradores
            </p>
          </div>
          <p className="mt-3 text-sm text-ink-faint">
            6ta Edición · 2 de octubre de 2026 · Bonifacio Malaquía
          </p>
        </div>

        <nav aria-label="Enlaces del pie">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link
                href="/comprar"
                className="subrayado-vivo text-ink-soft"
              >
                Comprar entradas
              </Link>
            </li>
            <li>
              <a
                href="#contacto"
                className="subrayado-vivo text-ink-soft"
              >
                Contacto
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
