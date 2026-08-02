/**
 * Cadenas de clases que se repiten en varios archivos.
 *
 * Van como constantes de Tailwind y no como `@utility` en globals.css a
 * proposito: la variante `hover:` de Tailwind v4 ya viene envuelta en
 * `@media (hover: hover)`, asi que en el celular ningun hover queda pegado
 * despues de un toque. Escribiendolas en CSS crudo habria que repetir esa
 * guarda a mano en cada regla.
 */

/**
 * Panel que reacciona al mouse: borde a laton, fondo un escalon mas alto y dos
 * pixeles hacia arriba. Para tarjetas y fichas, sean clickeables o no.
 */
export const fichaViva =
  "transition-[border-color,background-color,transform] duration-200 " +
  "ease-[var(--ease-salida)] hover:-translate-y-0.5 hover:border-brass " +
  "hover:bg-surface-high";

const campoBase =
  "mt-2 w-full rounded-sm border bg-surface-sunken px-3.5 py-3 text-base " +
  "text-ink transition-colors duration-200 placeholder:text-ink-faint";

/**
 * Input o textarea del sistema.
 *
 * El `text-base` no es decoracion: en iOS un campo de menos de 16px hace que el
 * navegador haga zoom solo al enfocarlo. El alto minimo viaja aparte porque el
 * textarea necesita otro.
 */
export function campo(error: boolean, alto = "min-h-[52px]") {
  return [
    campoBase,
    alto,
    error
      ? "border-error"
      : "border-line-strong hover:border-ink-faint focus:border-brass",
  ].join(" ");
}
