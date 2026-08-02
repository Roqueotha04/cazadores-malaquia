import { MapaSalon } from "@/components/compra/mapa-salon";
import { Pasos } from "@/components/ui/pasos";
import { COLCHON_PAGO_MIN } from "@/lib/constantes";
import { obtenerMapa } from "@/lib/consultas";

/** "1,2,3" → [1, 2, 3], descartando cualquier cosa que no sea un id. */
function leerIds(valor: string | string[] | undefined): number[] {
  if (typeof valor !== "string") return [];

  return [
    ...new Set(
      valor
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ];
}

export default async function Comprar(props: PageProps<"/comprar">) {
  const [mapa, params] = await Promise.all([obtenerMapa(), props.searchParams]);

  const inicial = leerIds(params.asientos).filter((id) =>
    mapa.mesas.some((m) =>
      m.asientos.some((a) => a.id === id && a.estado === "DISPONIBLE"),
    ),
  );

  const libres = mapa.mesas.reduce(
    (total, m) =>
      total + m.asientos.filter((a) => a.estado === "DISPONIBLE").length,
    0,
  );

  const total = mapa.mesas.reduce((suma, m) => suma + m.asientos.length, 0);

  // Un minuto menos del real: ver lib/constantes.ts.
  const minutos = mapa.evento.minutosReserva - COLCHON_PAGO_MIN;

  return (
    /* pb generoso: en el celular la barra fija de abajo tapa contenido. */
    <div className="mx-auto w-full max-w-6xl px-5 py-8 pb-32 lg:pb-16">
      <Pasos actual={1} />

      <header className="mt-8 border-b border-line pb-8">
        <h1>Elegí tus sillas</h1>
        <p className="mt-3 max-w-xl text-lg text-ink-soft">
          Tocá las sillas que querés en el plano. Podés llevar hasta{" "}
          {mapa.evento.maxAsientosPorCompra} por compra, y te las guardamos{" "}
          {minutos} minutos mientras completás tus datos.
        </p>
        <p className="mt-3 text-sm text-ink-faint tabular">
          {libres} sillas libres de {total}
        </p>
      </header>

      <div className="mt-8">
        <MapaSalon mapa={mapa} inicial={inicial} />
      </div>
    </div>
  );
}
