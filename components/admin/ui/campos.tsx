import type { ComponentProps, ReactNode } from "react";
import { campo } from "@/components/ui/clases";

/**
 * Los controles de formulario del panel.
 *
 * Reusan `campo()` de `components/ui/clases.ts` —el mismo input que el flujo de
 * compra— para que un formulario del panel y uno del sitio no se vean como dos
 * productos. Lo que agregan es lo que el panel necesita y la compra no: rotulo,
 * error y ayuda atados por id, en un solo lugar, porque el panel tiene decenas
 * de campos y atarlos a mano en cada uno termina en la mitad sin `aria`.
 */

type Base = {
  id: string;
  rotulo: string;
  error?: string;
  ayuda?: ReactNode;
};

function Envoltura({
  id,
  rotulo,
  error,
  ayuda,
  children,
}: Base & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        {rotulo}
      </label>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-ink-faint">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Los `aria-*` que atan el input con su error y su ayuda. */
function enlaces(id: string, error?: string, ayuda?: ReactNode) {
  const descrito = [ayuda && `${id}-ayuda`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": descrito || undefined,
  };
}

export function Campo({
  id,
  rotulo,
  error,
  ayuda,
  className,
  ...resto
}: Base & ComponentProps<"input">) {
  return (
    <Envoltura id={id} rotulo={rotulo} error={error} ayuda={ayuda}>
      <input
        id={id}
        {...enlaces(id, error, ayuda)}
        {...resto}
        className={`${campo(!!error)} ${className ?? ""}`}
      />
    </Envoltura>
  );
}

export function AreaTexto({
  id,
  rotulo,
  error,
  ayuda,
  className,
  ...resto
}: Base & ComponentProps<"textarea">) {
  return (
    <Envoltura id={id} rotulo={rotulo} error={error} ayuda={ayuda}>
      <textarea
        id={id}
        {...enlaces(id, error, ayuda)}
        {...resto}
        className={`${campo(!!error, "min-h-[7rem]")} ${className ?? ""}`}
      />
    </Envoltura>
  );
}

export function Selector({
  id,
  rotulo,
  error,
  ayuda,
  className,
  children,
  ...resto
}: Base & ComponentProps<"select">) {
  return (
    <Envoltura id={id} rotulo={rotulo} error={error} ayuda={ayuda}>
      <select
        id={id}
        {...enlaces(id, error, ayuda)}
        {...resto}
        className={`${campo(!!error)} appearance-none ${className ?? ""}`}
      >
        {children}
      </select>
    </Envoltura>
  );
}
