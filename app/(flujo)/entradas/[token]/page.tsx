import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/compra/boton-imprimir";
import { TarjetaEntrada } from "@/components/compra/tarjeta-entrada";
import { BotonLink } from "@/components/ui/boton";
import {
  obtenerEntradasPorToken,
  obtenerEvento,
  obtenerOrdenPorToken,
} from "@/lib/consultas";
import { fechaEvento, precio } from "@/lib/formato";

export default async function Entradas(props: PageProps<"/entradas/[token]">) {
  const { token } = await props.params;

  const [orden, entradas, evento] = await Promise.all([
    obtenerOrdenPorToken(token),
    obtenerEntradasPorToken(token),
    obtenerEvento(),
  ]);

  if (!orden) notFound();

  if (orden.estado !== "PAGADA") {
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

  const primerNombre = orden.usuario.nombre;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      {/* La confirmación es la pantalla que la persona esperaba desde que puso
          el DNI: acá el estado se anuncia, no se rotula al margen. */}
      <header className="rounded-sm border border-exito/40 bg-exito/10 px-6 py-10 text-center">
        <span
          aria-hidden
          className="mx-auto grid size-14 place-items-center rounded-full bg-exito/20 text-3xl text-exito"
        >
          ✓
        </span>
        <h1 className="titulo-seccion mt-5 text-ink">Pago confirmado</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Listo, {primerNombre}. Tenés tu lugar.
        </p>
        <p className="mt-1 text-ink-soft">
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
          mandamos a {orden.usuario.email}.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        {/* Va como <p>: el estilo `dato` no pisa la familia display de los
            titulos, y en Young Serif a 12px en versalita se lee mal. */}
        <p className="dato">
          {entradas.length === 1 ? "Tu entrada" : `Tus ${entradas.length} entradas`}
        </p>
        <BotonImprimir />
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {entradas.map((entrada) => (
          <TarjetaEntrada key={entrada.codigo} entrada={entrada} />
        ))}
      </ul>

      <div className="mt-10 flex items-baseline justify-between gap-4 border-t border-line pt-5">
        <span className="dato">Total pagado</span>
        <span className="font-display text-2xl text-ink tabular">
          {precio(orden.totalCentavos)}
        </span>
      </div>

      <Link
        href="/"
        className="no-imprimir group mt-10 inline-flex min-h-[44px] items-center text-sm text-ink-faint transition-colors duration-200 ease-[var(--ease-salida)] hover:text-brass"
      >
        <span
          aria-hidden
          className="mr-1.5 transition-transform duration-200 ease-[var(--ease-salida)] group-hover:-translate-x-1"
        >
          ←
        </span>
        Volver al inicio
      </Link>
    </div>
  );
}
