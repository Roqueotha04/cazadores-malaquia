import Link from "next/link";
import { notFound } from "next/navigation";
import { TarjetaEntrada } from "@/components/compra/tarjeta-entrada";
import { BotonLink } from "@/components/ui/boton";
import {
  obtenerEntradasPorToken,
  obtenerEvento,
  obtenerReservaPorToken,
} from "@/lib/consultas";
import { fechaEvento, precio } from "@/lib/formato";

export default async function Entradas(props: PageProps<"/entradas/[token]">) {
  const { token } = await props.params;

  const [reserva, entradas, evento] = await Promise.all([
    obtenerReservaPorToken(token),
    obtenerEntradasPorToken(token),
    obtenerEvento(),
  ]);

  if (!reserva) notFound();

  if (reserva.estado !== "PAGADA") {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-16">
        <h1>Esta compra no está pagada</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Todavía no emitimos las entradas. Si acabás de pagar, puede tardar unos
          segundos en confirmarse.
        </p>
        <BotonLink href={`/reserva/${token}`} className="mt-8 w-full sm:w-auto">
          Ir a mi reserva
        </BotonLink>
      </div>
    );
  }

  const primerNombre = reserva.titular.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <header>
        <p className="dato text-exito">Compra confirmada</p>
        <h1 className="mt-3">Listo, {primerNombre}. Tenés tu lugar.</h1>
        <p className="mt-4 text-lg text-ink-soft">
          {fechaEvento(evento.fecha)}
          {evento.lugar && evento.lugar !== "A confirmar"
            ? ` · ${evento.lugar}`
            : ""}
          .
        </p>
      </header>

      <div className="mt-8 rounded-sm border border-line bg-surface-raised px-5 py-4">
        <p className="text-sm text-ink-soft">
          <strong className="font-semibold text-ink">
            Guardá este link.
          </strong>{" "}
          Es donde vas a tener tus entradas siempre a mano. También te las
          mandamos a {reserva.email}.
        </p>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {entradas.map((entrada) => (
          <TarjetaEntrada
            key={entrada.codigo}
            entrada={entrada}
            titular={reserva.titular}
          />
        ))}
      </ul>

      <div className="mt-10 flex items-baseline justify-between gap-4 border-t border-line pt-5">
        <span className="dato">Total pagado</span>
        <span className="font-display text-2xl text-ink tabular">
          {precio(reserva.montoCentavos)}
        </span>
      </div>

      <Link
        href="/"
        className="mt-10 inline-flex min-h-[44px] items-center text-sm text-ink-faint transition-colors duration-200 hover:text-brass"
      >
        <span aria-hidden className="mr-1.5">
          ←
        </span>
        Volver al inicio
      </Link>
    </div>
  );
}
