"use client";

import { Boton } from "@/components/ui/boton";

/**
 * Guardar las entradas en papel o en PDF.
 *
 * Usa la impresion del navegador, que en todos lados ofrece "Guardar como PDF":
 * no hace falta sumar una dependencia de PDF ni un endpoint que las genere. El
 * bloque `@media print` de globals.css es el que hace que salgan en negro sobre
 * blanco y sin la barra ni el pie.
 *
 * Si mas adelante hace falta un PDF de verdad (uno que se pueda mandar adjunto
 * por mail, por ejemplo), el lugar es el backend: un GET que devuelva el
 * archivo ya armado.
 */
export function BotonImprimir() {
  return (
    <Boton
      tono="secundario"
      medida="chico"
      className="no-imprimir"
      onClick={() => window.print()}
    >
      Descargar o imprimir
    </Boton>
  );
}
