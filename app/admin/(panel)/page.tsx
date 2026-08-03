import Link from "next/link";
import { obtenerResumen } from "@/lib/admin/consultas";
import {
  ESTADO_ORDEN,
  ESTADOS_ORDEN,
  MEDIO,
  MEDIOS,
  type MedioPago,
} from "@/lib/admin/tipos";
import type { EstadoOrden } from "@/lib/tipos";
import { precio } from "@/lib/formato";
import { Refresco } from "@/components/admin/ui/refresco";
import {
  BarraApilada,
  Cifra,
  Encabezado,
  FilaBarra,
  Panel,
} from "@/components/admin/ui/piezas";

export const metadata = { title: "Tablero" };

/**
 * Como va la venta, en un solo pedido.
 *
 * Es la pantalla de entrada y sale entera de `GET /api/admin/resumen`: un solo
 * viaje, para que abrir el panel no dependa de que seis endpoints contesten.
 */
export default async function TableroPage() {
  const { butacas, recaudacion, incidenciasPendientes } =
    await obtenerResumen();

  // El backend manda siempre los tres medios y los cuatro estados, aunque esten
  // en cero. Igual se ordenan acá: la lista se lee siempre en el mismo orden, y
  // si algun dia llegara incompleta no desaparecen renglones de la pantalla.
  const porMedio = MEDIOS.map((medio) => ({
    medio,
    dato: recaudacion.porMedio.find((m) => m.medio === medio),
  }));

  const porEstado = ESTADOS_ORDEN.map((estado) => ({
    estado,
    cantidad:
      recaudacion.ordenesPorEstado.find((o) => o.estado === estado)?.cantidad ??
      0,
  }));

  const maximoMedio = Math.max(
    1,
    ...porMedio.map((m) => m.dato?.totalCentavos ?? 0),
  );
  const maximoEstado = Math.max(1, ...porEstado.map((e) => e.cantidad));

  return (
    <>
      <Encabezado
        titulo="Tablero"
        bajada="Nada de esto se actualiza solo: el número que estás mirando es de cuando se cargó la pantalla."
      >
        <Refresco cada={60} />
      </Encabezado>

      {incidenciasPendientes > 0 && (
        <Link
          href="/admin/casos"
          className="block rounded-sm border border-alerta/40 bg-alerta/10 px-4 py-3.5 transition-colors duration-200 hover:border-alerta/70"
        >
          <p className="font-semibold text-ink">
            {incidenciasPendientes === 1
              ? "Hay 1 caso sin resolver"
              : `Hay ${incidenciasPendientes} casos sin resolver`}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Son compras pagadas que quedaron sin butaca. Cada una es alguien
            esperando que lo llamen. →
          </p>
        </Link>
      )}

      <Panel titulo="El salón">
        <div className="p-5">
          <BarraApilada
            total={butacas.total}
            tramos={[
              {
                rotulo: "Vendidas",
                valor: butacas.vendidas,
                clase: "bg-brass",
              },
              {
                rotulo: "Reservadas",
                valor: butacas.reservadas,
                clase: "bg-alerta/70",
              },
              {
                rotulo: "Libres",
                valor: butacas.libres,
                clase: "bg-silla-libre",
              },
            ]}
          />

          <p className="mt-4 max-w-[65ch] text-sm text-ink-soft">
            <strong className="font-semibold text-ink">
              Vendidas y reservadas no se pisan.
            </strong>{" "}
            Las vendidas son entradas ya emitidas; las reservadas, butacas
            agarradas por alguien que todavía no pagó y que vuelven solas a la
            venta cuando se le acaba el tiempo.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <Cifra
              rotulo="Butacas del salón"
              valor={String(butacas.total)}
              nota={`${porcentaje(butacas.vendidas, butacas.total)} vendido`}
            />
            <Cifra
              rotulo="Sin vender"
              valor={String(butacas.libres)}
              nota="Disponibles ahora mismo"
            />
            <Cifra
              rotulo="Entraron al salón"
              valor={String(butacas.entradasUsadas)}
              nota="Entradas escaneadas en la puerta"
            />
          </div>
        </div>
      </Panel>

      <Panel titulo="Recaudación">
        <div className="border-b border-line p-5">
          <Cifra
            rotulo="Total cobrado"
            valor={precio(recaudacion.totalCentavos)}
            nota="Suma de los cobros aprobados, no de precio × butacas."
          />
        </div>

        <div className="divide-y divide-line">
          {porMedio.map(({ medio, dato }) => (
            <FilaBarra
              key={medio}
              rotulo={MEDIO[medio]}
              valor={dato?.totalCentavos ?? 0}
              maximo={maximoMedio}
              cifra={precio(dato?.totalCentavos ?? 0)}
              nota={leyendaMedio(medio, dato?.cantidad ?? 0)}
            />
          ))}
        </div>
      </Panel>

      <Panel titulo="Órdenes por estado">
        <div className="divide-y divide-line">
          {porEstado.map(({ estado, cantidad }) => (
            <FilaBarra
              key={estado}
              rotulo={ESTADO_ORDEN[estado]}
              valor={cantidad}
              maximo={maximoEstado}
              cifra={String(cantidad)}
              nota={LEYENDA_ESTADO[estado]}
            />
          ))}
        </div>
        <p className="border-t border-line px-5 py-3.5 text-sm text-ink-faint">
          <Link href="/admin/ordenes" className="subrayado-vivo">
            Ver las órdenes una por una
          </Link>
        </p>
      </Panel>
    </>
  );
}

function porcentaje(parte: number, total: number) {
  if (total <= 0) return "0 %";

  return `${Math.round((parte / total) * 100)} %`;
}

function leyendaMedio(medio: MedioPago, cantidad: number) {
  const cobros = cantidad === 1 ? "1 cobro" : `${cantidad} cobros`;

  return medio === "MERCADOPAGO"
    ? `${cobros} por la web`
    : `${cobros} cargados a mano`;
}

const LEYENDA_ESTADO: Record<EstadoOrden, string> = {
  ACTIVA: "Con butacas reservadas, esperando el pago",
  PAGADA: "Con entradas emitidas",
  EXPIRADA: "Se acabó el tiempo y soltaron las butacas",
  CANCELADA: "El comprador volvió atrás antes de pagar",
};
