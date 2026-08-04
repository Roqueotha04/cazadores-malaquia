import type { ReactNode } from "react";

/**
 * La tabla del panel.
 *
 * Es una `<table>` de verdad y no una grilla de divs: los lectores de pantalla
 * anuncian la columna al moverse por las celdas, y sin eso una fila de nueve
 * datos sueltos no se puede leer.
 *
 * Envuelta en su propio scroll horizontal: una tabla ancha tiene que desbordar
 * adentro de su caja, nunca empujar la pagina entera de costado.
 *
 * El ancho minimo sale de la cantidad de columnas y no de un numero escrito a
 * mano: con `w-full` sola, en un telefono las siete columnas de Ordenes se
 * apretaban hasta que cada nombre caia en tres renglones y las fechas en dos.
 * Una tabla de datos se pasea de costado, no se estruja. `overscroll-x-contain`
 * evita que ese paneo se lo coma el gesto de "volver atras" del navegador.
 */
const ANCHO_POR_COLUMNA_REM = 5.5;

export function Tabla({
  columnas,
  children,
}: {
  columnas: { clave: string; rotulo: string; alDerecha?: boolean }[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table
        className="w-full border-collapse text-sm"
        style={{ minWidth: `${columnas.length * ANCHO_POR_COLUMNA_REM}rem` }}
      >
        <thead>
          <tr className="border-b border-line">
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={`dato px-4 py-2.5 whitespace-nowrap ${
                  columna.alDerecha ? "text-right" : "text-left"
                }`}
              >
                {columna.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

/** Una celda. `apretada` para las que no tienen que crecer. */
export function Celda({
  children,
  alDerecha = false,
  className = "",
}: {
  children: ReactNode;
  alDerecha?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 align-middle ${
        alDerecha ? "text-right" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

/**
 * El aviso de que la lista llego al tope.
 *
 * El backend corta en 20 o en 100 segun el endpoint y no dice cuantos habia en
 * total. Mostrar cien filas sin aclararlo hace creer que eso es todo lo que hay.
 */
export function AvisoTope({
  cantidad,
  tope,
  children,
}: {
  cantidad: number;
  tope: number;
  children: ReactNode;
}) {
  if (cantidad < tope) return null;

  return (
    <p className="border-t border-line bg-surface-sunken px-4 py-2.5 text-xs text-alerta">
      {children}
    </p>
  );
}
