"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { PlanoSalon } from "@/components/salon/plano-salon";
import { nombrarButacas, useSeleccion } from "@/components/salon/use-seleccion";
import { reubicarCaso, resolverCaso } from "@/lib/admin/acciones/casos";
import { LARGO_NOTA } from "@/lib/admin/validacion";
import { ubicacion } from "@/lib/formato";
import type { Mesa } from "@/lib/tipos";
import { AreaTexto } from "../ui/campos";
import { Aviso, Panel } from "../ui/piezas";

/**
 * Reubicar a alguien que pago y quedo mal sentado.
 *
 * Mueve la orden **entera**: suelta todo lo que tiene y vuelve a tomar el total
 * que pago. Por eso se eligen todas sus butacas, no las que faltan — mandar solo
 * las nuevas da 422. Sirve para los cuatro tipos de caso.
 *
 * La cantidad tiene que ser exactamente la que la orden pago y ese numero **no
 * viaja en el body**: lo deriva el backend del cobro. `esperadas` es la misma
 * cuenta hecha de este lado y se muestra como pista, pero **no bloquea**: en
 * `MONTO_DISTINTO` el importe cobrado no coincide con el precio, la cuenta no
 * cierra y un boton apagado dejaria el caso sin salida a las once de la noche.
 * La verdad la dice el 422, que informa cuantas pago y cuantas se mandaron, y
 * ese mensaje se muestra tal cual.
 */
