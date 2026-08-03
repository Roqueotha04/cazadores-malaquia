import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/admin/shell/shell";
import { BadgeCasos } from "@/components/admin/shell/badge-casos";
import { Cuenta, CuentaCargando } from "@/components/admin/shell/cuenta";
import {
  EstadoVenta,
  EstadoVentaCargando,
} from "@/components/admin/shell/estado-venta";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

/**
 * El shell del panel.
 *
 * No hay chequeo de sesion aca a proposito: por el render parcial de Next un
 * layout no se vuelve a ejecutar al navegar entre pantallas, asi que un
 * `requerirSesion()` en este archivo daria una falsa sensacion de puerta
 * cerrada. La puerta esta en `lib/admin/api.ts`, pegada al dato, y cada pagina
 * la cruza sola. El proxy hace el rebote optimista antes de llegar hasta aca.
 *
 * Los tres datos del shell —cuenta, estado de la venta y casos pendientes— van
 * en `<Suspense>` para que un backend lento no frene el streaming de la pantalla
 * que se esta abriendo. La barra aparece primero; los datos, cuando llegan.
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Shell
      badge={
        <Suspense fallback={null}>
          <BadgeCasos />
        </Suspense>
      }
      cuenta={
        <Suspense fallback={<CuentaCargando />}>
          <Cuenta />
        </Suspense>
      }
      venta={
        <Suspense fallback={<EstadoVentaCargando />}>
          <EstadoVenta />
        </Suspense>
      }
    >
      {children}
    </Shell>
  );
}
