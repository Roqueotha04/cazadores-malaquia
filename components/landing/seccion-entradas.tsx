import Image from "next/image";
import { BotonLink } from "@/components/ui/boton";
import type { Evento } from "@/lib/tipos";

const TOTAL = 730;

const COMO_FUNCIONA = [
  {
    titulo: "Elegís tu silla en el plano",
    texto:
      "Ves las 14 mesas y qué sillas están libres. Tocás las que querés, hasta 10 por compra.",
  },
  {
    titulo: "Te las guardamos 30 minutos",
    texto:
      "Mientras cargás tus datos nadie te las puede sacar. Si se te vence el tiempo, volvés a elegir.",
  },
  {
    titulo: "Pagás y te llega tu entrada",
    texto:
      "Una entrada por silla, con tu mesa y tu lugar exacto. Guardás el link y la tenés siempre a mano.",
  },
];

/**
 * Una sola columna centrada.
 *
 * Antes esto era una grilla de dos columnas con una ficha de disponibilidad y
 * una lista de datos al costado. Los datos (cuando, donde, precio) ya estan en
 * el hero: repetirlos a media pantalla de distancia no informaba, desbalanceaba
 * la grilla.
 */
export function SeccionEntradas({
  evento,
  disponibles,
}: {
  evento: Evento;
  disponibles: number;
}) {
  const agotado = disponibles === 0;

  return (
    <section id="entradas" className="px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="titulo-seccion">
            Una silla, con tu nombre, en una mesa concreta
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
            No vendemos entradas numeradas al azar: elegís el lugar exacto donde
            te querés sentar, y con quién.
          </p>
        </div>

        {/* Los tres pasos SI son una secuencia real, y por eso van numerados.
            Los divisores de 1px salen del gap, no de bordes. */}
        <ol className="mt-14 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
          {COMO_FUNCIONA.map((paso, i) => (
            <li
              key={paso.titulo}
              /* Sin translateY: en una grilla gap-px, mover la card deja ver la
                 linea del fondo. */
              className="group bg-surface-raised p-6 text-center transition-colors duration-200 ease-[var(--ease-salida)] hover:bg-surface-high"
            >
              <span className="font-display text-3xl text-brass transition-colors duration-200 ease-[var(--ease-salida)] tabular group-hover:text-brass-light">
                {i + 1}
              </span>
              <h3 className="mt-3 text-ink">{paso.titulo}</h3>
              <p className="mt-2 text-sm text-ink-soft">{paso.texto}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col items-center">
          {agotado ? (
            <p className="max-w-md rounded-sm border border-line bg-surface-raised px-5 py-4 text-center text-sm text-ink-soft">
              Se agotaron las {TOTAL} sillas. Escribinos por WhatsApp y te
              avisamos si se libera alguna.
            </p>
          ) : evento.ventasAbiertas ? (
            <>
              <BotonLink href="/comprar" className="w-full sm:w-auto">
                Elegir mi silla
              </BotonLink>
              <p className="mt-4 text-sm text-ink-faint">
                No se cobra nada hasta el último paso.
              </p>
            </>
          ) : (
            <p className="max-w-md rounded-sm border border-line bg-surface-raised px-5 py-4 text-center text-sm text-ink-soft">
              La venta todavía no está abierta. Te avisamos por Instagram cuando
              arranque.
            </p>
          )}
        </div>

        <div className="group relative mt-20 aspect-[16/9] overflow-hidden rounded-sm lg:aspect-[2/1]">
          <Image
            src="/equipo.webp"
            alt="El equipo que organiza la cena, en el salón"
            fill
            sizes="(min-width: 1280px) 1152px, 100vw"
            className="object-cover object-center transition-transform duration-500 ease-[var(--ease-salida)] group-hover:scale-[1.03]"
          />
        </div>
      </div>
    </section>
  );
}
