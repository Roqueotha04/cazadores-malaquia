import Image from "next/image";
import { BotonLink } from "@/components/ui/boton";
import { fechaEvento, precio } from "@/lib/formato";
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

export function SeccionEntradas({
  evento,
  disponibles,
}: {
  evento: Evento;
  disponibles: number;
}) {
  const vendidas = TOTAL - disponibles;
  const porcentaje = Math.round((vendidas / TOTAL) * 100);
  const quedanPocas = disponibles > 0 && disponibles <= 60;
  const agotado = disponibles === 0;

  return (
    <section id="entradas" className="px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="titulo-seccion">
            Una silla, con tu nombre, en una mesa concreta
          </h2>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            No vendemos entradas numeradas al azar: elegís el lugar exacto donde
            te querés sentar, y con quién.
          </p>
        </div>

        <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-20">
          {/* Los tres pasos SI son una secuencia real, y por eso van numerados. */}
          <ol className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
            {COMO_FUNCIONA.map((paso, i) => (
              <li key={paso.titulo} className="bg-surface-raised p-6">
                <span className="font-display text-3xl text-brass tabular">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-ink">{paso.titulo}</h3>
                <p className="mt-2 text-sm text-ink-soft">{paso.texto}</p>
              </li>
            ))}
          </ol>

          <div className="lg:w-80">
            <Disponibilidad
              disponibles={disponibles}
              vendidas={vendidas}
              porcentaje={porcentaje}
              quedanPocas={quedanPocas}
              agotado={agotado}
            />

            <dl className="mt-6 divide-y divide-line border-y border-line">
              <Fila rotulo="Cuándo" valor={fechaEvento(evento.fecha)} />
              <Fila rotulo="Dónde" valor={evento.lugar ?? "A confirmar"} />
              <Fila
                rotulo="Precio por silla"
                valor={precio(evento.precioCentavos)}
              />
              <Fila
                rotulo="Máximo por compra"
                valor={`${evento.maxAsientosPorCompra} sillas`}
              />
            </dl>

            <div className="mt-8">
              {agotado ? (
                <p className="rounded-sm border border-line bg-surface-raised px-5 py-4 text-sm text-ink-soft">
                  Se agotaron las 730 sillas. Escribinos por WhatsApp y te
                  avisamos si se libera alguna.
                </p>
              ) : evento.ventasAbiertas ? (
                <BotonLink href="/comprar" className="w-full">
                  Elegir mi silla
                </BotonLink>
              ) : (
                <p className="rounded-sm border border-line bg-surface-raised px-5 py-4 text-sm text-ink-soft">
                  La venta todavía no está abierta. Te avisamos por Instagram
                  cuando arranque.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-20 aspect-[21/9] overflow-hidden rounded-sm">
          <Image
            src="/extra.webp"
            alt="Las mesas largas del salón, preparadas antes de que llegue la gente"
            fill
            sizes="(min-width: 1280px) 1152px, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/** Escasez con el dato real, sin urgencia inventada. */
function Disponibilidad({
  disponibles,
  vendidas,
  porcentaje,
  quedanPocas,
  agotado,
}: {
  disponibles: number;
  vendidas: number;
  porcentaje: number;
  quedanPocas: boolean;
  agotado: boolean;
}) {
  return (
    <div className="rounded-sm border border-line bg-surface-raised p-5">
      <p className="dato">Sillas libres</p>

      <p className="mt-2 font-display text-4xl text-ink tabular">
        {disponibles}
        <span className="ml-2 text-base text-ink-faint">de {TOTAL}</span>
      </p>

      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
        role="img"
        aria-label={`${vendidas} de ${TOTAL} sillas vendidas`}
      >
        <div
          className={`h-full rounded-full ${agotado || quedanPocas ? "bg-alerta" : "bg-brass"}`}
          style={{ width: `${Math.max(porcentaje, 1)}%` }}
        />
      </div>

      {quedanPocas && (
        <p className="mt-3 text-sm font-medium text-alerta">
          Quedan pocas. Conviene no dejarlo para la semana del evento.
        </p>
      )}
    </div>
  );
}

function Fila({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="dato">{rotulo}</dt>
      <dd className="text-right text-sm font-medium text-ink tabular">
        {valor}
      </dd>
    </div>
  );
}
