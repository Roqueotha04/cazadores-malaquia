import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Contador } from "@/components/compra/contador";
import { BotonPagar } from "@/components/compra/boton-pagar";
import { RecordarOrden } from "@/components/compra/recordar-orden";
import { Pasos } from "@/components/ui/pasos";
import { BotonLink } from "@/components/ui/boton";
import { COLCHON_PAGO_MS } from "@/lib/constantes";
import { obtenerOrdenPorToken } from "@/lib/consultas";
import { precio, ubicacion } from "@/lib/formato";
import { titularDe } from "@/lib/tipos";

// Lleva nombre y mail del comprador en una URL con token: no tiene sentido
// que la indexe un buscador.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Reserva(props: PageProps<"/reserva/[token]">) {
  const { token } = await props.params;
  const orden = await obtenerOrdenPorToken(token);

  if (!orden) notFound();
  if (orden.estado === "PAGADA") redirect(`/entradas/${token}`);

  /* El límite que se le muestra a la persona no es `expiraEn`, es un minuto
     antes: el link de Mercado Pago vence ahí y pedirlo más tarde devuelve 409.
     Ver lib/constantes.ts. */
  const limite = orden.expiraEn
    ? new Date(orden.expiraEn.getTime() - COLCHON_PAGO_MS)
    : null;

  const vencida = orden.estado !== "ACTIVA" || !limite || limite <= new Date();

  const cantidad = orden.butacas.length;
  /* En ventas cargadas a mano siempre es 0. Con 0% de tarifa tambien, y ahi no
     tiene sentido mostrar un renglon "Tarifa de servicio $0". */
  const conTarifa = orden.tarifaServicioUnitarioCentavos > 0;
  const entradasCentavos =
    (orden.precioUnitarioCentavos - orden.tarifaServicioUnitarioCentavos) *
    cantidad;
  const tarifaCentavos = orden.tarifaServicioUnitarioCentavos * cantidad;

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
      {/* Sin esto, la vuelta del checkout no sabe de qué orden hablar. */}
      <RecordarOrden token={orden.token} />

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
          <Contador expiraEn={limite.toISOString()} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Tus sillas están guardadas hasta que se termine el tiempo. Si se vence,
          vuelven a quedar libres y no se te cobra nada.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-sm border border-line bg-surface-raised">
        <div className="border-b border-line px-6 py-5">
          <p className="dato">A nombre de</p>
          <h2 className="mt-1.5 text-ink">{titularDe(orden.usuario)}</h2>
          <p className="mt-1 text-sm text-ink-soft">{orden.usuario.email}</p>
        </div>

        <div className="px-6 py-5">
          <p className="dato">
            {orden.butacas.length === 1 ? "Tu silla" : "Tus sillas"}
          </p>

          <ul className="mt-3 flex flex-col gap-1.5">
            {orden.butacas.map((butaca) => (
              <li
                key={butaca.asientoId}
                className="rounded-sm bg-surface-sunken px-3.5 py-2.5 font-medium text-ink tabular"
              >
                {ubicacion(butaca.mesaNumero, butaca.numero)}
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-line pt-5">
            {conTarifa && (
              <>
                <div className="flex items-baseline justify-between gap-4 text-sm text-ink-soft">
                  <span>{cantidad === 1 ? "Entrada" : "Entradas"}</span>
                  <span className="tabular">{precio(entradasCentavos)}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-4 text-sm text-ink-soft">
                  <span>Tarifa de servicio</span>
                  <span className="tabular">{precio(tarifaCentavos)}</span>
                </div>
              </>
            )}
            <div
              className={`flex items-baseline justify-between gap-4 ${conTarifa ? "mt-3 border-t border-line pt-3" : ""}`}
            >
              <span className="dato">Total a pagar</span>
              <span className="font-display text-3xl text-ink tabular">
                {precio(orden.totalCentavos)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <BotonPagar token={orden.token} />
      </div>
    </div>
  );
}
