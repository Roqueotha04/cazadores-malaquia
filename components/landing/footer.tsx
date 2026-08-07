import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
// Imports estaticos, no rutas "/loguito.webp": Next le pone hash del contenido
// al nombre del archivo, asi que cuando un logo cambia la URL cambia con el.
import logo from "@/public/logo.png";
import malaquia from "@/public/patrocinador-malaquia.webp";
import egHunting from "@/public/patrocinador-eg-hunting.webp";
import mew3 from "@/public/logo-mew3.webp";
import estudioVe from "@/public/logo-estudio-ve.webp";

// El alto va por logo y no compartido: dos circulos y una V apaisada a la misma
// altura se leen de tamaños distintos. Al circulo se le da un poco menos.
const PATROCINADORES = [
  { src: malaquia, nombre: "Armería Bonifacio Malaquía", alto: "h-12" },
  { src: egHunting, nombre: "EG Hunting Service", alto: "h-12" },
];

const AUTORES = [
  { src: estudioVe, nombre: "Estudio Ve", alto: "h-9" },
  { src: mew3, nombre: "MEW3", alto: "h-8" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken px-5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div>
          {/* Alto y no `size-*`: el emblema es apaisado y en caja cuadrada se
              achata. 56px es el minimo al que su line-art se lee. */}
          <Image src={logo} alt="" className="h-14 w-auto" />

          <p className="mt-4 font-display text-base text-ink">
            Cena de Cazadores y Tiradores
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            6ta Edición · 2 de octubre de 2026 · Bonifacio Malaquía
          </p>
        </div>

        <div className="flex flex-wrap gap-x-12 gap-y-8">
          <nav aria-label="Navegación">
            <p className="dato">Navegación</p>
            <ul className="mt-4 flex flex-col items-start gap-2 text-sm">
              <li>
                <Link href="/" className="subrayado-vivo text-ink-soft">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/comprar" className="subrayado-vivo text-ink-soft">
                  Comprar entradas
                </Link>
              </li>
              <li>
                <a href="#contacto" className="subrayado-vivo text-ink-soft">
                  Contacto
                </a>
              </li>
            </ul>
          </nav>

          <Columna rotulo="Patrocinadores" logos={PATROCINADORES} />
          <Columna rotulo="Diseño" logos={AUTORES} />
        </div>
      </div>
    </footer>
  );
}

function Columna({
  rotulo,
  logos,
}: {
  rotulo: string;
  logos: { src: StaticImageData; nombre: string; alto: string }[];
}) {
  return (
    <section aria-label={rotulo}>
      <p className="dato">{rotulo}</p>
      <ul className="mt-4 flex flex-wrap items-center gap-6">
        {logos.map((l) => (
          <li key={l.nombre}>
            <Image
              src={l.src}
              alt={l.nombre}
              sizes="120px"
              className={`${l.alto} w-auto`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
