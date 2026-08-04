const WHATSAPP = "https://api.whatsapp.com/send?phone=542923504014";

/**
 * Pie del flujo de compra: una sola cosa, la salida de emergencia.
 *
 * Buena parte de este publico no tiene costumbre de comprar online. Tener el
 * WhatsApp a la vista en cada paso es lo que evita que abandonen cuando algo no
 * se entiende.
 */
export function PieAyuda() {
  return (
    /* El `pb` extra es por la barra fija del plano: es `fixed`, tapa los ultimos
       ~76px de la pagina y con la seleccion hecha se comia justo este WhatsApp,
       que es la salida de emergencia. Vuelve al padding normal exactamente donde
       la barra no existe: ancho `lg` y puntero fino. */
    <footer className="mt-auto border-t border-line px-5 pt-8 pb-28 lg:pointer-fine:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-faint">
          ¿Se te complicó algo? Escribinos y lo resolvemos.
        </p>

        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-ink transition-colors duration-200 ease-[var(--ease-salida)] hover:text-brass"
        >
          WhatsApp 2923 50-4014
          <span
            aria-hidden
            className="text-brass transition-transform duration-200 ease-[var(--ease-salida)] group-hover:translate-x-1"
          >
            →
          </span>
        </a>
      </div>
    </footer>
  );
}
