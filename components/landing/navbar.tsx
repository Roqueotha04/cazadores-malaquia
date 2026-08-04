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
          aria-label="Cena de Cazadores y Tiradores, ir al inicio"
        >
          {/* Alto fijo y ancho automatico: el logo no es cuadrado (2312x2087),
              asi que un size-* lo achataria. */}
          <Image src={logo} alt="" className="h-11 w-auto" priority />
          <span className="hidden leading-tight sm:block">
            <span className="block whitespace-nowrap font-display text-sm text-ink lg:text-base">
              Cena de Cazadores y Tiradores
            </span>
            <span className="block text-xs text-ink-faint">Bonifacio</span>
          </span>
        </Link>

        {/* Navegacion real: la landing tenia secciones sin forma de llegar. */}
        <nav aria-label="Secciones" className="ml-auto hidden md:block">
          {/* gap-6 y no gap-7: el nombre nuevo es mas largo que "Bonifacio
              Malaquia" y en md la fila queda al limite. */}
          <ul className="flex items-center gap-6">
            {SECCIONES.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  className="subrayado-vivo text-sm text-ink-soft"
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
