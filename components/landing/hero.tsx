import Image from "next/image";
import { BotonLink } from "@/components/ui/boton";
import { fechaEvento, precio } from "@/lib/formato";

/**
 * La foto es la cena del año pasado: el salón lleno es el argumento de venta,
 * asi que ocupa toda la pantalla y el degradado la funde con el fondo del sitio
 * en vez de cortarla con un borde.
 *
 * Composicion centrada, que es lo que se decidio para la direccion "oscuro
 * señorial". Los datos duros van abajo en una ficha, no como titulillo arriba
 * del titulo.
 */
export function Hero({
  fecha,
  precioCentavos,
  disponibles,
}: {
  fecha: Date | null;
  precioCentavos: number;
  disponibles: number;
}) {
  return (
    <section className="relative isolate flex min-h-[88svh] flex-col justify-end overflow-hidden">
      <Image
        src="/hero.webp"
        alt="El salón lleno durante la cena de cazadores del año pasado"
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Dos capas: una general para que el texto lea, y una al pie que funde
          con el fondo del sitio. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-surface/55"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-surface via-surface/90 to-transparent"
      />

      <div className="mx-auto w-full max-w-4xl px-5 pb-14 pt-32 text-center sm:pb-20">
        <h1 className="entra titulo-hero text-ink">
          La cena de cazadores
          <span className="mt-1 block text-brass">2026</span>
        </h1>

        <p className="entra-2 mx-auto mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
          Una vez al año nos juntamos todos en la misma mesa. Elegí tu silla y
          asegurate el lugar.
        </p>

        <div className="entra-3 mt-10 flex flex-col items-center gap-6">
          <BotonLink href="/comprar" className="w-full sm:w-auto">
            Elegir mi silla
          </BotonLink>

          {/* Ficha de datos duros. Los rotulos en mayuscula chica valen aca:
              son etiquetas de dato, no titulillos de seccion. */}
          <dl className="grid w-full max-w-lg grid-cols-3 divide-x divide-line rounded-sm border border-line bg-surface-raised/70 backdrop-blur-sm">
            <Celda rotulo="Cuándo" valor={fechaEvento(fecha).split(",")[0]} />
            <Celda rotulo="Por silla" valor={precio(precioCentavos)} />
            <Celda
              rotulo="Libres"
              valor={`${disponibles}`}
              nota="de 730"
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Celda({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="px-3 py-4">
      <dt className="dato">{rotulo}</dt>
      <dd className="mt-1.5 font-display text-base text-ink tabular sm:text-lg">
        {valor}
        {nota && (
          <span className="ml-1 text-xs font-normal text-ink-faint">
            {nota}
          </span>
        )}
      </dd>
    </div>
  );
}
