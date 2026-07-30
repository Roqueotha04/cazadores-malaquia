import { notFound, redirect } from "next/navigation";
import { Contador } from "@/components/compra/contador";
import { BotonPagar } from "@/components/compra/boton-pagar";
import { Pasos } from "@/components/ui/pasos";
import { BotonLink } from "@/components/ui/boton";
import { obtenerReservaPorToken } from "@/lib/consultas";
import { precio, ubicacion } from "@/lib/formato";

export default async function Reserva(props: PageProps<"/reserva/[token]">) {
  const { token } = await props.params;
  const reserva = await obtenerReservaPorToken(token);

  if (!reserva) notFound();
  if (reserva.estado === "PAGADA") redirect(`/entradas/${token}`);

  const vencida = reserva.estado !== "ACTIVA" || reserva.expiraEn <= new Date();

  if (vencida) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-16">
        <h1>Se venció el tiempo</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Liberamos las sillas para que las pueda tomar otra persona. Podés
          volver a elegir: el evento sigue teniendo lugares.
        </p>
        <p className="mt-3 text-ink-faint">
          No se te cobró nada.
        </p>
        <BotonLink href="/comprar" className="mt-8 w-full sm:w-auto">
          Volver a elegir mis sillas
        </BotonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <Pasos actual={3} />

      <header className="mt-8">
        <h1>Confirmá tu compra</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Revisá que esté todo bien y pasá al pago.
        </p>
      </header>

      {/* El contador es lo primero después del título: es el dato que manda. */}
      <div className="mt-8 rounded-sm border border-brass/40 bg-brass/[0.08] px-5 py-5">
        <p className="dato">Tiempo para completar</p>
        <div className="mt-2">
          <Contador expiraEn={reserva.expiraEn.toISOString()} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Tus sillas están guardadas hasta que se termine el tiempo. Si se vence,
          vuelven a quedar libres y no se te cobra nada.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-sm border border-line bg-surface-raised">
        <div className="border-b border-line px-6 py-5">
          <p className="dato">A nombre de</p>
          <h2 className="mt-1.5 text-ink">{reserva.titular}</h2>
          <p className="mt-1 text-sm text-ink-soft">{reserva.email}</p>
        </div>

        <div className="px-6 py-5">
          <p className="dato">
            {reserva.asientos.length === 1 ? "Tu silla" : "Tus sillas"}
          </p>

          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {reserva.asientos.map((a) => (
              <li
                key={a.id}
                className="rounded-sm bg-surface-sunken px-3.5 py-2.5 font-medium text-ink tabular"
              >
                {ubicacion(a.mesa, a.silla)}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-line pt-5">
            <span className="dato">Total a pagar</span>
            <span className="font-display text-3xl text-ink tabular">
              {precio(reserva.montoCentavos)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <BotonPagar token={reserva.token} />
      </div>
    </div>
  );
}
