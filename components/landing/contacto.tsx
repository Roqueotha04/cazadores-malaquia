const WHATSAPP = "https://api.whatsapp.com/send?phone=542923504014";
const INSTAGRAM = "https://www.instagram.com/malaquiabonifacio/";

const CANALES = [
  {
    href: WHATSAPP,
    rotulo: "WhatsApp",
    valor: "2923 50-4014",
    nota: "Lo más rápido",
  },
  {
    href: INSTAGRAM,
    rotulo: "Instagram",
    valor: "@malaquiabonifacio",
    nota: "Novedades del evento",
  },
];

export function Contacto() {
  return (
    <section id="contacto" className="px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-end lg:gap-20">
          <div>
            <h2 className="titulo-seccion">¿Alguna duda con tu compra?</h2>
            <p className="mt-5 max-w-md text-lg text-ink-soft">
              Escribinos y te respondemos. Si ya compraste y no encontrás tus
              entradas, también.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CANALES.map((c) => (
              <a
                key={c.rotulo}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[104px] flex-col justify-between rounded-sm border border-line bg-surface-raised p-5 transition-colors duration-200 ease-[var(--ease-salida)] hover:border-brass"
              >
                <span className="dato">{c.rotulo}</span>
                <span>
                  <span className="flex items-center gap-2 font-display text-lg text-ink tabular">
                    {c.valor}
                    <span
                      aria-hidden
                      className="text-brass transition-transform duration-200 ease-[var(--ease-salida)] group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {c.nota}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
