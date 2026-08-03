"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/boton";
import { entrar, type EstadoLogin } from "@/lib/admin/acciones/sesion";
import { Campo } from "./ui/campos";
import { Aviso } from "./ui/piezas";

const INICIAL: EstadoLogin = {};

export function FormularioLogin({ volver }: { volver?: string }) {
  const [estado, accion, enviando] = useActionState(entrar, INICIAL);

  return (
    <form action={accion} className="mt-7 space-y-5" noValidate>
      {/* A donde volver despues de entrar. Lo pone el proxy al rebotar, y la
          accion lo filtra: solo rutas del panel. */}
      <input type="hidden" name="volver" value={volver ?? ""} />

      {estado.error && <Aviso>{estado.error}</Aviso>}

      <Campo
        id="email"
        name="email"
        rotulo="Email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={estado.email}
        error={estado.errores?.email?.[0]}
      />

      <Campo
        id="password"
        name="password"
        rotulo="Contraseña"
        type="password"
        autoComplete="current-password"
        required
        error={estado.errores?.password?.[0]}
      />

      <Boton type="submit" cargando={enviando} disabled={enviando} className="w-full">
        {enviando ? "Entrando…" : "Entrar"}
      </Boton>
    </form>
  );
}
