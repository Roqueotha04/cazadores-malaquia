"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { Boton } from "@/components/ui/boton";
// Se renombra: acá `campo` ya es cada entrada de CAMPOS.
import { campo as campoClases } from "@/components/ui/clases";
import { enviarCompra, type EstadoFormulario } from "@/lib/acciones/compra";
import { tokenGuardado } from "@/lib/orden-guardada";

const CAMPOS = [
  {
    nombre: "nombre",
    etiqueta: "Nombre",
    tipo: "text",
    autoComplete: "given-name",
    mitad: true,
  },
  {
    nombre: "apellido",
    etiqueta: "Apellido",
    tipo: "text",
    autoComplete: "family-name",
    mitad: true,
  },
  {
    nombre: "dni",
    etiqueta: "DNI",
    tipo: "text",
    autoComplete: "off",
    inputMode: "numeric" as const,
    ayuda: "Sin puntos ni espacios",
  },
  {
    nombre: "email",
    etiqueta: "Email",
    tipo: "email",
    autoComplete: "email",
    ayuda: "Ahí te mandamos las entradas",
  },
  {
    nombre: "confirmarEmail",
    etiqueta: "Confirmar email",
    tipo: "email",
    autoComplete: "off",
    sinPegar: true,
  },
  {
    nombre: "celular",
    etiqueta: "Celular",
    tipo: "tel",
    autoComplete: "tel",
    inputMode: "tel" as const,
    ayuda: "Con característica, sin 0 ni 15",
  },
];

/** Referencia estable: `useSyncExternalStore` la compara entre renders. */
const noCambia = () => () => {};

export function FormularioDatos({
  asientos,
  minutosReserva,
}: {
  asientos: number[];
  minutosReserva: number;
}) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    enviarCompra,
    {},
  );

  const alerta = useRef<HTMLDivElement>(null);

  // El token de la última compra vive en `localStorage`, que en el servidor no
  // existe: leerlo en el cuerpo del render desincroniza la hidratación. En el
  // servidor devuelve null —el aviso arranca sin link y lo suma al hidratar— y
  // no se suscribe a nada porque nadie lo escribe mientras esta pantalla está
  // abierta: se escribe recién al llegar a la reserva.
  const ultima = useSyncExternalStore(noCambia, tokenGuardado, () => null);

  const errorConsentimiento = estado.errores?.consentimiento?.[0];

  // El error general vive arriba de todo: si la persona estaba en el último
  // campo, sin esto no lo ve nunca.
  useEffect(() => {
    alerta.current?.focus();
  }, [estado.error]);

  return (
    <form action={accion} noValidate>
      <input type="hidden" name="asientos" value={asientos.join(",")} />

      {estado.error && (
        <div
          ref={alerta}
          tabIndex={-1}
          role="alert"
          /* El tope de compras abiertas no es un error de lo que escribió: los
             datos están bien. Va en ámbar, como un "todavía no", y no en rojo
             junto a los campos que no tienen nada que corregir. */
          className={`mb-7 rounded-sm border px-4 py-3.5 ${
            estado.tope
              ? "border-alerta/50 bg-alerta/10"
              : "border-error/50 bg-error/10"
          }`}
        >
          <p className="text-sm font-medium text-ink">{estado.error}</p>

          {estado.tope && (
            <>
              <p className="mt-2 text-sm text-ink-soft">
                Cancelar una libera el lugar en el acto, no hay que esperar.
                {!ultima &&
                  ` Si no las tenés a mano, las que no se paguen se sueltan solas en menos de ${minutosReserva} minutos.`}
              </p>
              {ultima && (
                <Link
                  href={`/reserva/${ultima}`}
                  className="mt-2 inline-block text-sm font-semibold text-brass underline decoration-brass/40 underline-offset-4 hover:decoration-brass"
                >
                  Ir a tu última compra sin pagar
                </Link>
              )}
            </>
          )}

          {estado.ocupadas && (
            <Link
              href={`/comprar?asientos=${asientos.join(",")}`}
              className="mt-2 inline-block text-sm font-semibold text-brass underline decoration-brass/40 underline-offset-4 hover:decoration-brass"
            >
              Volver al plano y elegir otras
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {CAMPOS.map((campo) => {
          const error = estado.errores?.[campo.nombre]?.[0];
          const idAyuda = `${campo.nombre}-ayuda`;

          return (
            <div
              key={campo.nombre}
              className={campo.mitad ? "" : "sm:col-span-2"}
            >
              <label
                htmlFor={campo.nombre}
                className="block text-sm font-medium text-ink"
              >
                {campo.etiqueta}
              </label>

              <input
                id={campo.nombre}
                name={campo.nombre}
                type={campo.tipo}
                inputMode={campo.inputMode}
                autoComplete={campo.autoComplete}
                required
                /* Sin esto se puede pegar el mismo email mal escrito dos
                   veces y el campo pierde su sentido: tiene que salir de
                   tipear. */
                onPaste={
                  campo.sinPegar ? (e) => e.preventDefault() : undefined
                }
                /* React 19 resetea el formulario cuando la action termina,
                   aunque haya devuelto errores. Los valores vuelven del estado
                   para que nadie tenga que reescribir todo por un dígito. */
                defaultValue={estado.valores?.[campo.nombre]}
                aria-invalid={!!error}
                aria-describedby={campo.ayuda || error ? idAyuda : undefined}
                className={campoClases(!!error)}
              />

              {(error || campo.ayuda) && (
                <p
                  id={idAyuda}
                  className={`mt-2 text-sm ${
                    error ? "font-medium text-error" : "text-ink-faint"
                  }`}
                >
                  {error ?? campo.ayuda}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* El `required` no alcanza: el formulario es `noValidate` —los mensajes
          son nuestros, no las burbujas del navegador— asi que quien decide es
          la accion. Queda igual porque es lo que lo anuncia como obligatorio a
          un lector de pantalla. */}
      <div className="mt-7">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="consentimiento"
            required
            defaultChecked={estado.valores?.consentimiento === "on"}
            aria-invalid={!!errorConsentimiento}
            aria-describedby={
              errorConsentimiento ? "consentimiento-error" : undefined
            }
            className={`mt-0.5 size-5 shrink-0 accent-brass ${
              errorConsentimiento
                ? "outline outline-2 outline-offset-2 outline-error"
                : ""
            }`}
          />
          <span>
            Usamos tus datos solamente para emitir la entrada y controlar el
            ingreso al salón. No los compartimos con nadie.
          </span>
        </label>

        {errorConsentimiento && (
          <p
            id="consentimiento-error"
            className="mt-2 text-sm font-medium text-error"
          >
            {errorConsentimiento}
          </p>
        )}
      </div>

      <Boton
        type="submit"
        disabled={enviando}
        cargando={enviando}
        className="mt-8 w-full sm:w-auto"
      >
        {enviando ? "Reservando tus sillas…" : "Reservar y seguir al pago"}
      </Boton>

      <p className="mt-4 text-sm text-ink-faint">
        Todavía no se cobra nada. En el paso siguiente confirmás y pagás.
      </p>
    </form>
  );
}
