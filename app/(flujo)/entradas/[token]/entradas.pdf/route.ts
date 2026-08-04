import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { pedirArchivo } from "@/lib/api";
import { esUuid } from "@/lib/consultas";

/**
 * El PDF de las entradas: el mismo archivo que llega adjunto al mail.
 *
 * Existe como route handler y no como un `<a>` al backend porque el navegador
 * no habla con el backend: no sabe donde vive ni tiene por que, y asi tampoco
 * hay que declarar el dominio del front en el CORS del otro lado. Next pide el
 * archivo y lo reenvia tal cual.
 *
 * `?inline=1` lo abre en el visor del navegador en vez de bajarlo. Es la unica
 * diferencia entre los dos casos: el archivo es el mismo.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/entradas/[token]/entradas.pdf">,
) {
  const { token } = await context.params;

  const compra = new URL(`/entradas/${token}`, request.url);

  if (!esUuid(token)) return NextResponse.redirect(compra);

  const inline = request.nextUrl.searchParams.get("inline") === "1";

  let archivo: Response;

  try {
    archivo = await pedirArchivo(
      `/api/ordenes/${encodeURIComponent(token)}/entradas.pdf${inline ? "?inline=true" : ""}`,
    );
  } catch (e) {
    unstable_rethrow(e);

    // El 404 del backend significa que la compra no tiene entradas vigentes:
    // no esta pagada, o se anularon todas. Cualquier otro status es un problema
    // del otro lado. En los dos casos la pantalla de la compra explica mejor lo
    // que pasa que un PDF que no baja, asi que se vuelve ahi con el aviso.
    console.error(`GET /entradas/${token}/entradas.pdf:`, e);

    compra.searchParams.set("pdf", "no");

    return NextResponse.redirect(compra);
  }

  return new NextResponse(archivo.body, {
    headers: {
      "content-type": "application/pdf",
      // El backend ya manda el `attachment` o el `inline` que corresponde, con
      // el nombre del archivo. Se respeta; el de reserva es por si no viniera.
      "content-disposition":
        archivo.headers.get("content-disposition") ??
        (inline ? "inline" : 'attachment; filename="entradas.pdf"'),
      "cache-control": "no-store",
    },
  });
}
