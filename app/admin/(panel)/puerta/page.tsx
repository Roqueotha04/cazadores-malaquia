import { Suspense } from "react";
import {
  TOPE_INVITADOS,
  buscarInvitados,
  obtenerResumen,
} from "@/lib/admin/consultas";
import { Buscador } from "@/components/admin/ui/buscador";
import { FichaInvitado } from "@/components/admin/puerta/ficha-invitado";
import { Refresco } from "@/components/admin/ui/refresco";
import {
  BarraApilada,
  Encabezado,
  Panel,
  Vacio,
} from "@/components/admin/ui/piezas";

export const metadata = { title: "Puerta" };

/**
 * La pantalla de la puerta del salon.
 *
 * Un solo campo, que acepta DNI, apellido o numero de butaca: quien atiende no
 * tiene que decidir cual de los tres le estan diciendo, lo resuelve el backend.
 * Con el campo vacio no se busca nada.
 *
 * Pensada para el celular antes que para el escritorio, que es al reves del
 * resto del panel: acá se usa de pie, con alguien esperando adelante.
 */
export default async function PuertaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <>
      <Encabezado
        titulo="Puerta"
        bajada="Buscá por DNI, apellido o número de butaca y validá la entrada. Mirá siempre si alguna aparece anulada."
      />

      <Suspense fallback={null}>
        <Recuento />
      </Suspense>

      <Panel>
        <div className="p-4 sm:p-5">
          <Suspense fallback={null}>
            <Buscador
              rotulo="DNI, apellido o butaca"
              ayuda="Un número de 1 a 4 dígitos busca por butaca. Se muestran hasta 20 personas: si aparecen muchas, escribí dos letras más."
              autoFocus
            />
          </Suspense>
        </div>
      </Panel>

      <Suspense key={q ?? ""} fallback={<Cargando />}>
        <Resultados q={q ?? ""} />
      </Suspense>
    </>
  );
}

/**
 * Cuanta gente entro, la noche del evento.
 *
 * Es la unica cifra de la pantalla y va arriba de todo: la puerta pasa la noche
 * en esta pantalla y la pregunta que le hacen desde adentro del salon es siempre
 * la misma —cuantos faltan—. Sin esto hay que ir al tablero y volver.
 *
 * Se refresca sola cada dos minutos, y validar una entrada la actualiza en el
 * acto: `validarEntrada` llama a `refresh()`. Dos minutos y no uno porque nadie
 * mira el numero fijo, se lo consulta cada tanto.
 */
async function Recuento() {
  const { butacas } = await obtenerResumen();

  const entraron = butacas.entradasUsadas;
  const faltan = Math.max(butacas.vendidas - entraron, 0);
  const porcentaje =
    butacas.vendidas > 0 ? Math.round((entraron / butacas.vendidas) * 100) : 0;

  return (
    <Panel
      titulo="Cuánta gente entró"
      acciones={<Refresco cada={120} />}
    >
      <div className="p-5">
        <p className="font-display text-4xl text-ink tabular">
          {entraron}
          <span className="text-2xl text-ink-faint"> / {butacas.vendidas}</span>
        </p>
        <p className="mt-1 text-sm text-ink-soft tabular">
          {porcentaje}% de las entradas emitidas · faltan {faltan}
        </p>

        <div className="mt-5">
          <BarraApilada
            total={butacas.vendidas}
            tramos={[
              { rotulo: "Entraron", valor: entraron, clase: "bg-brass" },
              { rotulo: "Faltan", valor: faltan, clase: "bg-surface-high" },
            ]}
          />
        </div>

        {/* Una anulada no esta ni adentro ni por venir: su butaca ya volvio a la
            venta. Sale del recuento a proposito, pero se dice, porque si no la
            cuenta de arriba no cierra contra el tablero. */}
        {butacas.entradasAnuladas > 0 && (
          <p className="mt-4 border-t border-line pt-4 text-xs text-ink-faint">
            {butacas.entradasAnuladas}{" "}
            {butacas.entradasAnuladas === 1
              ? "entrada anulada, que no"
              : "entradas anuladas, que no"}{" "}
            {butacas.entradasAnuladas === 1 ? "cuenta" : "cuentan"} en este
            total: esas butacas ya no dan derecho a entrar.
          </p>
        )}
      </div>
    </Panel>
  );
}

async function Resultados({ q }: { q: string }) {
  if (!q.trim()) {
    return (
      <Panel>
        <Vacio titulo="Escribí para buscar">
          Un DNI, un apellido o el número de la butaca alcanza. La lista trae
          también las entradas anuladas, tachadas: son las que ya no dan derecho
          a entrar.
        </Vacio>
      </Panel>
    );
  }

  const invitados = await buscarInvitados(q);

  if (invitados.length === 0) {
    return (
      <Panel>
        <Vacio titulo={`Nadie coincide con «${q}»`}>
          Probá con el DNI sin puntos, con el apellido solo, o con el número de
          la butaca. Si buscaste por butaca y no aparece nadie, esa silla está
          libre. Si igual no aparece, puede estar cargado con otro apellido: se
          corrige desde la orden.
        </Vacio>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {invitados.length >= TOPE_INVITADOS && (
        <p className="rounded-sm border border-alerta/40 bg-alerta/10 px-4 py-2.5 text-sm text-alerta">
          Son {TOPE_INVITADOS} resultados, el máximo que devuelve la búsqueda.
          Puede haber más gente que coincida: escribí dos letras más.
        </p>
      )}

      {invitados.map((invitado) => (
        <FichaInvitado key={invitado.dni} invitado={invitado} />
      ))}
    </div>
  );
}

function Cargando() {
  return (
    <Panel>
      <div className="space-y-3 p-5">
        <span className="block h-5 w-48 rounded-sm bg-surface-high" />
        <span className="block h-4 w-32 rounded-sm bg-surface-high" />
        <span className="block h-11 w-full rounded-sm bg-surface-high" />
      </div>
      <p className="sr-only" aria-live="polite">
        Buscando
      </p>
    </Panel>
  );
}
