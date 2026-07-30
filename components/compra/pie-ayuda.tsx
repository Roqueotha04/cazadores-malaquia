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
    <footer className="mt-auto border-t border-line px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-faint">
          ¿Se te complicó algo? Escribinos y lo resolvemos.
        </p>

        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-ink transition-colors duration-200 hover:text-brass"
        >
          WhatsApp 2923 50-4014
          <span aria-hidden className="text-brass">
            →
          </span>
        </a>
      </div>
    </footer>
  );
}
