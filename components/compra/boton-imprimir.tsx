"use client";

import { Boton } from "@/components/ui/boton";

/**
 * Imprimir esta pantalla.
 *
 * Es el camino de al lado del PDF, no el mismo: el PDF lo arma el backend y es
 * el que vale en la puerta. Esto imprime la pagina tal cual, y sirve cuando el
 * archivo no baja o cuando alguien quiere el papel y ya lo tiene abierto. El
 * bloque `@media print` de globals.css es el que hace que salga en negro sobre
 * blanco y sin la barra ni el pie.
 */
export function BotonImprimir() {
  return (
    <Boton
      tono="fantasma"
      medida="chico"
      className="no-imprimir"
      onClick={() => window.print()}
    >
      Imprimir
    </Boton>
  );
}
