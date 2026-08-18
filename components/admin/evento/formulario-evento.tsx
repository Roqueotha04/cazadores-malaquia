"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/boton";
import { guardarEvento, type EstadoEvento } from "@/lib/admin/acciones/evento";
import { paraInputFechaHora } from "@/lib/admin/fecha";
import {
  MAX_ASIENTOS,
  MAX_RESERVA,
  MIN_ASIENTOS,
  MIN_RESERVA,
} from "@/lib/admin/validacion";
import { aPesos } from "@/lib/formato";
import type { Evento } from "@/lib/tipos";
import { Campo } from "../ui/campos";
import { Aviso, Panel } from "../ui/piezas";

const INICIAL: EstadoEvento = {};

/**
 * La configuracion del evento.
 *
 * Precargado con lo que devuelve `GET /api/evento` porque el endpoint es un
 * **reemplazo completo, no un parche**: los siete campos viajan siempre. Un campo
 * que se deje vacio no significa "dejalo como estaba".
 *
 * El precio se tipea en pesos y viaja en centavos: nadie escribe 3500000 para
 * decir treinta y cinco mil.
 */
export function FormularioEvento({ evento }: { evento: Evento }) {
  const [estado, accion, enviando] = useActionState(guardarEvento, INICIAL);

  const previo = estado.valores;

  return (
    <Panel titulo="Datos del evento">
      <form action={accion} className="space-y-5 p-5" noValidate>
        {estado.error && <Aviso>{estado.error}</Aviso>}
        {estado.ok && (
          <Aviso tono="exito" titulo="Guardado">
            Los cambios ya están en el sitio.
          </Aviso>
        )}

        <Campo
          id="nombre"
          name="nombre"
          rotulo="Nombre"
          required
          defaultValue={previo?.nombre ?? evento.nombre}
          error={estado.errores?.nombre?.[0]}
        />

        <Campo
          id="lugar"
          name="lugar"
          rotulo="Lugar"
          required
          defaultValue={previo?.lugar ?? evento.lugar ?? ""}
          error={estado.errores?.lugar?.[0]}
        />

        <Campo
          id="fecha"
          name="fecha"
          rotulo="Fecha y hora"
          type="datetime-local"
          required
          defaultValue={previo?.fecha ?? paraInputFechaHora(evento.fecha)}
          error={estado.errores?.fecha?.[0]}
          ayuda="En hora de Buenos Aires. Se puede poner una fecha pasada: el día del evento es justo cuando hace falta corregir el lugar o la hora."
        />

        <Campo
          id="precio"
          name="precio"
          rotulo="Precio por butaca"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          defaultValue={previo?.precio ?? aPesos(evento.precioCentavos)}
          error={estado.errores?.precio?.[0]}
          ayuda="En pesos enteros. Cambiarlo no toca las órdenes ya creadas: cada una tiene congelado el precio que se le mostró al comprador."
        />

        <Campo
          id="tarifaServicioPorcentaje"
          name="tarifaServicioPorcentaje"
          rotulo="Tarifa de servicio"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.01}
          required
          defaultValue={
            previo?.tarifaServicioPorcentaje ?? evento.tarifaServicioPorcentaje
          }
          error={estado.errores?.tarifaServicioPorcentaje?.[0]}
          ayuda="Porcentaje sobre el precio, hasta dos decimales (ej. 4.00 para 4%). Cubre la comisión de Mercado Pago; se suma aparte al confirmar la compra, no en el plano. Cambiarla tampoco toca las órdenes ya creadas."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            id="maxAsientosPorCompra"
            name="maxAsientosPorCompra"
            rotulo="Máximo de butacas por compra"
            type="number"
            inputMode="numeric"
            min={MIN_ASIENTOS}
            max={MAX_ASIENTOS}
            step={1}
            required
            defaultValue={
              previo?.maxAsientosPorCompra ?? evento.maxAsientosPorCompra
            }
            error={estado.errores?.maxAsientosPorCompra?.[0]}
            ayuda={`De ${MIN_ASIENTOS} a ${MAX_ASIENTOS}. No aplica a la carga a mano.`}
          />

          <Campo
            id="minutosReserva"
            name="minutosReserva"
            rotulo="Minutos de reserva"
            type="number"
            inputMode="numeric"
            min={MIN_RESERVA}
            max={MAX_RESERVA}
            step={1}
            required
            defaultValue={previo?.minutosReserva ?? evento.minutosReserva}
            error={estado.errores?.minutosReserva?.[0]}
            ayuda={`De ${MIN_RESERVA} a ${MAX_RESERVA}. Cuánto se le guardan las butacas a quien todavía no pagó.`}
          />
        </div>

        <div className="border-t border-line pt-5">
          <Boton type="submit" cargando={enviando} disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar los siete campos"}
          </Boton>
          <p className="mt-3 text-xs text-ink-faint">
            Se guardan todos juntos: lo que no toques igual se vuelve a escribir
            tal como está acá.
          </p>
        </div>
      </form>
    </Panel>
  );
}
