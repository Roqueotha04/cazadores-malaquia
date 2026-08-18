import { obtenerEvento } from "@/lib/consultas";
import { requerirSesion } from "@/lib/admin/sesion";
import { obtenerTope } from "@/lib/admin/consultas";
import { abrirVentas, cerrarVentas } from "@/lib/admin/acciones/evento";
import { FormularioEvento } from "@/components/admin/evento/formulario-evento";
import { FormularioTope } from "@/components/admin/evento/formulario-tope";
import { AccionConfirmada } from "@/components/admin/ui/accion-confirmada";
import { Encabezado, Panel } from "@/components/admin/ui/piezas";

export const metadata = { title: "Evento" };

/**
 * La configuracion del evento, el interruptor de la venta y el corte
 * automatico.
 *
 * El interruptor esta acá y tambien en la barra superior del panel: cerrar la
 * venta es lo que se hace con apuro cuando algo va mal, y en ese momento nadie
 * tiene que estar buscando en que pantalla estaba el boton.
 */
export default async function EventoPage() {
  await requerirSesion();

  const [evento, tope] = await Promise.all([obtenerEvento(), obtenerTope()]);

  return (
    <>
      <Encabezado
        titulo="Evento"
        bajada="Lo que ve el comprador y las reglas de la compra. Se guarda todo junto: es un reemplazo completo, no un parche."
      />

      <Panel titulo="Venta">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="flex items-center gap-2">
              <span
                aria-hidden
                className={`size-2.5 shrink-0 rounded-full ${
                  evento.ventasAbiertas ? "bg-exito" : "bg-error"
                }`}
              />
              <span className="font-semibold text-ink">
                {evento.ventasAbiertas
                  ? "La venta está abierta"
                  : "La venta está cerrada"}
              </span>
            </p>
            <p className="mt-1.5 max-w-[65ch] text-sm text-ink-soft">
              {evento.ventasAbiertas
                ? "Cualquiera puede elegir butacas y comprar desde el sitio."
                : "El plano se sigue viendo, pero al confirmar la compra da error. La carga a mano desde el panel sigue funcionando igual."}
            </p>
          </div>

          {evento.ventasAbiertas ? (
            <AccionConfirmada
              etiqueta="Cerrar la venta"
              confirmar="Sí, cerrar la venta"
              medida="base"
              accion={cerrarVentas}
              pregunta={
                <>
                  <strong className="text-ink">
                    Nadie va a poder comprar por la web.
                  </strong>{" "}
                  Las órdenes que ya están activas conservan sus butacas hasta
                  que se les acabe el tiempo.
                </>
              }
            />
          ) : (
            <AccionConfirmada
              etiqueta="Abrir la venta"
              confirmar="Sí, abrir la venta"
              tono="principal"
              medida="base"
              accion={abrirVentas}
              pregunta="Vuelve a habilitarse la compra desde el sitio."
            />
          )}
        </div>
      </Panel>

      <FormularioTope tope={tope} maxAsientosPorCompra={evento.maxAsientosPorCompra} />

      <FormularioEvento evento={evento} />
    </>
  );
}
