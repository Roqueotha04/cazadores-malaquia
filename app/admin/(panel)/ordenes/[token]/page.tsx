import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerOrdenPorToken } from "@/lib/consultas";
import { requerirSesion } from "@/lib/admin/sesion";
import { reenviarEntradas } from "@/lib/admin/acciones/ordenes";
import { anularVenta } from "@/lib/admin/acciones/ventas";
import { ESTADO_ORDEN, ORIGEN } from "@/lib/admin/tipos";
import { fechaCorta, precio, ubicacion } from "@/lib/formato";
import { titularDe, type EstadoOrden } from "@/lib/tipos";
import { FormularioCorreccion } from "@/components/admin/ordenes/formulario-correccion";
import { AccionConfirmada } from "@/components/admin/ui/accion-confirmada";
import {
  Dato,
  Encabezado,
  Panel,
  Pildora,
  Vacio,
  type Tono,
} from "@/components/admin/ui/piezas";

export const metadata = { title: "Orden" };

/**
 * Una orden, con sus butacas una por una.
 *
 * Sale del `GET /api/ordenes/{token}` publico, que ya las mapea con mesa y
 * numero: el contrato dice explicitamente que no hay una version admin de esto.
 * Publico no quiere decir abierto — el token es la credencial, y sin ese UUID no
 * se puede nombrar una orden ajena.
 *
 * Igual se pide la sesion antes: esta pantalla es del panel, y quien no entro no
 * tiene por que poder leerla ni aunque tenga el token.
 */
