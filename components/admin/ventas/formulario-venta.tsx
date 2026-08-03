"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { PlanoSalon } from "@/components/salon/plano-salon";
import { nombrarButacas, useSeleccion } from "@/components/salon/use-seleccion";
import { cargarVenta, type EstadoVenta } from "@/lib/admin/acciones/ventas";
import { MEDIO, type MedioManual } from "@/lib/admin/tipos";
import { precio, ubicacion } from "@/lib/formato";
import type { Mesa } from "@/lib/tipos";
import { Campo } from "../ui/campos";
import { Aviso, Dato, Panel } from "../ui/piezas";

const INICIAL: EstadoVenta = {};

const MEDIOS: MedioManual[] = ["EFECTIVO", "TRANSFERENCIA"];

/**
 * Cargar una venta que ya se cobro afuera.
 *
 * Dos pasos en una sola pantalla: elegir butacas y datos, despues revisar. La
 * revision no es un tramite — **esto no se deshace**, no hay endpoint para
 * anular una venta manual, y lo que se carga mal queda mal.
 *
 * Va como panel de revision y no como dialogo modal a proposito: el resumen
 * tiene que poder compararse contra el plano y contra lo que quedo escrito
 * arriba, y un modal tapa justo eso.
 *
 * Sin tope de butacas y sin mirar si la venta esta abierta: el contrato dice que
 * esta pantalla no valida `maxAsientosPorCompra` ni `ventasAbiertas`, a
 * proposito.
 */
