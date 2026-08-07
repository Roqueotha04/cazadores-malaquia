import Link from "next/link";
import { obtenerMapa } from "@/lib/consultas";
import { requerirSesion } from "@/lib/admin/sesion";
import { CambiarButaca } from "@/components/admin/entradas/cambiar-butaca";
import { Encabezado } from "@/components/admin/ui/piezas";

export const metadata = { title: "Cambiar butaca" };

/**
 * Mover una entrada emitida a otra silla.
 *
 * Pantalla propia y no un panel adentro de la lista: el plano del salon necesita
 * el ancho entero, y quien esta haciendo este cambio no esta en la puerta
 * atendiendo la fila.
 *
 * De que butaca sale lo lee el backend por el codigo; acá solo se elige el
 * destino. La ubicacion actual se muestra si el mapa la conoce, pero no es un
 * dato que el cambio necesite.
 */
export default async function CambiarButacaPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ mesa?: string; silla?: string; q?: string }>;
}) {
  await requerirSesion();

  const [{ codigo }, { mesa, silla, q }, mapa] = await Promise.all([
    params,
    searchParams,
    obtenerMapa(),
  ]);

  // Los trae el link de la fila de Entradas, para poder mostrar "desde". Si no
  // vienen, la pantalla funciona igual: el backend sabe de donde sale.
  const actual =
    mesa && silla ? { mesa: Number(mesa), silla: Number(silla) } : null;

  // Con la busqueda que estaba escrita, volver deja la lista como estaba.
  const volver = q?.trim()
    ? `/admin/entradas?q=${encodeURIComponent(q.trim())}`
    : "/admin/entradas";

  return (
    <>
      <Encabezado
        titulo="Cambiar butaca"
        bajada={
          <Link href={volver} className="subrayado-vivo">
            ← Volver a las entradas
          </Link>
        }
      />

      <CambiarButaca
        codigo={codigo}
        mesas={mapa.mesas}
        volver={volver}
        actual={
          actual && Number.isFinite(actual.mesa) && Number.isFinite(actual.silla)
            ? actual
            : null
        }
      />
    </>
  );
}
