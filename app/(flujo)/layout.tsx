import { BarraFlujo } from "@/components/compra/barra-flujo";
import { PieAyuda } from "@/components/compra/pie-ayuda";

/**
 * Shell del flujo de compra (registro product).
 *
 * Deliberadamente mas pobre que el de la landing: una barra con el logo y nada
 * que compita con la accion de la pantalla. El CTA "Comprar entradas" de la
 * navbar no va aca — el comprador ya esta comprando.
 */
export default function FlujoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BarraFlujo />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <PieAyuda />
    </>
  );
}