export function FormularioVenta({
  mesas,
  precioCentavos,
}: {
  mesas: Mesa[];
  precioCentavos: number;
}) {
  const router = useRouter();
  const formulario = useRef<HTMLFormElement>(null);

  const { elegidos, detalle, ids, ubicaciones, alternar } = useSeleccion(mesas);

  const [estado, accion, enviando] = useActionState(cargarVenta, INICIAL);
  const [revisando, setRevisando] = useState<Resumen | null>(null);
  const [faltan, setFaltan] = useState("");

  // Cargada: se muestra que quedo asignado y se ofrece cargar otra.
  if (estado.orden) {
    return <Cargada orden={estado.orden} />;
  }

  function revisar() {
    if (detalle.length === 0) {
      setFaltan("Elegí al menos una butaca en el plano.");
      return;
    }

    const datos = new FormData(formulario.current!);
    const leer = (campo: string) => String(datos.get(campo) ?? "").trim();

    const resumen: Resumen = {
      nombre: leer("nombre"),
      apellido: leer("apellido"),
      dni: leer("dni"),
      email: leer("email"),
      celular: leer("celular"),
      medio: leer("medio") as MedioManual,
    };

    // Los seis, no cuatro: el celular y el medio tambien son obligatorios para
    // el backend, y frenarlos acá es mucho mas barato que descubrirlo despues
    // de haber pasado por la pantalla de revision.
    if (Object.values(resumen).some((valor) => !valor)) {
      setFaltan("Faltan datos del comprador.");
      return;
    }

    setFaltan("");
    setRevisando(resumen);
  }

  return (
    <form ref={formulario} action={accion} noValidate>
      {/* Las butacas viajan por acá: el plano es estado del navegador y el
          formulario necesita mandarlas como un campo más. */}
      <input type="hidden" name="asientos" value={ids.join(",")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* Se oculta en la revisión, pero sigue montado: si lo desmontáramos,
            el FormData del submit saldría vacío. */}
        <div className={revisando ? "hidden" : ""}>
          <PlanoSalon
            mesas={mesas}
            elegidos={elegidos}
            onElegir={alternar}
            rotuloElegida="Para esta venta"
            tituloCelular="Elegí la mesa"
            ayudaCelular="Después elegís las sillas dentro de la mesa. Acá no hay máximo."
          />
        </div>

        <aside className={revisando ? "lg:col-span-2" : "lg:sticky lg:top-24"}>
          {revisando && (
            <Revision
              resumen={revisando}
              butacas={detalle}
              precioCentavos={precioCentavos}
              enviando={enviando}
              error={estado.error}
              ocupadas={
                estado.ocupadas
                  ? nombrarButacas(estado.ocupadas, ubicaciones)
                  : ""
              }
              onVolver={() => {
                setRevisando(null);
                // El plano envejece solo: si una butaca se la llevó otro
                // mientras esta pantalla estaba abierta, hay que volver a
                // pedirlo antes de reintentar.
                if (estado.ocupadas?.length) router.refresh();
              }}
            />
          )}

          {/* Se esconde en la revisión, pero sigue montado: por el mismo motivo
              que el plano. Desmontarlo dejaría el FormData del submit sin un
              solo dato del comprador, y el fallo de validación se pintaría en
              una rama que ya no está en pantalla — el botón "Sí, cargar la
              venta" parecería no hacer nada. */}
          <Panel
            titulo="Datos del comprador"
            className={revisando ? "hidden" : ""}
          >
            <div className="space-y-4 p-5">
              {estado.error && <Aviso>{estado.error}</Aviso>}
              {faltan && <Aviso tono="alerta">{faltan}</Aviso>}

              <Campo
                id="nombre"
                name="nombre"
                rotulo="Nombre"
                required
                defaultValue={estado.valores?.nombre}
                error={estado.errores?.nombre?.[0]}
              />
              <Campo
                id="apellido"
                name="apellido"
                rotulo="Apellido"
                required
                defaultValue={estado.valores?.apellido}
                error={estado.errores?.apellido?.[0]}
                ayuda="Con esto se lo busca en la puerta."
              />
              <Campo
                id="dni"
                name="dni"
                rotulo="DNI"
                inputMode="numeric"
                required
                defaultValue={estado.valores?.dni}
                error={estado.errores?.dni?.[0]}
                ayuda="7 u 8 números, sin puntos."
              />
              <Campo
                id="email"
                name="email"
                rotulo="Email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                defaultValue={estado.valores?.email}
                error={estado.errores?.email?.[0]}
                ayuda="Ahí le llega el PDF con las entradas."
              />
              <Campo
                id="celular"
                name="celular"
                rotulo="Celular"
                type="tel"
                inputMode="tel"
                required
                defaultValue={estado.valores?.celular}
                error={estado.errores?.celular?.[0]}
                ayuda="Con característica, sin 0 ni 15."
              />

              <fieldset>
                <legend className="text-sm font-medium text-ink-soft">
                  Cómo se cobró
                </legend>
                <div className="mt-2 flex gap-2">
                  {MEDIOS.map((medio, i) => (
                    <label
                      key={medio}
                      className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-sm border border-line-strong px-3 text-sm text-ink-soft transition-colors duration-200 hover:border-brass has-checked:border-brass has-checked:bg-brass has-checked:font-semibold has-checked:text-carbon"
                    >
                      <input
                        type="radio"
                        name="medio"
                        value={medio}
                        defaultChecked={
                          estado.valores?.medio
                            ? estado.valores.medio === medio
                            : i === 0
                        }
                        className="sr-only"
                      />
                      {MEDIO[medio]}
                    </label>
                  ))}
                </div>
                {estado.errores?.medio?.[0] && (
                  <p className="mt-1.5 text-sm text-error">
                    {estado.errores.medio[0]}
                  </p>
                )}
              </fieldset>

              <div className="border-t border-line pt-4">
                <Dato rotulo="Butacas elegidas">
                  {detalle.length === 0
                    ? "ninguna todavía"
                    : `${detalle.length} · ${precio(detalle.length * precioCentavos)}`}
                </Dato>
              </div>

              <Boton
                type="button"
                onClick={revisar}
                className="w-full"
                disabled={enviando}
              >
                Revisar antes de cargar
              </Boton>

              <p className="text-xs text-ink-faint">
                Acá no hay máximo de butacas ni hace falta que la venta esté
                abierta. El precio sale del evento y no se tipea.
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </form>
  );
}

