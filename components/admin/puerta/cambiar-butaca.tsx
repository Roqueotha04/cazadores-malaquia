"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { PlanoSalon } from "@/components/salon/plano-salon";
import { nombrarButacas, useSeleccion } from "@/components/salon/use-seleccion";
import { cambiarButaca } from "@/lib/admin/acciones/puerta";
import { ubicacion } from "@/lib/formato";
import type { Mesa } from "@/lib/tipos";
import { Aviso, Panel } from "../ui/piezas";

/**
 * Mover una entrada a otra silla.
 *
 * Tope de una: no es un carrito, es un cambio de lugar. El plano se encarga de
 * apagar el resto de las sillas apenas hay una elegida.
 *
 * Dos cosas que el panel tiene que explicar y el error del backend no alcanza a
 * decir solo: que el codigo de la entrada no cambia —el UUID que ya viajo por
 * WhatsApp sigue sirviendo— y que intercambiar dos butacas ocupadas entre si
 * falla a proposito, y como se hace igual.
 */
export function CambiarButaca({
  codigo,
  mesas,
  actual,
}: {
  codigo: string;
  mesas: Mesa[];
  actual: { mesa: number; silla: number } | null;
}) {
  const router = useRouter();
  const { elegidos, detalle, ids, ubicaciones, alternar, topeAlcanzado } =
    useSeleccion(mesas, { tope: 1 });

  const [error, setError] = useState("");
  const [ocupadas, setOcupadas] = useState<number[]>([]);
  const [listo, setListo] = useState(false);
  const [enviando, empezar] = useTransition();

  const destino = detalle[0];

  function mover() {
    if (!destino) return;

    setError("");
    setOcupadas([]);

    empezar(async () => {
      const resultado = await cambiarButaca(codigo, ids[0]);

      if (resultado.ok) {
        setListo(true);
        return;
      }

      setError(resultado.error ?? "No pudimos mover la entrada.");
      setOcupadas(resultado.asientosOcupados ?? []);
      // El mapa envejece solo: si la butaca de destino se la llevo otro
      // mientras esta pantalla estaba abierta, hay que volver a pedirlo.
      router.refresh();
    });
  }

  if (listo && destino) {
    return (
      <Panel>
        <div className="p-5">
          <Aviso tono="exito" titulo="Entrada movida">
            Ahora está en{" "}
            <strong className="text-ink">
              {ubicacion(destino.mesa, destino.silla)}
            </strong>
            . El código de la entrada no cambió: el que ya tenga sigue
            sirviendo. Se reenvió el PDF de la orden completa, porque el papel
            impreso dice la butaca vieja.
          </Aviso>
          <div className="mt-4 flex flex-wrap gap-2">
            <Boton onClick={() => router.push("/admin/puerta")}>
              Volver a la puerta
            </Boton>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <PlanoSalon
        mesas={mesas}
        elegidos={elegidos}
        topeAlcanzado={topeAlcanzado}
        onElegir={alternar}
        rotuloElegida="Destino"
        tituloCelular="Elegí la mesa de destino"
        ayudaCelular="Después elegís la silla dentro de la mesa."
        aviso={
          topeAlcanzado
            ? "Ya elegiste el destino. Tocá esa silla de nuevo para cambiarlo."
            : ""
        }
      />

      <aside className="lg:sticky lg:top-24">
        <Panel titulo="El cambio">
          <div className="space-y-4 p-5">
            <div>
              <p className="dato">Desde</p>
              <p className="mt-1 text-ink">
                {actual
                  ? ubicacion(actual.mesa, actual.silla)
                  : "La butaca que tiene hoy"}
              </p>
            </div>

            <div>
              <p className="dato">Hacia</p>
              <p className="mt-1 text-ink">
                {destino ? (
                  ubicacion(destino.mesa, destino.silla)
                ) : (
                  <span className="text-ink-faint">
                    Elegí una silla en el plano
                  </span>
                )}
              </p>
            </div>

            {error && (
              <Aviso>
                {error}
                {ocupadas.length > 0 && (
                  <>
                    {" "}
                    <span className="block mt-2">
                      Ya está tomada:{" "}
                      <strong className="text-ink">
                        {nombrarButacas(ocupadas, ubicaciones)}
                      </strong>
                      . Refrescamos el plano; elegí otra.
                    </span>
                  </>
                )}
              </Aviso>
            )}

            <Boton
              onClick={mover}
              disabled={!destino || enviando}
              cargando={enviando}
              className="w-full"
            >
              {enviando ? "Moviendo…" : "Mover la entrada"}
            </Boton>

            <p className="text-xs text-ink-faint">
              El código de la entrada no cambia. Se reenvía el PDF de la orden
              completa, así que puede tardar unos segundos.
            </p>
          </div>

          <div className="border-t border-line px-5 py-4">
            <p className="text-xs text-ink-faint">
              <strong className="text-ink-soft">
                Intercambiar dos butacas ocupadas entre sí no se puede.
              </strong>{" "}
              Hay que mover una a una silla libre primero, y después completar
              el cambio.
            </p>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
