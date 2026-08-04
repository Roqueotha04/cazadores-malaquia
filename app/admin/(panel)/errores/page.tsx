import Link from "next/link";
import { obtenerErrores } from "@/lib/admin/consultas";
import { Refresco } from "@/components/admin/ui/refresco";
import { FichaError } from "@/components/admin/errores/ficha-error";
import { Encabezado, Panel, Vacio } from "@/components/admin/ui/piezas";

export const metadata = { title: "Errores" };

/**
 * Lo que se rompio del lado del servidor y necesita una mano.
 *
 * No es la cola de casos: un caso es alguien que pago y quedo mal sentado, y se
 * arregla desde la app. Acá no hay nada que arreglar desde el panel — la plata
 * se devuelve por fuera y el mail se reenvia desde la orden. Lo unico que se
 * hace es marcar que alguien ya se ocupo.
 *
 * La lista llega **ya ordenada**: urgentes arriba y, dentro de cada gravedad, lo
 * mas nuevo primero. No se reordena de este lado.
 */
export default async function ErroresPage({
  searchParams,
}: {
  searchParams: Promise<{ todos?: string }>;
}) {
  const { todos } = await searchParams;
  const soloPendientes = todos !== "1";

  const errores = await obtenerErrores(soloPendientes);

  const urgentes = errores.filter(
    (error) => error.gravedad === "URGENTE" && error.atendidoEl === null,
  ).length;

  return (
    <>
      <Encabezado
        titulo="Errores"
        bajada="Cobros que quedaron mal y mails que no salieron. Los anota el sistema solo. Nada de esto se arregla desde acá: la plata se devuelve a mano y el mail se reenvía desde la orden."
      >
        <Refresco cada={120} />
      </Encabezado>

      {urgentes > 0 && (
        <p className="rounded-sm border border-error/40 bg-error/10 px-4 py-3.5 text-sm text-ink-soft">
          <strong className="font-semibold text-ink">
            {urgentes === 1
              ? "Hay 1 error urgente"
              : `Hay ${urgentes} errores urgentes`}
          </strong>
          . Los de cobro son plata que hay que devolver a mano; los de mail son
          gente que pagó y no tiene sus entradas.
        </p>
      )}

      <Filtro soloPendientes={soloPendientes} />

      {errores.length === 0 ? (
        <Panel>
          <Vacio
            titulo={
              soloPendientes ? "No hay errores pendientes" : "No hay errores"
            }
          >
            {soloPendientes
              ? "Esto es lo que se espera ver: quiere decir que ningún cobro quedó mal contado y que todos los mails salieron. Si algo falla, aparece acá solo."
              : "El sistema no anotó ningún error todavía."}
          </Vacio>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {errores.map((error) => (
            <FichaError key={error.id} error={error} />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Pendientes o todos.
 *
 * Dos links y no chips de cliente: son dos estados, la pantalla se renderiza
 * entera en el servidor y asi el filtro funciona sin JavaScript.
 */
function Filtro({ soloPendientes }: { soloPendientes: boolean }) {
  const opciones = [
    { href: "/admin/errores", texto: "Pendientes", activa: soloPendientes },
    { href: "/admin/errores?todos=1", texto: "Todos", activa: !soloPendientes },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((opcion) => (
        <Link
          key={opcion.href}
          href={opcion.href}
          aria-current={opcion.activa ? "page" : undefined}
          className={[
            "inline-flex min-h-11 items-center rounded-sm border px-4 text-sm transition-colors duration-200",
            opcion.activa
              ? "border-brass bg-brass font-semibold text-carbon"
              : "border-line-strong text-ink-soft hover:border-brass hover:text-ink",
          ].join(" ")}
        >
          {opcion.texto}
        </Link>
      ))}
    </div>
  );
}
