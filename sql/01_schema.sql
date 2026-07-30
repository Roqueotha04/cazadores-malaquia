-- Cazadores Malaquia — esquema
-- Montos en centavos (enteros). Nunca float.

create type estado_asiento as enum ('DISPONIBLE', 'RESERVADO', 'VENDIDO');
create type estado_reserva as enum ('ACTIVA', 'PAGADA', 'EXPIRADA', 'CANCELADA');
create type estado_pago    as enum ('PENDIENTE', 'APROBADO', 'RECHAZADO');
create type fila_mesa      as enum ('ARRIBA', 'ABAJO');
create type lado_asiento   as enum ('IZQUIERDA', 'DERECHA');


-- Una sola fila. El precio y el tope viven aca para que el front y el back
-- lean el mismo numero, y para poder cerrar la venta sin hacer un deploy.
create table evento (
  id                      smallint primary key default 1,
  nombre                  text        not null,
  fecha                   timestamptz,
  lugar                   text,
  precio_centavos         integer     not null check (precio_centavos > 0),
  max_asientos_por_compra smallint    not null default 10,
  minutos_reserva         smallint    not null default 30,
  ventas_abiertas         boolean     not null default false,
  constraint evento_fila_unica check (id = 1)
);


create table mesas (
  id        bigserial primary key,
  numero    integer   not null unique,
  fila      fila_mesa not null,
  orden     smallint  not null,
  capacidad smallint  not null check (capacidad > 0),
  unique (fila, orden)
);


create table asientos (
  id       bigserial      primary key,
  mesa_id  bigint         not null references mesas(id),
  numero   integer        not null unique,   -- global 1..730
  posicion smallint       not null,          -- la silla dentro de su mesa
  lado     lado_asiento   not null,
  estado   estado_asiento not null default 'DISPONIBLE',
  unique (mesa_id, posicion)
);

create index asientos_estado_idx on asientos (estado);
create index asientos_mesa_idx   on asientos (mesa_id, posicion);


-- La identidad es el DNI, no el email: un matrimonio compra con el mismo mail
-- y dos documentos distintos.
create table usuarios (
  id             bigserial   primary key,
  dni            text        not null unique,
  nombre         text        not null,
  apellido       text        not null,
  email          text        not null,
  celular        text        not null,
  creado_el      timestamptz not null default now(),
  actualizado_el timestamptz not null default now(),
  constraint usuarios_dni_formato check (dni ~ '^[0-9]{7,8}$')
);

create index usuarios_email_idx on usuarios (email);


create table reservas (
  id         bigserial      primary key,
  usuario_id bigint         not null references usuarios(id),
  estado     estado_reserva not null default 'ACTIVA',
  token      uuid           not null unique default gen_random_uuid(),
  creado_el  timestamptz    not null default now(),
  expira_en  timestamptz    not null,
  pagado_el  timestamptz
);

-- El indice que usa la liberacion de reservas vencidas.
create index reservas_vencidas_idx on reservas (expira_en) where estado = 'ACTIVA';


create table reserva_asientos (
  reserva_id bigint not null references reservas(id) on delete cascade,
  asiento_id bigint not null references asientos(id),
  primary key (reserva_id, asiento_id)
);

create index reserva_asientos_asiento_idx on reserva_asientos (asiento_id);


create table pagos (
  id             bigserial   primary key,
  reserva_id     bigint      not null unique references reservas(id),
  monto_centavos integer     not null check (monto_centavos > 0),
  estado         estado_pago not null default 'PENDIENTE',
  creado_el      timestamptz not null default now(),
  aprobado_el    timestamptz
);


create table entradas (
  id         bigserial   primary key,
  reserva_id bigint      not null references reservas(id),
  asiento_id bigint      not null references asientos(id),
  codigo     uuid        not null unique default gen_random_uuid(),
  creado_el  timestamptz not null default now(),
  usado_el   timestamptz,
  unique (reserva_id, asiento_id)
);

-- Un asiento no puede tener dos entradas. Es la ultima red: si algun dia un bug
-- intenta emitir la entrada de la butaca 412 dos veces, la base lo rechaza.
create unique index entradas_asiento_idx on entradas (asiento_id);
create index entradas_reserva_idx on entradas (reserva_id);


-- Solo se inserta, nunca se modifica. Sin cuentas de usuario, es lo unico que
-- responde un "yo compre" tres semanas despues.
create table historial (
  id         bigserial   primary key,
  entidad    text        not null,
  entidad_id bigint      not null,
  tipo       text        not null,
  datos      jsonb       not null default '{}',
  creado_el  timestamptz not null default now()
);

create index historial_entidad_idx on historial (entidad, entidad_id, creado_el);


-- El navegador no habla con Supabase: la app entra por conexion directa con el
-- rol del servidor. RLS activa y sin politicas deja todo cerrado por si alguna
-- vez se filtra una clave publica.
alter table evento           enable row level security;
alter table mesas            enable row level security;
alter table asientos         enable row level security;
alter table usuarios         enable row level security;
alter table reservas         enable row level security;
alter table reserva_asientos enable row level security;
alter table pagos            enable row level security;
alter table entradas         enable row level security;
alter table historial        enable row level security;
