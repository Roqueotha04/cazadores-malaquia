import Link from "next/link";
import { TOPE_VENTAS, obtenerVentasManuales } from "@/lib/admin/consultas";
import { MEDIO, type VentaManual } from "@/lib/admin/tipos";
import { SIN_DATO, fechaCorta, precio } from "@/lib/formato";
import { AvisoTope, Celda, Tabla } from "@/components/admin/ui/tabla";
import {
  Encabezado,
  Panel,
  Pildora,
  Vacio,
} from "@/components/admin/ui/piezas";

export const metadata = { title: "Ventas a mano" };

/**
 * Lo cobrado por fuera de la web, mas nuevo primero.
 *
 * Sin filtros: son las ventas de un solo evento y entran todas en una pantalla.
 * El monto sale del cobro y no de precio × butacas, asi que cuadra con el
 * desglose por medio del tablero.
 */
export default async function VentasPage() {
  const ventas = await obtenerVentasManuales();

  const total = ventas.reduce((suma, v) => suma + (v.montoCentavos ?? 0), 0);
  const rotas = ventas.filter(
    (v) => v.medio === null || v.montoCentavos === null,
  ).length;

  return (
    <>
      <Encabezado
        titulo="Ventas a mano"
        bajada="Entradas vendidas por fuera de la web. La app no cobra acá: deja asentado lo que ya se cobró en efectivo o por transferencia."
      >
        <Link
          href="/admin/ventas/nueva"
          className="inline-flex min-h-11 items-center rounded-sm bg-brass px-5 text-sm font-semibold text-carbon transition-colors duration-200 hover:bg-brass-light"
        >
          Cargar una venta
        </Link>
      </Encabezado>

      {rotas > 0 && (
        <div className="rounded-sm border border-alerta/40 bg-alerta/10 px-4 py-3">
          <p className="font-semibold text-ink">
            {rotas === 1
              ? "Hay 1 venta sin cobro registrado"
              : `Hay ${rotas} ventas sin cobro registrado`}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Les falta el medio o el monto. No debería pasar: es un dato roto, no
            una venta de cero pesos, y hay que ir a mirarlo.
          </p>
        </div>
      )}

      <Panel
        titulo={`${ventas.length} ${ventas.length === 1 ? "venta" : "ventas"}`}
        acciones={
          ventas.length > 0 ? (
            <span className="text-sm text-ink-soft tabular">
              {precio(total)} cobrados
            </span>
          ) : undefined
        }
      >
        {ventas.length === 0 ? (
          <Vacio titulo="Todavía no se cargó ninguna venta a mano">
            Acá quedan asentadas las entradas que se cobran afuera. Cargá la
            primera cuando alguien pague en efectivo o por transferencia.
          </Vacio>
        ) : (
          <>
            <Tabla
              columnas={[
                { clave: "comprador", rotulo: "Comprador" },
                { clave: "medio", rotulo: "Cobrado por" },
                { clave: "butacas", rotulo: "Butacas", alDerecha: true },
                { clave: "monto", rotulo: "Monto", alDerecha: true },
                { clave: "cargada", rotulo: "Se cargó" },
              ]}
            >
              {ventas.map((venta) => (
                <Fila key={venta.token} venta={venta} />
              ))}
            </Tabla>

            <AvisoTope cantidad={ventas.length} tope={TOPE_VENTAS}>
              Llegaste al tope de {TOPE_VENTAS} resultados: puede haber más
              ventas que no se están mostrando.
            </AvisoTope>

            <p className="border-t border-line px-4 py-2.5 text-xs text-ink-faint">
              Los números de butaca no viajan en esta lista: se ven abriendo la
              orden.
            </p>
          </>
        )}
      </Panel>
    </>
  );
}

function Fila({ venta }: { venta: VentaManual }) {
  return (
    <tr className="transition-colors duration-200 hover:bg-surface-high">
      <Celda>
        <Link
          href={`/admin/ordenes/${venta.token}`}
          className="font-medium text-ink subrayado-vivo"
        >
          {venta.comprador}
        </Link>
        <span className="block text-xs text-ink-faint tabular">
          DNI {venta.dni}
        </span>
      </Celda>

      <Celda>
        {venta.medio ? (
          <span className="text-ink-soft">{MEDIO[venta.medio]}</span>
        ) : (
          <Pildora tono="alerta">{SIN_DATO}</Pildora>
        )}
      </Celda>

      <Celda alDerecha>
        <span className="text-ink tabular">{venta.butacas}</span>
      </Celda>

      {/* Nunca "$0": un monto en null y un cobro de cero pesos son cosas
          distintas, y la de arriba es un error que alguien tiene que mirar. */}
      <Celda alDerecha>
        {venta.montoCentavos === null ? (
          <span className="text-alerta">{SIN_DATO}</span>
        ) : (
          <span className="text-ink tabular">{precio(venta.montoCentavos)}</span>
        )}
      </Celda>

      <Celda>
        <span className="text-ink-soft tabular">
          {fechaCorta(venta.creadoEl)}
        </span>
      </Celda>
    </tr>
  );
}
