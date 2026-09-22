-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar y RUN.

create table if not exists donaciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  apellido text not null,
  anonimo boolean not null default false,
  telefono text not null,
  tramo_id text not null,
  cuadras integer not null check (cuadras > 0 and cuadras <= 200),
  metodo_pago text not null check (metodo_pago in ('Efectivo','Transferencia')),
  entrega text check (entrega in ('retiro','menora')),
  direccion text,
  nota text
);

-- Row Level Security activado y SIN policies: nadie puede leer ni escribir
-- esta tabla directamente desde el navegador. Todo el acceso pasa por las
-- funciones serverless (api/*.js), que usan la Service Role Key (nunca
-- expuesta al cliente) para saltear RLS de forma controlada.
alter table donaciones enable row level security;
