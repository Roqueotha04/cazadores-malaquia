import { obtenerEvento } from "@/lib/consultas";
import { abrirVentas, cerrarVentas } from "@/lib/admin/acciones/evento";
import { AccionConfirmada } from "../ui/accion-confirmada";

/**
 * Si la venta esta abierta, y el interruptor para darla vuelta.
 *
 * Vive en la barra superior y no solo en la pantalla de configuracion porque
 * cerrar la venta es lo que se hace con apuro cuando algo va mal: tiene que
 * estar a un toque desde donde sea que uno este mirando.
 *
 * `GET /api/evento` es publico: no hace falta la sesion para leerlo.
 */
export async function EstadoVenta() {
  const evento = await obtenerEvento();

  if (evento.ventasAbiertas) {
    return (
      <div className="flex items-center gap-2">
        <Estado abierta />
        <AccionConfirmada
          flotante
          etiqueta="Cerrar venta"
          confirmar="Sí, cerrar la venta"
          accion={cerrarVentas}
          pregunta={
            <>
              <strong className="text-ink">
                Nadie va a poder comprar por la web.
              </strong>{" "}
              El plano se sigue viendo, pero al confirmar la compra da error. La
              carga a mano desde el panel sigue funcionando igual.
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Estado abierta={false} />
      <AccionConfirmada
        flotante
        etiqueta="Abrir venta"
        confirmar="Sí, abrir la venta"
        tono="principal"
        accion={abrirVentas}
        pregunta="Vuelve a habilitarse la compra desde la web."
      />
    </div>
  );
}

/**
 * El punto no va solo: con daltonismo rojo-verde el abierto y el cerrado son el
 * mismo color. La palabra al lado es el segundo canal.
 */
function Estado({ abierta }: { abierta: boolean }) {
  return (
    <p className="hidden items-center gap-2 text-sm sm:flex">
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${
          abierta ? "bg-exito" : "bg-error"
        }`}
      />
      <span className={abierta ? "text-ink-soft" : "font-semibold text-error"}>
        {abierta ? "Venta abierta" : "Venta cerrada"}
      </span>
    </p>
  );
}

/** Mientras el evento no llega. Ocupa el mismo alto para que la barra no salte. */
export function EstadoVentaCargando() {
  return (
    <p className="hidden h-11 items-center text-sm text-ink-faint sm:flex">
      Venta…
    </p>
  );
}
