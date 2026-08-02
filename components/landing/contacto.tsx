import { FormularioContacto } from "./formulario-contacto";
import { fichaViva } from "@/components/ui/clases";

const WHATSAPP = "https://api.whatsapp.com/send?phone=542923504014";
const INSTAGRAM = "https://www.instagram.com/malaquiabonifacio/";
// TODO: reemplazar por la direccion real antes de publicar.
const EMAIL = "contacto@cazadoresmalaquia.com";

const CANALES = [
  {
    href: WHATSAPP,
    rotulo: "WhatsApp",
    valor: "2923 50-4014",
    nota: "Lo más rápido",
    externo: true,
  },
  {
    href: INSTAGRAM,
    rotulo: "Instagram",
    valor: "@malaquiabonifacio",
    nota: "Novedades del evento",
    externo: true,
  },
  {
    href: `mailto:${EMAIL}`,
    rotulo: "Mail",
    valor: EMAIL,
    nota: "Para lo que necesite quedar por escrito",
    externo: false,
  },
];

export function Contacto() {
  return (
    <section id="contacto" className="px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="titulo-seccion">¿Alguna duda con tu compra?</h2>
          <p className="mt-5 max-w-md text-lg text-ink-soft">
            Escribinos y te respondemos. Si ya compraste y no encontrás tus
            entradas, también.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
          <div className="grid gap-3 lg:content-start">
            {CANALES.map((c) => (
              <a
                key={c.rotulo}
                href={c.href}
                target={c.externo ? "_blank" : undefined}
                rel={c.externo ? "noopener noreferrer" : undefined}
                className={`group flex min-h-[104px] flex-col justify-between rounded-sm border border-line bg-surface-raised p-5 ${fichaViva}`}
              >
                <span className="dato">{c.rotulo}</span>
                <span>
                  <span className="flex items-center gap-2 font-display text-lg text-ink tabular">
                    <span className="min-w-0 break-all">{c.valor}</span>
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

          <FormularioContacto />
        </div>
      </div>
    </section>
  );
}
