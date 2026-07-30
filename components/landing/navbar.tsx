import Image from "next/image";
import Link from "next/link";
import { BotonLink } from "@/components/ui/boton";
// Import estatico, no la ruta "/logo.png": Next le pone hash del contenido al
// nombre del archivo, asi que cuando el logo cambia la URL cambia con el y
// ningun navegador puede quedarse con la version vieja en cache.
import logo from "@/public/logo.png";

const SECCIONES = [
  { href: "#entradas", texto: "Entradas" },
  { href: "#nosotros", texto: "Nosotros" },
  { href: "#contacto", texto: "Contacto" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-[var(--z-nav)] border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Armería Bonifacio Malaquía, ir al inicio"
        >
          <Image
            src={logo}
            alt=""
            width={44}
            height={44}
            className="size-11"
            priority
          />
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-base text-ink">
              Bonifacio Malaquía
            </span>
            <span className="block text-xs text-ink-faint">Armería</span>
          </span>
        </Link>

        {/* Navegacion real: la landing tenia secciones sin forma de llegar. */}
        <nav aria-label="Secciones" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-7">
            {SECCIONES.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  className="text-sm text-ink-soft transition-colors duration-200 hover:text-brass"
                >
                  {s.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <BotonLink href="/comprar" medida="chico" className="ml-auto md:ml-7">
          Comprar entradas
        </BotonLink>
      </div>
    </header>
  );
}
