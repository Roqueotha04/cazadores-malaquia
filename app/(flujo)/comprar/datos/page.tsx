import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioDatos } from "@/components/compra/formulario-datos";
import { Pasos } from "@/components/ui/pasos";
import { BotonLink } from "@/components/ui/boton";
import { obtenerAsientosElegidos, obtenerEvento } from "@/lib/consultas";
import { precio, ubicacion } from "@/lib/formato";

export default async function Datos(props: PageProps<"/comprar/datos">) {
  const params = await props.searchParams;

  const pedidos = String(params.asientos ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  if (pedidos.length === 0) redirect("/comprar");

  const [evento, asientos] = await Promise.all([
    obtenerEvento(),
    obtenerAsientosElegidos(pedidos),
  ]);

  // Ids que no existen en el salón: alguien escribió la url a mano.
  if (asientos.length === 0) redirect("/comprar");

  // Si mientras completaba los datos alguien se llevó una silla, se lo decimos
  // acá y no después de que cargue todo el formulario.
  const ocupadas = asientos.filter((a) => a.estado !== "DISPONIBLE");
  const libres = asientos.filter((a) => a.estado === "DISPONIBLE");
  const total = asientos.length * evento.precioCentavos;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      <Pasos actual={2} />

      <header className="mt-8 border-b border-line pb-8">
        <Link
          href={`/comprar?asientos=${pedidos.join(",")}`}
          className="group inline-flex min-h-[44px] items-center text-sm text-ink-faint transition-colors duration-200 ease-[var(--ease-salida)] hover:text-brass"
        >
          <span
            aria-hidden
            className="mr-1.5 transition-transform duration-200 ease-[var(--ease-salida)] group-hover:-translate-x-1"
          >
            ←
          </span>
          Volver al plano
        </Link>

        <h1 className="mt-2">Tus datos</h1>
        <p className="mt-3 max-w-xl text-lg text-ink-soft">
          Con estos datos emitimos las entradas y controlamos el ingreso al
          salón.
        </p>
      </header>

      {/* El resumen va primero en el DOM y termina en la columna derecha en
          escritorio: en el celular, si queda abajo, hay que pasar los cinco
          campos y el checkbox para ver qué se está comprando. Lo que se
          confirma antes de dar el DNI no puede estar despues del formulario. */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-14">
        <aside className="rounded-sm border border-line bg-surface-raised lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-ink">Tu selección</h2>
          </div>

          <div className="px-5 py-4">
            <ul className="space-y-1.5">
              {asientos.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-center justify-between gap-2 rounded-sm px-3 py-2.5 text-sm font-medium tabular ${
                    a.estado === "DISPONIBLE"
                      ? "bg-surface-sunken text-ink"
                      : "bg-surface-sunken text-ink-faint line-through"
                  }`}
                >
                  {ubicacion(a.mesa, a.silla)}
                  {a.estado !== "DISPONIBLE" && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-alerta no-underline">
                      Tomada
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="dato">Sillas</dt>
                <dd className="text-sm text-ink tabular">{asientos.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="dato">Precio por silla</dt>
                <dd className="text-sm text-ink tabular">
                  {precio(evento.precioCentavos)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <dt className="dato">Total</dt>
                <dd className="font-display text-2xl text-ink tabular">
                  {precio(total)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="max-w-xl lg:col-start-1 lg:row-start-1">
          {ocupadas.length > 0 ? (
            <div
              role="alert"
              className="rounded-sm border border-alerta/50 bg-alerta/10 px-5 py-5"
            >
              <h2 className="text-ink">Alguien se adelantó</h2>
              <p className="mt-2 text-ink-soft">
                Se llevaron{" "}
                {ocupadas.length === 1
                  ? "una de las sillas"
                  : `${ocupadas.length} de las sillas`}{" "}
                que habías elegido:
              </p>

              <ul className="mt-4 space-y-1.5">
                {ocupadas.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-sm bg-surface-sunken px-3 py-2 text-sm font-medium tabular"
                  >
                    {ubicacion(a.mesa, a.silla)}
                  </li>
                ))}
              </ul>

              <BotonLink
                href={`/comprar?asientos=${libres.map((a) => a.id).join(",")}`}
                className="mt-6 w-full sm:w-auto"
              >
                Volver al plano y elegir otras
              </BotonLink>

              {libres.length > 0 && (
                <p className="mt-3 text-sm text-ink-faint">
                  Te guardamos las {libres.length} que sí conseguiste.
                </p>
              )}
            </div>
          ) : (
            <FormularioDatos
              asientos={asientos.map((a) => a.id)}
              minutosReserva={evento.minutosReserva}
            />
          )}
        </div>
      </div>
    </div>
  );
}
