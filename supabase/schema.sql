-- Esvin Samuel CM — portafolio: esquema de Supabase
-- Ejecutar en el SQL editor de tu proyecto de Supabase (Database > SQL Editor).

create extension if not exists "pgcrypto";

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists interest_signups (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('curso', 'guia')),
  item text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists dashboard_images (
  slot text primary key,
  url text not null,
  updated_at timestamptz not null default now()
);

-- RLS activado y sin políticas para el público: solo la service role key
-- (usada exclusivamente en las funciones serverless de /api, nunca en el navegador)
-- puede leer o escribir estas tablas.
alter table contact_messages enable row level security;
alter table interest_signups enable row level security;
alter table dashboard_images enable row level security;

-- Bucket de Storage para las capturas de Power BI.
-- Crear manualmente en Storage > New bucket:
--   nombre: dashboards
--   público: sí (para que las capturas se vean en el portafolio sin autenticación)
-- La escritura queda protegida por ADMIN_SECRET en /api/dashboard (POST),
-- que usa la service role key del lado del servidor.

-- ---------------------------------------------------------------------------
-- Visitas (contador privado). Ejecutar este bloque en el SQL Editor de Supabase.
-- No se guarda la IP: solo país/ciudad aproximados que entrega Vercel, el tipo
-- de dispositivo, de dónde vino la visita y una etiqueta ?ref= opcional.
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text,
  path text,
  ref_tag text,
  referrer_host text,
  country text,
  region text,
  city text,
  device text,
  browser text,
  os text
);
create index if not exists visits_created_at_idx on visits (created_at desc);
alter table visits enable row level security;
