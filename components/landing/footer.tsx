import Image from "next/image";
import Link from "next/link";
import logo from "@/public/logo.png";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken px-5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src={logo}
              alt=""
              width={40}
              height={40}
              className="size-10"
            />
            <p className="font-display text-base text-ink">
              Armería Bonifacio Malaquía
            </p>
          </div>
          <p className="mt-3 text-sm text-ink-faint">
            Cena de Cazadores 2026 · 2 de octubre
          </p>
        </div>

        <nav aria-label="Enlaces del pie">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link
                href="/comprar"
                className="text-ink-soft transition-colors duration-200 hover:text-brass"
              >
                Comprar entradas
              </Link>
            </li>
            <li>
              <a
                href="#contacto"
                className="text-ink-soft transition-colors duration-200 hover:text-brass"
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
