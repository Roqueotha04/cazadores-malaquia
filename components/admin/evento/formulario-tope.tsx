"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/boton";
import { AccionConfirmada } from "@/components/admin/ui/accion-confirmada";
import {
  guardarTope,
  sacarTope,
  type EstadoTope,
} from "@/lib/admin/acciones/evento";
import type { Tope } from "@/lib/admin/tipos";
import { Campo } from "../ui/campos";
import { Aviso, Panel } from "../ui/piezas";

const INICIAL: EstadoTope = {};

/**
 * El corte de venta: a partir de cuántas butacas vendidas la web deja de
 * vender sola, con un margen que cubre las compras que ya estaban en curso
 * cuando se llega ahí.
 *
 * No es lo mismo que el interruptor "Cerrar la venta" de arriba: ese apaga
 * todo al instante y a mano; esto la apaga sola al llegar a un número, para
 * dejar un colchón de butacas para la puerta o la carga manual sin tener que
 * estar mirando el tablero.
 */
export function FormularioTope({
  tope,
  maxAsientosPorCompra,
}: {
  tope: Tope;
  maxAsientosPorCompra: number;
}) {
  const [estado, accion, enviando] = useActionState(guardarTope, INICIAL);

  const previo = estado.valores;
  const activo = tope.topeVendidas !== null;

  return (
    <Panel titulo="Corte de venta">
      <div className="space-y-5 p-5">
        {activo ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-ink">
                Corta en{" "}
                <strong className="tabular">{tope.lineaDeCorte}</strong>{" "}
                butacas vendidas.
              </p>
              <p className="mt-1 text-sm text-ink-soft tabular">
                Tope {tope.topeVendidas} · margen {tope.margen} ·{" "}
                {tope.butacasOcupadas} ocupadas ahora
              </p>
            </div>

            <AccionConfirmada
              etiqueta="Sacar el corte"
              confirmar="Sí, sacar el corte"
              accion={sacarTope}
              pregunta="La web vuelve a vender sin este límite propio. El interruptor general de la venta no cambia."
            />
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            No hay ningún corte activo: la web vende hasta donde lo permita el
            interruptor general de arriba.
          </p>
        )}

        <form
          action={accion}
          className="space-y-5 border-t border-line pt-5"
          noValidate
        >
          {estado.error && <Aviso>{estado.error}</Aviso>}
          {estado.ok && (
            <Aviso tono="exito" titulo="Guardado">
              El corte ya está activo en el sitio.
            </Aviso>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              id="topeVendidas"
              name="topeVendidas"
              rotulo="Se corta al llegar a"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              defaultValue={previo?.topeVendidas ?? tope.topeVendidas ?? ""}
              ayuda="Butacas vendidas."
            />

            <Campo
              id="margen"
              name="margen"
              rotulo="Margen"
              type="number"
              inputMode="numeric"
              min={maxAsientosPorCompra}
              step={1}
              required
              defaultValue={previo?.margen ?? tope.margen ?? ""}
              ayuda={`Al menos ${maxAsientosPorCompra} (el máximo de butacas por compra). La venta frena en tope − margen, no en el tope.`}
            />
          </div>

          <Boton type="submit" cargando={enviando} disabled={enviando}>
            {enviando
              ? "Guardando…"
              : activo
                ? "Actualizar el corte"
                : "Activar el corte"}
          </Boton>
        </form>
      </div>
    </Panel>
  );
}
