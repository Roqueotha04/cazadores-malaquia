import { obtenerCuenta } from "@/lib/admin/consultas";
import { salir } from "@/lib/admin/acciones/sesion";
import { Boton } from "@/components/ui/boton";

/**
 * Quien esta adentro, y el boton de salir.
 *
 * Pedir `GET /api/auth/yo` no es solo para el nombre: es el chequeo de que la
 * sesion sigue viva al montar el panel. Si contesta 401, `pedirAdmin` manda al
 * login sin que ninguna pantalla tenga que acordarse de mirarlo.
 *
 * Hay una sola cuenta compartida, asi que el nombre no identifica a nadie en
 * particular. Igual se muestra: confirma que la sesion es la que se cree.
 */
export async function Cuenta() {
  const cuenta = await obtenerCuenta();

  return (
    <div className="flex items-center gap-2">
      <p className="hidden max-w-40 truncate text-sm text-ink-soft md:block">
        {cuenta.nombre}
      </p>
      <form action={salir}>
        <Boton type="submit" tono="fantasma" medida="chico">
          Salir
        </Boton>
      </form>
    </div>
  );
}

export function CuentaCargando() {
  return <p className="flex h-11 items-center text-sm text-ink-faint">…</p>;
}