export default async function OrdenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await requerirSesion();

  const { token } = await params;
  const orden = await obtenerOrdenPorToken(token);

  if (!orden) notFound();

  const puedeReenviar = orden.estado === "PAGADA";

  // Solo las ventas cargadas a mano se dan de baja: el endpoint contesta 422 a
  // una compra de la web. `origen` es opcional en el contrato publico, asi que
  // si no viene el boton no aparece — preferible a ofrecer una baja que el
  // backend va a rechazar sobre una compra que si se cobro por Mercado Pago.
  const puedeAnularse = orden.estado === "PAGADA" && orden.origen === "ADMIN";

  return (
    <>
      <Encabezado
        titulo={titularDe(orden.usuario)}
        bajada={
          <>
            <Link href="/admin/ordenes" className="subrayado-vivo">
              ← Volver a órdenes
            </Link>
          </>
        }
      >
        <Pildora tono={TONO_ESTADO[orden.estado]}>
          {ESTADO_ORDEN[orden.estado]}
        </Pildora>
        {/* Solo si vino: el contrato publico todavia no lo lista. */}
        {orden.origen && (
          <Pildora tono="neutro">{ORIGEN[orden.origen]}</Pildora>
        )}
      </Encabezado>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-6">
          <Panel
            titulo={`Butacas (${orden.butacas.length})`}
            acciones={
              orden.estado === "CANCELADA" || orden.estado === "ANULADA" ? (
                <span className="text-xs text-ink-faint">
                  devueltas a la venta
                </span>
              ) : undefined
            }
          >
            {orden.butacas.length === 0 ? (
              <Vacio titulo="Esta orden no conserva butacas">
                {orden.estado === "CANCELADA"
                  ? "Se canceló antes de pagar y las butacas volvieron a la venta."
                  : orden.estado === "ANULADA"
                    ? "El equipo la dio de baja y las butacas volvieron a la venta. Se había cobrado: el reintegro va a mano."
                    : orden.estado === "EXPIRADA"
                      ? "Se acabó el tiempo de la reserva y las butacas volvieron a la venta."
                      : "Una orden pagada sin butacas es un caso para la cola: la persona pagó y no tiene dónde sentarse."}
              </Vacio>
            ) : (
              <ul className="divide-y divide-line">
                {orden.butacas.map((butaca) => (
                  <li
                    key={butaca.asientoId}
                    className="flex items-baseline justify-between gap-4 px-5 py-3"
                  >
                    <span className="text-ink">
                      {ubicacion(butaca.mesaNumero, butaca.numero)}
                    </span>
                    <span className="text-xs text-ink-faint tabular">
                      id {butaca.asientoId}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel titulo="Comprador">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Dato rotulo="Nombre">{titularDe(orden.usuario)}</Dato>
              <Dato rotulo="DNI">{orden.usuario.dni}</Dato>
              <Dato rotulo="Email">
                <span className="break-all">{orden.usuario.email}</span>
              </Dato>
              <Dato rotulo="Celular">
                <a
                  href={`tel:${orden.usuario.celular}`}
                  className="subrayado-vivo"
                >
                  {orden.usuario.celular}
                </a>
              </Dato>
            </div>
            <div className="border-t border-line p-5">
              <FormularioCorreccion usuario={orden.usuario} />
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel titulo="La compra">
            <div className="space-y-4 p-5">
              <Dato rotulo="Total">{precio(orden.totalCentavos)}</Dato>
              <Dato rotulo="Precio por butaca">
                {precio(orden.precioUnitarioCentavos)}
              </Dato>
              <Dato rotulo="Creada">{fechaCorta(orden.creadoEl)}</Dato>
              <Dato rotulo="Pagada">
                {fechaCorta(orden.pagadoEl, "sin pagar")}
              </Dato>
              {orden.expiraEn && (
                <Dato rotulo="Vence">{fechaCorta(orden.expiraEn)}</Dato>
              )}
            </div>
            <p className="border-t border-line px-5 py-3.5 text-xs text-ink-faint">
              El precio quedó congelado al crear la orden: si el del evento
              cambió después, esta compra sigue valiendo lo que se le mostró.
            </p>
          </Panel>

          <Panel titulo="Entradas">
            <div className="space-y-3 p-5">
              {puedeReenviar ? (
                <>
                  <p className="text-sm text-ink-soft">
                    Vuelve a mandar el PDF a{" "}
                    <span className="break-all text-ink">
                      {orden.usuario.email}
                    </span>
                    . Si esa dirección está mal, corregila primero.
                  </p>
                  <AccionConfirmada
                    etiqueta="Reenviar entradas"
                    confirmar="Sí, reenviar"
                    accion={reenviarEntradas.bind(null, orden.token)}
                    pregunta={
                      <>
                        Se manda el PDF a{" "}
                        <span className="break-all text-ink">
                          {orden.usuario.email}
                        </span>
                        . El mail puede tardar unos segundos en salir.
                      </>
                    }
                  />
                </>
              ) : (
                <p className="text-sm text-ink-soft">
                  Sin entradas: la orden no está pagada. El reenvío sólo existe
                  para las órdenes que ya emitieron su PDF.
                </p>
              )}
            </div>
          </Panel>

          {puedeAnularse && (
            <Panel titulo="Dar de baja">
              <div className="space-y-3 p-5">
                <p className="text-sm text-ink-soft">
                  Se anulan las {orden.butacas.length}{" "}
                  {orden.butacas.length === 1 ? "entrada" : "entradas"} de esta
                  venta y las butacas vuelven al mapa. La plata{" "}
                  <strong className="text-ink">no se devuelve sola</strong>: el
                  reintegro lo hace el equipo a mano.
                </p>
                <AccionConfirmada
                  etiqueta="Dar de baja la venta"
                  confirmar="Sí, dar de baja"
                  accion={anularVenta.bind(null, orden.token)}
                  motivo={{
                    rotulo: "Por qué se da de baja",
                    ayuda:
                      "Queda asentado en el historial. Es lo único que después explica por qué estas butacas volvieron a estar libres.",
                    placeholder: "Se cargó con el DNI equivocado",
                  }}
                  pregunta={
                    <>
                      Esto no se deshace. Si alguien de esta venta ya pasó por la
                      puerta no se va a poder: esa persona está adentro.
                    </>
                  }
                />
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}

const TONO_ESTADO: Record<EstadoOrden, Tono> = {
  PAGADA: "exito",
  ACTIVA: "acento",
  EXPIRADA: "neutro",
  CANCELADA: "neutro",
  // La unica de las tres terminadas que no es rutina: se cobro y hay plata que
  // devolver. No se lee igual que una que vencio sola.
  ANULADA: "error",
};
