import Image from "next/image";
// Imports estaticos, no las rutas "/foto.webp": Next le pone hash del contenido
// al nombre del archivo, asi que cuando la foto se reemplaza la URL cambia con
// ella y ningun navegador se queda con la version vieja en cache.
import sobreNosotros from "@/public/sobre-nosotros.webp";
import extra from "@/public/extra.webp";

/**
 * Composicion asimetrica de dos fotos: la de la cena grande, el salon preparado
 * mas chico y corrido. Rompe la grilla a proposito — dos imagenes del mismo
 * tamaño lado a lado se leen como plantilla.
 *
 * La foto del equipo vive en el banner de la seccion de entradas: es apaisada y
 * ahi entra sin recortar cabezas.
 */
export function SobreNosotros() {
  return (
    <section
      id="nosotros"
      className="veteada border-y border-line bg-surface-sunken px-5 py-24 sm:py-32"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="relative">
          <div className="group relative aspect-[4/5] overflow-hidden rounded-sm sm:aspect-[4/3] lg:aspect-[4/5]">
            <Image
              src={sobreNosotros}
              alt="Sobre el escenario, durante la cena del año pasado"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 ease-[var(--ease-salida)] group-hover:scale-[1.03]"
            />
          </div>

          {/* La segunda foto se monta sobre la primera. Solo en pantallas donde
              hay lugar de verdad. */}
          <div className="group absolute -bottom-8 -right-4 hidden aspect-square w-44 overflow-hidden rounded-sm border-4 border-surface-sunken sm:block lg:-right-8 lg:w-52">
            <Image
              src={extra}
              alt="Las mesas largas del salón, preparadas antes de que llegue la gente"
              fill
              sizes="208px"
              className="object-cover transition-transform duration-500 ease-[var(--ease-salida)] group-hover:scale-[1.03]"
            />
          </div>
        </div>

        <div className="mt-8 lg:mt-0">
          <h2 className="titulo-seccion">El encuentro del año</h2>

          <div className="mt-6 space-y-5 text-lg text-ink-soft">
            <p>
              La Cena de Cazadores es la noche en que se juntan las familias,
              los amigos y la gente que comparte la actividad durante todo el
              año. Catorce mesas largas, 730 sillas y un salón que se llena.
            </p>
            <p>
              La organiza una asociación sin fines de lucro. No hay una empresa
              detrás: la cena se arma entre quienes vienen, edición tras
              edición.
            </p>
          </div>

          <p className="mt-8 border-l-0 border-t border-line pt-6 font-display text-xl text-ink">
            «Una vez al año, todos en la misma mesa.»
          </p>
        </div>
      </div>
    </section>
  );
}
