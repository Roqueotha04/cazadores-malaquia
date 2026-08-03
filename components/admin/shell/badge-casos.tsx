import { obtenerResumen } from "@/lib/admin/consultas";

/**
 * Cuantos casos hay sin resolver, al lado de "Casos" en la navegacion.
 *
 * Son compras pagadas que quedaron sin butaca: gente que pago y no tiene donde
 * sentarse. Es lo unico del panel que justifica un numero persiguiendo a quien
 * mira, porque del otro lado hay alguien esperando que lo llamen.
 *
 * Sale del mismo `GET /api/admin/resumen` del tablero, y `obtenerResumen` esta
 * memoizada: en el tablero los dos usos son una sola consulta.
 */
export async function BadgeCasos() {
  const { incidenciasPendientes } = await obtenerResumen();

  if (incidenciasPendientes === 0) return null;

  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-sm border border-alerta/50 px-1.5 py-0.5 text-xs font-semibold text-alerta tabular">
      {incidenciasPendientes}
      <span className="sr-only"> casos sin resolver</span>
    </span>
  );
}
