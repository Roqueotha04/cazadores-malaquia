import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

/**
 * Shell de la landing (registro brand).
 *
 * Antes cada pagina importaba Navbar y Footer a mano, que es de donde venia la
 * inconsistencia entre pantallas. Ahora el shell vive en un solo lugar.
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