type Resumen = {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  celular: string;
  medio: MedioManual;
};

/** El paso que no se puede saltear: mirar todo junto antes de que sea final. */
function Revision({
  resumen,
  butacas,
  precioCentavos,
  enviando,
  error,
  ocupadas,
  onVolver,
}: {
  resumen: Resumen;
  butacas: { id: number; mesa: number; silla: number }[];
  precioCentavos: number;
  enviando: boolean;
  error?: string;
  ocupadas: string;
  onVolver: () => void;
}) {
  return (
    <Panel titulo="Revisá antes de cargar">
      <div className="space-y-5 p-5">
        <Aviso tono="alerta" titulo="Esto no se puede deshacer">
          No hay forma de anular una venta cargada a mano. Si algo está mal,
          queda mal.
        </Aviso>

        {error && (
          <Aviso>
            {error}
            {ocupadas && (
              <span className="mt-2 block">
                Ya está tomada: <strong className="text-ink">{ocupadas}</strong>
                . Volvé al plano, refrescalo y elegí otras.
              </span>
            )}
          </Aviso>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Dato rotulo="Comprador">
            {resumen.nombre} {resumen.apellido}
          </Dato>
          <Dato rotulo="DNI">{resumen.dni}</Dato>
          <Dato rotulo="Email">
            <span className="break-all">{resumen.email}</span>
          </Dato>
          <Dato rotulo="Celular">{resumen.celular}</Dato>
          <Dato rotulo="Cobrado por">{MEDIO[resumen.medio]}</Dato>
          <Dato rotulo="Total">
            {precio(butacas.length * precioCentavos)}
          </Dato>
        </div>

        <div>
          <p className="dato">
            {butacas.length} {butacas.length === 1 ? "butaca" : "butacas"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {butacas.map((b) => (
              <li
                key={b.id}
                className="rounded-sm border border-line-strong px-2.5 py-1 text-sm text-ink tabular"
              >
                {ubicacion(b.mesa, b.silla)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Boton type="submit" cargando={enviando} disabled={enviando}>
            {enviando ? "Cargando la venta…" : "Sí, cargar la venta"}
          </Boton>
          <Boton
            type="button"
            tono="secundario"
            onClick={onVolver}
            disabled={enviando}
          >
            Volver a corregir
          </Boton>
        </div>

        <p className="text-xs text-ink-faint">
          El mail con el PDF sale solo. Puede tardar unos segundos.
        </p>
      </div>
    </Panel>
  );
}

/** Lo que quedo asignado, para poder decirselo a la persona en el momento. */
function Cargada({ orden }: { orden: NonNullable<EstadoVenta["orden"]> }) {
  return (
    <Panel titulo="Venta cargada">
      <div className="space-y-5 p-5">
        <Aviso tono="exito" titulo="Listo">
          La orden quedó pagada y las entradas ya se emitieron. El mail con el
          PDF sale solo a {orden.usuario.email}.
        </Aviso>

        <div>
          <p className="dato">Butacas asignadas</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {orden.butacas.map((b) => (
              <li
                key={b.asientoId}
                className="rounded-sm border border-brass/60 px-2.5 py-1 text-sm text-ink tabular"
              >
                {ubicacion(b.mesaNumero, b.numero)}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Dato rotulo="Comprador">
            {orden.usuario.nombre} {orden.usuario.apellido}
          </Dato>
          <Dato rotulo="Total">{precio(orden.totalCentavos)}</Dato>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Link
            href={`/admin/ordenes/${orden.token}`}
            className="inline-flex min-h-11 items-center rounded-sm bg-brass px-5 text-sm font-semibold text-carbon transition-colors duration-200 hover:bg-brass-light"
          >
            Ver la orden
          </Link>
          <Link
            href="/admin/ventas"
            className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-5 text-sm text-ink-soft transition-colors duration-200 hover:border-brass hover:text-ink"
          >
            Ir al historial
          </Link>
        </div>
      </div>
    </Panel>
  );
}