export function Reubicar({
  id,
  mesas,
  esperadas,
}: {
  id: number;
  mesas: Mesa[];
  esperadas: number;
}) {
  const router = useRouter();
  const { elegidos, detalle, ids, ubicaciones, alternar } = useSeleccion(mesas);

  const [error, setError] = useState("");
  const [ocupadas, setOcupadas] = useState<number[]>([]);
  const [listo, setListo] = useState(false);
  const [enviando, empezar] = useTransition();

  const faltan = esperadas - detalle.length;

  function reubicar() {
    setError("");
    setOcupadas([]);

    empezar(async () => {
      const resultado = await reubicarCaso(id, ids);

      if (resultado.ok) {
        setListo(true);
        return;
      }

      setError(resultado.error ?? "No pudimos reubicar la compra.");
      setOcupadas(resultado.asientosOcupados ?? []);
      // El plano envejece solo. Despues de un 409 por butacas tomadas hay que
      // volver a pedirlo antes de reintentar.
      router.refresh();
    });
  }

  if (listo) {
    return (
      <Panel titulo="Reubicada">
        <div className="p-5">
          <Aviso tono="exito" titulo="Caso cerrado">
            Se tomaron las butacas nuevas y salió el mail con el PDF. El caso
            quedó resuelto.
          </Aviso>
          {/* Se reemite la orden completa, no solo lo que se movio: cualquier
              PDF que esta persona ya tenga bajado dejo de servir. Si llega a la
              puerta con el viejo, no entra. */}
          <p className="mt-4 max-w-[65ch] text-sm text-ink-soft">
            <strong className="font-semibold text-ink">
              Se emitieron códigos nuevos para todas las entradas
            </strong>
            , incluso las que no se movieron. Los códigos viejos ya no sirven: si
            esta persona bajó el PDF antes, tiene que volver a bajarlo o usar el
            mail que le acaba de llegar.
          </p>
          <div className="mt-4">
            <Boton onClick={() => router.push("/admin/casos")}>
              Volver a la cola
            </Boton>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <Panel titulo="Elegir las butacas nuevas">
        <div className="p-5">
          <p className="max-w-[65ch] text-sm text-ink-soft">
            Van <strong className="text-ink">todas</strong> las butacas de la
            compra, no las que faltan: la orden se mueve entera. Tienen que ser{" "}
            <strong className="text-ink">
              {esperadas} {esperadas === 1 ? "butaca" : "butacas"}
            </strong>
            , que es lo que esta persona pagó. Si no coincide, el servidor lo
            rechaza y avisa cuántas eran.
          </p>

          <div className="mt-4">
            <PlanoSalon
              mesas={mesas}
              elegidos={elegidos}
              topeAlcanzado={false}
              onElegir={alternar}
              rotuloElegida="Butaca nueva"
              tituloCelular="Elegí la mesa"
              ayudaCelular="Después elegís las sillas dentro de la mesa."
              aviso={
                faltan < 0
                  ? `Van ${detalle.length} y esta compra pagó ${esperadas}. Revisá antes de enviar.`
                  : ""
              }
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-line p-5">
          {error && (
            <Aviso>
              {error}
              {ocupadas.length > 0 && (
                <span className="mt-2 block">
                  Ya está tomada:{" "}
                  <strong className="text-ink">
                    {nombrarButacas(ocupadas, ubicaciones)}
                  </strong>
                  . Refrescamos el plano; elegí otra.
                </span>
              )}
            </Aviso>
          )}

          {detalle.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {detalle.map((b) => (
                <li
                  key={b.id}
                  className="rounded-sm border border-brass/60 px-2.5 py-1 text-sm text-ink tabular"
                >
                  {ubicacion(b.mesa, b.silla)}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Solo se exige haber elegido algo. La cantidad exacta la valida el
                backend contra el cobro: si `esperadas` sale mal —el caso de
                MONTO_DISTINTO— un boton apagado dejaria el caso trabado sin
                forma de cerrarlo desde el panel. */}
            <Boton
              onClick={reubicar}
              disabled={detalle.length === 0 || enviando}
              cargando={enviando}
            >
              {enviando ? "Reubicando…" : "Reubicar y cerrar el caso"}
            </Boton>

            <p className="text-sm text-ink-soft tabular">
              {faltan > 0
                ? `Faltan ${faltan} de ${esperadas}`
                : faltan < 0
                  ? `${detalle.length} elegidas, pagó ${esperadas}`
                  : `${esperadas} de ${esperadas} elegidas`}
            </p>
          </div>

          <p className="text-xs text-ink-faint">
            Suelta las butacas que tenga, toma las nuevas, emite entradas con
            códigos nuevos —todas, no solo las que se mueven— y manda el mail.
            Puede tardar unos segundos. Si alguien de esta compra ya pasó por la
            puerta no se puede: esa persona está adentro y no se la mueve.
          </p>
        </div>
      </Panel>
    </div>
  );
}

/**
 * Cerrar el caso sin reubicar.
 *
 * La nota es obligatoria: un caso resuelto sin decir que paso no se puede
 * reconstruir despues, y reconstruirlo es justo para lo que existe la tabla.
 */
export function Resolver({ id }: { id: number }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [enviando, empezar] = useTransition();

  const restantes = LARGO_NOTA - nota.length;

  function resolver() {
    setError("");

    empezar(async () => {
      const resultado = await resolverCaso(id, nota);

      if (resultado.ok) {
        router.push("/admin/casos");
        return;
      }

      setError(resultado.error ?? "No pudimos cerrar el caso.");
    });
  }

  if (!abierto) {
    return (
      <Boton tono="secundario" medida="chico" onClick={() => setAbierto(true)}>
        Cerrar sin reubicar
      </Boton>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Aviso>{error}</Aviso>}

      <AreaTexto
        id="nota"
        rotulo="Qué se hizo"
        required
        maxLength={LARGO_NOTA}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        error={
          restantes < 0 ? `Te pasaste por ${Math.abs(restantes)}` : undefined
        }
        ayuda={`Se agrega al detalle del caso, no lo pisa. Quedan ${restantes} caracteres.`}
        placeholder="Se lo reubicó en la mesa 9 por teléfono"
      />

      <div className="flex flex-wrap gap-2">
        <Boton
          medida="chico"
          onClick={resolver}
          disabled={enviando || nota.trim().length === 0 || restantes < 0}
          cargando={enviando}
        >
          {enviando ? "Cerrando…" : "Cerrar el caso"}
        </Boton>
        <Boton
          tono="fantasma"
          medida="chico"
          onClick={() => setAbierto(false)}
          disabled={enviando}
        >
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
