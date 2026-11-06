-- ============================================================
-- STILIZA — Modelo del informe (6 tablas, sin campos de más)
-- Ejecutar en: Supabase → SQL Editor → Run
-- ============================================================

create extension if not exists "uuid-ossp";

drop table if exists public.contact_messages cascade;
drop table if exists public.reservation_items cascade;
drop table if exists public.reservations cascade;
drop table if exists public.promotions cascade;
drop table if exists public.products cascade;
drop table if exists public.clientes cascade;
-- Si antes tenías profiles, se elimina para no dejar tablas de más:
drop table if exists public.profiles cascade;

-- 1) reservations
create table public.reservations (
  id uuid default uuid_generate_v4() primary key,
  reservation_number text unique not null,
  customer_name text not null,
  customer_email text default '',
  customer_phone text default '',
  total_amount numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null default 0,
  payment_method text default 'tarjeta',
  payment_status text default 'pagado',
  pickup_status text default 'pendiente',
  tipo text default 'reserva',
  pickup_deadline date,
  employee_email text default '',
  created_at timestamptz default now() not null
);

-- 2) reservation_items  (1 reserva → N ítems)
create table public.reservation_items (
  id uuid default uuid_generate_v4() primary key,
  reservation_id uuid references public.reservations(id) on delete cascade not null,
  product_name text not null,
  size text default 'M',
  unit_price numeric(12,2) not null default 0,
  quantity integer not null default 1
);

-- 3) products
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text default '',
  material text default '',
  category text not null,
  price numeric(12,2) not null default 0,
  image_url text default '',
  sizes text[] default array['S','M','L'],
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- 4) promotions
create table public.promotions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text default '',
  discount_percent integer default 0,
  discount_label text default '',
  original_price numeric(12,2) default 0,
  category text default '',
  image_url text default '',
  end_date date,
  days_total integer default 0,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- 5) clientes
create table public.clientes (
  id uuid default uuid_generate_v4() primary key,
  full_name text,
  email text unique not null,
  created_at timestamptz default now() not null
);

-- 6) contact_messages
create table public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  phone text default '',
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

-- RLS (para que el formulario público pueda guardar reservas)
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.products enable row level security;
alter table public.promotions enable row level security;
alter table public.clientes enable row level security;
alter table public.contact_messages enable row level security;

create policy "res_insert" on public.reservations for insert with check (true);
create policy "res_select" on public.reservations for select using (true);
create policy "res_update" on public.reservations for update using (true);

create policy "items_insert" on public.reservation_items for insert with check (true);
create policy "items_select" on public.reservation_items for select using (true);

create policy "products_read" on public.products for select using (is_active = true);
create policy "products_all" on public.products for all using (true) with check (true);

create policy "promos_read" on public.promotions for select using (is_active = true);
create policy "promos_all" on public.promotions for all using (true) with check (true);

create policy "clientes_all" on public.clientes for all using (true) with check (true);

create policy "msg_insert" on public.contact_messages for insert with check (true);
create policy "msg_select" on public.contact_messages for select using (true);
create policy "msg_update" on public.contact_messages for update using (true);

-- Productos de ejemplo (los mismos del catálogo)
insert into public.products (name, description, material, category, price, sizes) values
('Vestido Gala Rubí Nocturno', 'Elegante vestido sirena en tono vino.', 'Tul, satén y pedrería', 'gala', 615, array['XS','S','M','L','XL']),
('Vestido Gala Lavanda Crystal', 'Vestido sirena lavanda con pedrería.', 'Satén, tul y cristales', 'gala', 560, array['S','M','L','XL']),
('Vestido Floral Elegance', 'Vestido corto con detalles florales.', 'Algodón y gasa', 'casual', 495, array['XS','S','M','L']),
('Vestido Pink Elegance', 'Vestido corto de satén rosa empolvado.', 'Satén', 'fiesta', 655, array['XS','S','M','L']),
('Vestido de Novia Imperial Crystal', 'Corte sirena con pedrería y cola.', 'Encaje, tul y cristales', 'boda', 1850, array['S','M','L','XL']),
('Vestido Royal Ruby', 'Quinceañera rojo intenso.', 'Tul, satén y brillos', 'quinceañera', 1650, array['XS','S','M','L','XL']);
