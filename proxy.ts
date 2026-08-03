import { NextResponse, type NextRequest } from "next/server";
import { COOKIE } from "@/lib/admin/sesion";

/**
 * Chequeo optimista de la sesion del panel.
 *
 * En Next 16 el middleware se llama Proxy. Corre antes de renderizar, asi que
 * evita pintar medio panel para despues mandar al login — pero **no es la
 * seguridad**: aca solo se mira si la cookie existe, no si el token sirve. Eso
 * lo decide el backend en cada llamada, a traves de `lib/admin/api.ts`, que es
 * donde el chequeo esta pegado al dato.
 *
 * Nada de validar contra el backend aca: esto corre tambien en las rutas que el
 * navegador precarga al pasar el mouse por un link.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const tieneSesion = request.cookies.has(COOKIE);

  // `/admin/salir` borra la cookie: si le pidieramos sesion no se podria salir
  // nunca de una sesion rota, que es justo para lo que esta.
  if (pathname === "/admin/salir") return NextResponse.next();

  if (pathname === "/admin/login") {
    if (tieneSesion) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.next();
  }

  if (!tieneSesion) {
    const login = new URL("/admin/login", request.url);

    // A donde volver despues de entrar: quien abrio el link de un caso puntual
    // no tiene por que aparecer en el tablero.
    if (pathname !== "/admin") {
      login.searchParams.set("volver", `${pathname}${search}`);
    }

    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Solo el panel. El sitio de venta no pasa por aca.
  matcher: ["/admin", "/admin/:path*"],
};
