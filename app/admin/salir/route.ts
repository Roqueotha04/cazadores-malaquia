import { NextResponse, type NextRequest } from "next/server";
import { borrarSesion } from "@/lib/admin/sesion";

/**
 * Cerrar sesion.
 *
 * Existe como route handler y no solo como accion porque hay un caso que la
 * accion no cubre: cuando el backend contesta 401 en medio de un render, ahi no
 * se puede escribir una cookie. Sin este paso la cookie vencida quedaria puesta,
 * el proxy la veria y rebotaria de vuelta al panel — un rulo entre el login y el
 * tablero. Por eso `lib/admin/api.ts` manda aca y no directo al login.
 *
 * `vencida=1` lo agrega ese camino, para poder decir por que se corto la sesion
 * en vez de mostrar un login mudo.
 */
export async function GET(request: NextRequest) {
  await borrarSesion();

  const login = new URL("/admin/login", request.url);

  if (request.nextUrl.searchParams.get("vencida") === "1") {
    login.searchParams.set("vencida", "1");
  }

  return NextResponse.redirect(login);
}
