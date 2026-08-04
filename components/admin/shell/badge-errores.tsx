import { obtenerResumen } from "@/lib/admin/consultas";

/**
 * Cuantos errores hay sin atender, al lado de "Errores" en la navegacion.
 *
 * Rojo y no ambar como el de casos: adentro de este numero puede haber plata
 * cobrada dos veces o gente que pago y nunca recibio sus entradas. Un caso
 * espera a que lo llamen; esto ya salio mal.
 *
 * Sale del mismo `GET /api/admin/resumen` del tablero, y `obtenerResumen` esta
 * memoizada: sumar este badge no agrega ninguna consulta.
 */
export async function BadgeErrores() {
  const { erroresPendientes } = await obtenerResumen();

  if (erroresPendientes === 0) return null;

  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-sm border border-error/50 px-1.5 py-0.5 text-xs font-semibold text-error tabular">
      {erroresPendientes}
      <span className="sr-only"> errores sin atender</span>
    </span>
  );
}
