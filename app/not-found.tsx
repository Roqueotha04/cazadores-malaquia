import { BotonLink } from "@/components/ui/boton";

/**
 * Lo que ve alguien que entra a un link de compra que no existe: un token mal
 * copiado, o una url vieja. Habla de eso, no de "404".
 */
export default function NoEncontrado() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-24">
      <h1>Este link no existe o ya no está</h1>

      <p className="mt-4 text-lg text-ink-soft">
        Si estabas buscando tu compra, revisá que el link esté completo: es el
        que te llegó por mail cuando reservaste tus sillas.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <BotonLink href="/comprar" className="w-full sm:w-auto">
          Ver sillas disponibles
        </BotonLink>
        <BotonLink href="/" tono="secundario">
          Volver al inicio
        </BotonLink>
      </div>
    </main>
  );
}
