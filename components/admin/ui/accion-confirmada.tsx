"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Boton } from "@/components/ui/boton";
import { Aviso } from "./piezas";

/**
 * Un boton que antes de hacer algo pregunta, en el lugar.
 *
 * Sin dialogo modal: la pregunta se abre debajo del boton, con el contexto a la
 * vista. Un modal para "¿anulás esta entrada?" tapa justamente el dato que hay
 * que mirar para contestar —de quien es la entrada, que mesa— y obliga a
 * confiar en la memoria de dos segundos atras.
 *
 * Sirve para lo que no se puede deshacer o cuesta caro deshacer: anular una
 * entrada, cerrar la venta, tomar un caso.
 */
export function AccionConfirmada({
  etiqueta,
  pregunta,
  confirmar = "Sí, confirmar",
  tono = "secundario",
  medida = "chico",
  accion,
  deshabilitada = false,
  flotante = false,
}: {
  etiqueta: string;
  pregunta: ReactNode;
  confirmar?: string;
  tono?: "principal" | "secundario" | "fantasma";
  medida?: "base" | "chico";
  /** Nunca lanza: devuelve el error como valor, igual que el resto. */
  accion: () => Promise<{ ok: boolean; error?: string }>;
  deshabilitada?: boolean;
  /**
   * La pregunta sale flotando en vez de empujar lo de abajo.
   *
   * Es para la barra superior: ahi la confirmacion en linea estiraria la barra
   * fija y correria la pantalla entera hacia abajo. En una fila o una ficha,
   * empujar esta bien y es preferible — no tapa nada.
   */
  flotante?: boolean;
}) {
  const [preguntando, setPreguntando] = useState(false);
  const [error, setError] = useState("");
  const [trabajando, empezar] = useTransition();
  const disparador = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!preguntando || !flotante) return;

    function alTeclado(e: KeyboardEvent) {
      if (e.key !== "Escape") return;

      setPreguntando(false);
      disparador.current?.focus();
    }

    document.addEventListener("keydown", alTeclado);
    return () => document.removeEventListener("keydown", alTeclado);
  }, [preguntando, flotante]);

  function ejecutar() {
    setError("");

    empezar(async () => {
      const resultado = await accion();

      if (!resultado.ok) {
        // El mensaje del backend se muestra tal cual: esta escrito para leerse.
        setError(resultado.error ?? "No pudimos completar la operación.");
        return;
      }

      setPreguntando(false);
    });
  }

  function cancelar() {
    setPreguntando(false);
    setError("");
  }

  const cuerpo = (
    <>
      <div className="text-sm text-ink-soft">{pregunta}</div>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex flex-wrap gap-2">
        <Boton
          medida={medida}
          onClick={ejecutar}
          cargando={trabajando}
          disabled={trabajando}
        >
          {trabajando ? "Un momento…" : confirmar}
        </Boton>
        <Boton
          tono="fantasma"
          medida={medida}
          onClick={cancelar}
          disabled={trabajando}
        >
          Cancelar
        </Boton>
      </div>
    </>
  );

  if (flotante) {
    return (
      <div className="relative">
        <Boton
          ref={disparador}
          tono={tono}
          medida={medida}
          disabled={deshabilitada}
          aria-expanded={preguntando}
          onClick={() => setPreguntando((abierto) => !abierto)}
        >
          {etiqueta}
        </Boton>

        {preguntando && (
          <div className="absolute top-[calc(100%+0.5rem)] right-0 z-[var(--z-modal)] w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-sm border border-brass/50 bg-surface-high p-4 shadow-[0_16px_40px_-16px_var(--color-carbon)]">
            {cuerpo}
          </div>
        )}
      </div>
    );
  }

  if (!preguntando) {
    return (
      <Boton
        ref={disparador}
        tono={tono}
        medida={medida}
        disabled={deshabilitada}
        onClick={() => setPreguntando(true)}
      >
        {etiqueta}
      </Boton>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-sm border border-brass/50 bg-surface-sunken p-4">
      {cuerpo}
    </div>
  );
}
