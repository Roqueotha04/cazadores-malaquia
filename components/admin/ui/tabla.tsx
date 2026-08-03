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
 */
export function Tabla({
  columnas,
  children,
}: {
  columnas: { clave: string; rotulo: string; alDerecha?: boolean }[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
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
