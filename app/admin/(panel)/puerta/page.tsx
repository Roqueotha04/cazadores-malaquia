import { Suspense } from "react";
import { TOPE_INVITADOS, buscarInvitados } from "@/lib/admin/consultas";
import { Buscador } from "@/components/admin/ui/buscador";
import { FichaInvitado } from "@/components/admin/puerta/ficha-invitado";
import { Encabezado, Panel, Vacio } from "@/components/admin/ui/piezas";

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
