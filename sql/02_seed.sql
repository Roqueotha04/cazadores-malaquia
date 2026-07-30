-- Cazadores Malaquia — carga del salon
--
-- Idempotente y con guarda: si ya hay reservas, no toca nada. Correrlo dos
-- veces no duplica ni borra.

do $$
declare
  v_mesa_id bigint;
  v_numero  integer  := 1;   -- numero global de asiento, 1..730
  v_cap     smallint;
  v_mitad   smallint;
  v_mesa    integer;
  v_silla   smallint;
begin
  if exists (select 1 from reservas) then
    raise exception 'Hay reservas cargadas: el seed no se ejecuta';
  end if;

  insert into evento (id, nombre, fecha, lugar, precio_centavos,
                      max_asientos_por_compra, minutos_reserva, ventas_abiertas)
  values (1, 'Cena de Cazadores 2026',
          '2026-10-02 20:00:00-03', 'A confirmar',
          15000000,   -- $150.000
          10, 30, true)
  on conflict (id) do nothing;

  if exists (select 1 from mesas) then
    raise notice 'El salon ya esta cargado';
    return;
  end if;

  -- 14 mesas: 1 a 7 arriba, 8 a 14 abajo. Las dos primeras tienen 53 sillas.
  for v_mesa in 1..14 loop
    v_cap   := case when v_mesa <= 2 then 53 else 52 end;
    v_mitad := ceil(v_cap / 2.0);

    insert into mesas (numero, fila, orden, capacidad)
    values (v_mesa,
            case when v_mesa <= 7 then 'ARRIBA'::fila_mesa else 'ABAJO'::fila_mesa end,
            case when v_mesa <= 7 then v_mesa else v_mesa - 7 end,
            v_cap)
    returning id into v_mesa_id;

    -- La primera mitad de las sillas va de un lado de la mesa, el resto del otro.
    for v_silla in 1..v_cap loop
      insert into asientos (mesa_id, numero, posicion, lado)
      values (v_mesa_id, v_numero, v_silla,
              case when v_silla <= v_mitad then 'IZQUIERDA'::lado_asiento
                   else 'DERECHA'::lado_asiento end);
      v_numero := v_numero + 1;
    end loop;
  end loop;

  if (select count(*) from mesas) <> 14 or (select count(*) from asientos) <> 730 then
    raise exception 'El salon quedo mal cargado: se esperaban 14 mesas y 730 asientos';
  end if;
end $$;
