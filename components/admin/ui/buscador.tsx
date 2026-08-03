"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { campo } from "@/components/ui/clases";

/**
 * Un campo de busqueda que vive en la URL.
 *
 * El estado va al querystring y no adentro del componente por tres cosas que se
 * ganan gratis: la pantalla se puede pasar por WhatsApp con la busqueda hecha,
 * el boton de atras del navegador vuelve a la busqueda anterior, y el resultado
 * lo arma el servidor —que es el unico que tiene el token para preguntarle al
 * backend.
 *
 * La espera antes de buscar no es cosmetica: sin ella cada letra tipeada es un
 * viaje al backend, y en la puerta se tipean apellidos enteros.
 */
export function Buscador({
  parametro = "q",
  rotulo,
  ayuda,
  espera = 350,
  autoFocus = false,
}: {
  parametro?: string;
  rotulo: string;
  ayuda?: string;
  espera?: number;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [buscando, empezar] = useTransition();

  const [texto, setTexto] = useState(() => parametros.get(parametro) ?? "");

  useEffect(() => {
    const actual = parametros.get(parametro) ?? "";

    // Ya estamos donde queremos: sin esto, la navegacion que dispara la propia
    // busqueda volveria a disparar otra.
    if (texto === actual) return;

    const id = setTimeout(() => {
      const siguientes = new URLSearchParams(parametros);

      if (texto.trim()) siguientes.set(parametro, texto.trim());
      else siguientes.delete(parametro);

      const consulta = siguientes.toString();

      // `replace` y no `push`: cada letra no tiene por que ser una parada del
      // boton de atras.
      empezar(() => router.replace(`${ruta}${consulta ? `?${consulta}` : ""}`));
    }, espera);

    return () => clearTimeout(id);
  }, [texto, parametro, parametros, ruta, router, espera]);

  return (
    <div>
      <label htmlFor="buscador" className="text-sm font-medium text-ink-soft">
        {rotulo}
      </label>
      <div className="relative">
        <input
          id="buscador"
          type="search"
          value={texto}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => setTexto(e.target.value)}
          aria-describedby={ayuda ? "buscador-ayuda" : undefined}
          className={campo(false)}
        />
        {buscando && (
          <span
            aria-hidden
            className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-ink-faint border-t-transparent motion-reduce:animate-none"
          />
        )}
      </div>
      {ayuda && (
        <p id="buscador-ayuda" className="mt-1.5 text-xs text-ink-faint">
          {ayuda}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {buscando ? "Buscando" : ""}
      </p>
    </div>
  );
}

/**
 * Filtro de una sola eleccion, tambien en la URL.
 *
 * Chips y no un desplegable: son cuatro estados fijos, se ven todos a la vez y
 * cual esta activo se lee sin abrir nada.
 */
export function Chips({
  parametro,
  rotulo,
  opciones,
}: {
  parametro: string;
  rotulo: string;
  opciones: { valor: string; texto: string }[];
}) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const actual = parametros.get(parametro) ?? "";

  function elegir(valor: string) {
    const siguientes = new URLSearchParams(parametros);

    if (valor) siguientes.set(parametro, valor);
    else siguientes.delete(parametro);

    const consulta = siguientes.toString();
    router.replace(`${ruta}${consulta ? `?${consulta}` : ""}`);
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink-soft">{rotulo}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[{ valor: "", texto: "Todas" }, ...opciones].map((opcion) => {
          const activa = actual === opcion.valor;

          return (
            <button
              key={opcion.valor || "todas"}
              type="button"
              onClick={() => elegir(opcion.valor)}
              aria-pressed={activa}
              className={[
                "min-h-11 rounded-sm border px-4 text-sm transition-colors duration-200",
                activa
                  ? "border-brass bg-brass text-carbon font-semibold"
                  : "border-line-strong text-ink-soft hover:border-brass hover:text-ink",
              ].join(" ")}
            >
              {opcion.texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}
