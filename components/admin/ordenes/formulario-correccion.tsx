"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/components/ui/boton";
import {
  corregirUsuario,
  type EstadoCorreccion,
} from "@/lib/admin/acciones/ordenes";
import type { UsuarioOrden } from "@/lib/tipos";
import { Campo } from "../ui/campos";
import { Aviso } from "../ui/piezas";

const INICIAL: EstadoCorreccion = {};

/**
 * Corregir los datos de contacto de un comprador.
 *
 * Arranca cerrado: es una correccion, no algo que se hace en cada visita, y
 * abierto de entrada convertiria una ficha de lectura en un formulario.
 *
 * Los cuatro campos van precargados con lo que ya esta porque el endpoint es un
 * reemplazo, no un parche: lo que no se toque igual viaja. Un campo vacio no
 * significa "dejalo como estaba", significa borrarlo.
 */
export function FormularioCorreccion({ usuario }: { usuario: UsuarioOrden }) {
  const [abierto, setAbierto] = useState(false);

  const [estado, accion, enviando] = useActionState(
    corregirUsuario.bind(null, usuario.dni),
    INICIAL,
  );

  if (!abierto) {
    return (
      <Boton tono="secundario" medida="chico" onClick={() => setAbierto(true)}>
        Corregir datos
      </Boton>
    );
  }

  return (
    <form action={accion} className="space-y-4" noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}

      {estado.ok && (
        <Aviso tono="exito" titulo="Datos corregidos">
          Los PDF ya emitidos no cambian y no se reenvió nada. Si hacía falta
          que le lleguen de nuevo, usá «Reenviar entradas».
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="nombre"
          name="nombre"
          rotulo="Nombre"
          required
          defaultValue={estado.valores?.nombre ?? usuario.nombre}
          error={estado.errores?.nombre?.[0]}
        />
        <Campo
          id="apellido"
          name="apellido"
          rotulo="Apellido"
          required
          defaultValue={estado.valores?.apellido ?? usuario.apellido}
          error={estado.errores?.apellido?.[0]}
          ayuda="Con esto se busca a la persona en la puerta."
        />
        <Campo
          id="email"
          name="email"
          rotulo="Email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={estado.valores?.email ?? usuario.email}
          error={estado.errores?.email?.[0]}
        />
        <Campo
          id="celular"
          name="celular"
          rotulo="Celular"
          type="tel"
          inputMode="tel"
          required
          defaultValue={estado.valores?.celular ?? usuario.celular}
          error={estado.errores?.celular?.[0]}
          ayuda="Con característica, sin 0 ni 15."
        />
      </div>

      <p className="text-xs text-ink-faint">
        El DNI <span className="text-ink tabular">{usuario.dni}</span> no se
        corrige: identifica a la persona, y de él cuelgan sus compras, sus
        entradas y la búsqueda de la puerta.
      </p>

      <div className="flex flex-wrap gap-2">
        <Boton type="submit" medida="chico" cargando={enviando} disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar los cuatro campos"}
        </Boton>
        <Boton
          type="button"
          tono="fantasma"
          medida="chico"
          onClick={() => setAbierto(false)}
          disabled={enviando}
        >
          {estado.ok ? "Cerrar" : "Cancelar"}
        </Boton>
      </div>
    </form>
  );
}
