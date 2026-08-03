"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * El armazon del panel: navegacion, barra superior y contenido.
 *
 * Es cliente por una sola razon —el cajon de navegacion del celular y saber que
 * seccion esta abierta— y todo lo que trae datos entra como slot ya renderizado
 * en el servidor. Asi el shell no arrastra ninguna consulta al bundle.
 *
 * La navegacion es de texto, sin iconos. Con seis secciones un set de iconos no
 * agrega lectura y si agrega una familia visual mas que mantener coherente; el
 * rotulo escrito no se malinterpreta.
 */

const SECCIONES = [
  { href: "/admin", nombre: "Tablero" },
  { href: "/admin/puerta", nombre: "Puerta" },
  { href: "/admin/ordenes", nombre: "Órdenes" },
  { href: "/admin/ventas", nombre: "Ventas a mano" },
  { href: "/admin/casos", nombre: "Casos", conBadge: true },
  { href: "/admin/evento", nombre: "Evento" },
] as const;

export function Shell({
  badge,
  cuenta,
  venta,
  children,
}: {
  /** Cuantos casos hay sin resolver. Server Component en Suspense. */
  badge: ReactNode;
  cuenta: ReactNode;
  /** Estado de la venta y su interruptor. */
  venta: ReactNode;
  children: ReactNode;
}) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const botonCajon = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;

    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbierto(false);
        botonCajon.current?.focus();
      }
    }

    document.addEventListener("keydown", alTeclado);
    return () => document.removeEventListener("keydown", alTeclado);
  }, [abierto]);

  return (
    <div className="flex min-h-full flex-1">
      {/* Escritorio: la navegacion siempre a la vista. Superficie mas baja que
          el contenido — es el segundo plano neutro, no compite. */}
      <aside className="hidden w-56 shrink-0 border-r border-line bg-surface-sunken lg:block">
        <div className="sticky top-0 flex h-dvh flex-col">
          <Marca />
          <Navegacion ruta={ruta} badge={badge} />
          <PieNavegacion />
        </div>
      </aside>


      {/* Celular: cajon. `hidden` de verdad cuando esta cerrado, para que el
          tabulador no se meta adentro de una navegacion que no se ve. */}
      {abierto && (
        <div className="fixed inset-0 z-[var(--z-nav)] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar la navegación"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-carbon/70"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface-sunken">
            <Marca />
            {/* Al elegir seccion el cajon se cierra: quedarse abierto arriba de
                la pantalla nueva obliga a un toque de mas en cada salto. */}
            <Navegacion
              ruta={ruta}
              badge={badge}
              alNavegar={() => setAbierto(false)}
            />
            <PieNavegacion />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[var(--z-barra)] flex items-center gap-3 border-b border-line bg-surface-high/95 px-4 py-2.5 backdrop-blur-md sm:px-6">
          <button
            ref={botonCajon}
            type="button"
            onClick={() => setAbierto(true)}
            aria-expanded={abierto}
            aria-label="Abrir la navegación"
            className="-ml-2 flex size-11 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-surface-raised hover:text-ink lg:hidden"
          >
            <span aria-hidden className="space-y-[5px]">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>

          <p className="truncate font-sans text-sm font-semibold text-ink lg:hidden">
            {SECCIONES.find((s) => esActiva(ruta, s.href))?.nombre ?? "Panel"}
          </p>

          {/* Cerrar la venta es lo que se hace con apuro cuando algo va mal:
              vive en la barra, a un toque desde cualquier pantalla. */}
          <div className="ml-auto flex items-center gap-3">
            {venta}
            {cuenta}
          </div>
        </header>

        <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Marca() {
  return (
    <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
      <p className="font-display text-lg leading-none text-ink">Malaquía</p>
    </div>
  );
}

function Navegacion({
  ruta,
  badge,
  alNavegar,
}: {
  ruta: string;
  badge: ReactNode;
  alNavegar?: () => void;
}) {
  return (
    <nav aria-label="Secciones del panel" className="flex-1 overflow-y-auto p-3">
      <ul className="space-y-0.5">
        {SECCIONES.map((seccion) => {
          const activa = esActiva(ruta, seccion.href);

          return (
            <li key={seccion.href}>
              <Link
                href={seccion.href}
                onClick={alNavegar}
                aria-current={activa ? "page" : undefined}
                className={[
                  "flex min-h-11 items-center justify-between gap-2 rounded-sm px-3 text-sm",
                  "transition-colors duration-200",
                  activa
                    ? // El laton marca donde estoy. Es el unico uso que tiene
                      // en la navegacion.
                      "bg-surface-raised font-semibold text-brass"
                    : "text-ink-soft hover:bg-surface-raised hover:text-ink",
                ].join(" ")}
              >
                {seccion.nombre}
                {"conBadge" in seccion && seccion.conBadge && badge}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PieNavegacion() {
  return (
    <div className="shrink-0 border-t border-line p-3">
      <Link
        href="/"
        className="flex min-h-11 items-center rounded-sm px-3 text-sm text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink"
      >
        Ver el sitio
      </Link>
    </div>
  );
}

/** El tablero solo se marca en su ruta exacta; el resto, tambien en sus hijas. */
function esActiva(ruta: string, href: string) {
  return href === "/admin" ? ruta === "/admin" : ruta.startsWith(href);
}
