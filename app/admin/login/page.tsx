import type { Metadata } from "next";
import Link from "next/link";
import { FormularioLogin } from "@/components/admin/formulario-login";
import { Aviso } from "@/components/admin/ui/piezas";

export const metadata: Metadata = {
  title: "Entrar · Panel",
  // El panel no se indexa. No es secreto, pero no tiene por que aparecer.
  robots: { index: false, follow: false },
};

/**
 * La puerta del panel.
 *
 * Una sola cuenta compartida, la misma para el panel y para la puerta del
 * salon. No hay alta de usuarios ni "olvide mi contraseña": no hay a quien
 * mandarle el mail de recupero.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; vencida?: string }>;
}) {
  const { volver, vencida } = await searchParams;

  return (
    <main
      id="contenido"
      className="flex flex-1 items-center justify-center px-5 py-16"
    >
      <div className="w-full max-w-sm">
        <h1 className="text-2xl">Panel</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Cena de Cazadores · Armería Bonifacio Malaquía
        </p>

        {vencida === "1" && (
          <div className="mt-5">
            <Aviso tono="alerta" titulo="Se cortó la sesión">
              Dura 12 horas y no se renueva sola. Entrá de nuevo y seguís donde
              estabas.
            </Aviso>
          </div>
        )}

        <FormularioLogin volver={volver} />

        <p className="mt-8 border-t border-line pt-5 text-sm text-ink-faint">
          <Link href="/" className="subrayado-vivo">
            Volver al sitio
          </Link>
        </p>
      </div>
    </main>
  );
}
