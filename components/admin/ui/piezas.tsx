import type { ReactNode } from "react";

/**
 * El vocabulario visual del panel.
 *
 * Registro product: el diseño sirve a la tarea. Mismos tokens que el sitio de
 * venta —verde, laton, Archivo— pero densidad de herramienta. El laton no
 * decora: marca la accion principal, la seleccion actual y el foco, nada mas.
 *
 * Todo lo de este archivo se renderiza en el servidor. Lo que necesita estado
 * vive en su propio archivo con "use client".
 */

/* ------------------------------------------------------------- estructura */

/** El encabezado de una pantalla: titulo, bajada y acciones a la derecha. */
export function Encabezado({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        <h1 className="text-2xl">{titulo}</h1>
        {bajada && (
          <p className="mt-1.5 max-w-[65ch] text-sm text-ink-soft">{bajada}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  );
}

/** Un bloque de contenido. Nunca uno adentro de otro. */
export function Panel({
  titulo,
  acciones,
  children,
  className = "",
}: {
  titulo?: string;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-sm border border-line bg-surface-raised ${className}`}
    >
      {(titulo || acciones) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {titulo && (
            <h2 className="font-sans text-sm font-semibold text-ink">
              {titulo}
            </h2>
          )}
          {acciones && (
            <div className="flex items-center gap-2">{acciones}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ datos */

/**
 * Un dato con su rotulo. La unidad basica de todo el panel.
 *
 * `roto` es para los datos que el backend mando en null cuando no deberia: se
 * ven distinto de un dato vacio a proposito, porque alguien los tiene que ir a
 * mirar.
 */
export function Dato({
  rotulo,
  children,
  roto = false,
  className = "",
}: {
  rotulo: string;
  children: ReactNode;
  roto?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="dato">{rotulo}</p>
      <p
        className={`mt-1 tabular ${roto ? "text-alerta" : "text-ink"}`}
      >
        {children}
      </p>
    </div>
  );
}

/** Una cifra grande con su rotulo. Para el tablero. */
export function Cifra({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota?: ReactNode;
}) {
  return (
    <div className="border-t border-line-strong pt-3">
      <p className="dato">{rotulo}</p>
      <p className="mt-1 font-display text-3xl text-ink tabular">{valor}</p>
      {nota && <p className="mt-1 text-sm text-ink-soft">{nota}</p>}
    </div>
  );
}

/** Estados con color: cada uno con su tono, siempre el mismo en todo el panel. */
export type Tono = "neutro" | "exito" | "alerta" | "error" | "acento";

const tonos: Record<Tono, string> = {
  neutro: "border-line-strong text-ink-soft",
  exito: "border-exito/45 text-exito",
  alerta: "border-alerta/45 text-alerta",
  error: "border-error/45 text-error",
  acento: "border-brass/60 text-brass",
};

/**
 * Etiqueta de estado.
 *
 * Lleva borde y texto del mismo tono, sin relleno saturado: en una tabla de
 * cien filas los rellenos fuertes compiten con la accion principal, que es lo
 * unico que tiene derecho al laton lleno.
 */
export function Pildora({
  tono = "neutro",
  children,
}: {
  tono?: Tono;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ vacio */

/**
 * Lo que se ve cuando no hay nada.
 *
 * Enseña la pantalla en vez de decir "sin resultados": quien abre la cola de
 * casos por primera vez tiene que entender que una cola vacia es la situacion
 * buena, no un error.
 */
export function Vacio({
  titulo,
  children,
}: {
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-sans text-base font-semibold text-ink">{titulo}</p>
      {children && (
        <p className="mx-auto mt-2 max-w-[48ch] text-sm text-ink-soft">
          {children}
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- avisos */

/**
 * Un mensaje del backend, mostrado tal cual viene.
 *
 * `mensaje` esta escrito para leerse: reescribirlo del lado del front seria
 * perder precision. Solo se elige el tono.
 */
export function Aviso({
  tono = "error",
  titulo,
  children,
}: {
  tono?: Exclude<Tono, "neutro">;
  titulo?: string;
  children: ReactNode;
}) {
  const fondos: Record<Exclude<Tono, "neutro">, string> = {
    exito: "border-exito/40 bg-exito/10",
    alerta: "border-alerta/40 bg-alerta/10",
    error: "border-error/40 bg-error/10",
    acento: "border-brass/40 bg-brass/10",
  };

  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={`rounded-sm border px-4 py-3 text-sm ${fondos[tono]}`}
    >
      {titulo && <p className="font-semibold text-ink">{titulo}</p>}
      <div className={`text-ink-soft ${titulo ? "mt-1" : ""}`}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ barra */

/**
 * Una proporcion, dibujada.
 *
 * Los tramos van uno al lado del otro y cada uno lleva su cifra escrita al pie:
 * la barra ayuda a comparar de un vistazo, pero el numero es el dato. Con la
 * barra sola no se puede leer "412 vendidas".
 */
export function BarraApilada({
  total,
  tramos,
}: {
  total: number;
  tramos: { rotulo: string; valor: number; clase: string }[];
}) {
  const base = Math.max(total, 1);

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-sm border border-line-strong bg-surface-sunken"
        role="img"
        aria-label={tramos
          .map((t) => `${t.valor} ${t.rotulo.toLowerCase()}`)
          .join(", ")}
      >
        {tramos.map((tramo) => (
          <span
            key={tramo.rotulo}
            className={tramo.clase}
            style={{ width: `${(tramo.valor / base) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {tramos.map((tramo) => (
          <li key={tramo.rotulo} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={`h-3 w-3 shrink-0 rounded-[2px] ${tramo.clase}`}
            />
            <span className="text-ink-soft">{tramo.rotulo}</span>
            <span className="font-semibold text-ink tabular">
              {tramo.valor}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Una fila de comparacion: rotulo, barra y cifra.
 *
 * Se pintan siempre todas las categorias aunque esten en cero — el backend las
 * manda completas justamente para que al panel no le aparezcan renglones nuevos
 * a medida que avanza la venta. Una fila en cero es informacion.
 */
export function FilaBarra({
  rotulo,
  valor,
  maximo,
  cifra,
  nota,
}: {
  rotulo: string;
  valor: number;
  maximo: number;
  cifra: string;
  nota?: string;
}) {
  const porcentaje = maximo > 0 ? (valor / maximo) * 100 : 0;

  /* Dos armados, no uno que se encoge.
   *
   * En el telefono las tres columnas no entran: el rotulo tiene 7rem de minimo y
   * la cifra ocupa lo suyo, asi que a la barra le quedaban veinte pixeles y
   * dejaba de comparar nada. Debajo de 640px el renglon se parte —rotulo y cifra
   * arriba, barra a lo ancho abajo— y la barra recupera todo el ancho del panel.
   */
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[minmax(7rem,1fr)_2fr_auto] sm:items-center sm:gap-y-1">
      <p className="col-start-1 row-start-1 truncate text-sm text-ink-soft">
        {rotulo}
      </p>
      <p className="col-start-2 row-start-1 text-right text-sm font-semibold text-ink tabular sm:col-start-3">
        {cifra}
      </p>
      <div className="col-span-2 row-start-2 h-2 self-center rounded-sm bg-surface-sunken sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <div
          className="h-full rounded-sm bg-brass/70"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      {nota && (
        <p className="col-span-2 row-start-3 text-xs text-ink-faint sm:col-start-2 sm:col-end-4 sm:row-start-2">
          {nota}
        </p>
      )}
    </div>
  );
}
