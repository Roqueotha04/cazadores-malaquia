import { redirect } from "next/navigation";
import { EsperaConfirmacion } from "@/components/compra/espera-confirmacion";
import { BotonLink } from "@/components/ui/boton";
import { obtenerReservaPorToken } from "@/lib/consultas";
import { precio, ubicacion } from "@/lib/formato";

/**
 * Vuelta del checkout de pago.
 *
 * Mercado Pago manda al comprador acá con un `status`, pero ese status no es la
 * verdad: la verdad la trae el webhook, que llega por otro lado y puede llegar
 * después. Así que esta página cruza las dos cosas — lo que dice el proveedor y
 * lo que dice nuestra base — y elige qué mostrar.
 *
 * Los cuatro casos:
 *
 *   la reserva ya figura PAGADA  → a las entradas, esto no se ve
 *   el proveedor aprobó          → espera activa hasta que llegue el webhook
 *   pago offline (Rapipago…)     → informativo, puede tardar días
 *   rechazado                    → volver a intentar, sin haber perdido nada
 */

const APROBADOS = ["approved", "success"];
const PENDIENTES = ["pending", "in_process", "in_mediation"];

export default async function Resultado(
  props: PageProps<"/compra/resultado">,
) {
  const params = await props.searchParams;

  const token = primero(params.token);
  const estadoProveedor = (
    primero(params.status) ??
    primero(params.collection_status) ??
    ""
  ).toLowerCase();

  // Sin token no hay nada que consultar: pasa si alguien entra a mano.
  if (!token) {
    return (
      <Marco titulo="No encontramos tu compra">
        <p className="text-lg text-ink-soft">
          Este link está incompleto. Si ya pagaste, buscá el mail que te
          mandamos: ahí está el link a tus entradas.
        </p>
        <BotonLink href="/" className="mt-8 w-full sm:w-auto">
          Volver al inicio
        </BotonLink>
      </Marco>
    );
  }

  const reserva = await obtenerReservaPorToken(token);

  if (!reserva) {
    return (
      <Marco titulo="No encontramos esta compra">
        <p className="text-lg text-ink-soft">
          Revisá que el link esté completo. Si pagaste y no lo encontrás,
          escribinos y lo resolvemos.
        </p>
        <BotonLink href="/comprar" className="mt-8 w-full sm:w-auto">
          Ver sillas disponibles
        </BotonLink>
      </Marco>
    );
  }

  // El webhook ya hizo su trabajo: las entradas existen y son la pantalla de
  // exito de verdad.
  if (reserva.estado === "PAGADA") redirect(`/entradas/${token}`);

  const detalle = (
    <div className="mt-8 rounded-sm border border-line bg-surface-raised px-5 py-4">
      <p className="dato">Tu compra</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {reserva.asientos.map((a) => (
          <li
            key={a.id}
            className="rounded-sm bg-surface-sunken px-3 py-2 text-sm font-medium tabular"
          >
            {ubicacion(a.mesa, a.silla)}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
        <span className="dato">Total</span>
        <span className="font-display text-xl text-ink tabular">
          {precio(reserva.montoCentavos)}
        </span>
      </div>
    </div>
  );

  if (APROBADOS.includes(estadoProveedor)) {
    return (
      <Marco titulo="Recibimos tu pago">
        <EsperaConfirmacion token={token} />
        {detalle}
      </Marco>
    );
  }

  if (PENDIENTES.includes(estadoProveedor)) {
    return (
      <Marco titulo="Tu pago está en camino">
        <div className="rounded-sm border border-alerta/50 bg-alerta/10 px-5 py-5">
          <p className="text-ink-soft">
            Elegiste un medio que tarda en acreditarse. Cuando el pago se
            confirme te emitimos las entradas y te avisamos por mail a{" "}
            <span className="font-medium text-ink">{reserva.email}</span>.
          </p>
          <p className="mt-3 font-semibold text-ink">
            Guardá este link: acá van a aparecer tus entradas.
          </p>
        </div>
        {detalle}
        <p className="mt-6 text-sm text-ink-faint">
          Mientras el pago no se acredite, tus sillas no quedan aseguradas.
        </p>
      </Marco>
    );
  }

  // Rechazado, cancelado, o cualquier cosa que no sea aprobado ni pendiente.
  return (
    <Marco titulo="El pago no se completó">
      <div className="rounded-sm border border-error/50 bg-error/10 px-5 py-5">
        <p className="text-ink-soft">
          No se te cobró nada. Puede haber sido un problema con la tarjeta o el
          pago se canceló antes de terminar.
        </p>
      </div>

      {detalle}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <BotonLink href={`/reserva/${token}`} className="w-full sm:w-auto">
          Probar de nuevo
        </BotonLink>
        <BotonLink href="/comprar" tono="secundario">
          Elegir otras sillas
        </BotonLink>
      </div>

      <p className="mt-4 text-sm text-ink-faint">
        Si tu reserva todavía está vigente, seguís teniendo esas sillas
        guardadas.
      </p>
    </Marco>
  );
}

function Marco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="mb-8">{titulo}</h1>
      {children}
    </div>
  );
}

function primero(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}
