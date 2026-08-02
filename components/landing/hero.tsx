import Image from "next/image";
import { BotonLink } from "@/components/ui/boton";
import { fechaEvento, precio } from "@/lib/formato";

/**
 * La foto es la cena del año pasado: el salón lleno es el argumento de venta,
 * asi que ocupa toda la pantalla y el degradado la funde con el fondo del sitio
 * en vez de cortarla con un borde.
 *
 * Composicion centrada, que es lo que se decidio para la direccion "oscuro
 * señorial". Los datos duros van sueltos abajo del parrafo: cuando, donde y
 * cuanto. Antes vivian dentro de una ficha con borde y fondo, y ahi la ficha
 * competia con la foto — el dato no necesitaba marco.
 */
export function Hero({
  fecha,
  lugar,
  precioCentavos,
}: {
  fecha: Date | null;
  lugar: string | null;
  precioCentavos: number;
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

        <p className="entra-2 mx-auto mt-6 max-w-xl text-lg text-ink-soft">
          Una vez al año nos juntamos todos en la misma mesa. Elegí tu silla y
          asegurate el lugar.
        </p>

        <div className="entra-3 mt-10 flex flex-col items-center gap-10">
          {/* Los rotulos en mayuscula chica valen aca: son etiquetas de dato,
              no titulillos de seccion. En celular apilan — a 320px una fila de
              tres deja 95px por celda para una fecha formateada. */}
          <dl className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
            <Celda rotulo="Cuándo" valor={fechaEvento(fecha).split(",")[0]} />
            <Celda rotulo="Dónde" valor={lugar ?? "A confirmar"} />
            <Celda rotulo="Por silla" valor={precio(precioCentavos)} />
          </dl>

          <BotonLink href="/comprar" className="w-full sm:w-auto">
            Elegir mi silla
          </BotonLink>
        </div>
      </div>
    </section>
  );
}

function Celda({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="group">
      <dt className="dato">{rotulo}</dt>
      <dd className="mt-1.5 font-display text-base text-ink transition-colors duration-200 ease-[var(--ease-salida)] tabular group-hover:text-brass-light sm:text-lg">
        {valor}
      </dd>
    </div>
  );
}
