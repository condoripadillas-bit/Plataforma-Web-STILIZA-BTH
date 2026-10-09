-- ============================================================
-- STILIZA - Arreglo products + promotions + reservations + items
-- NO TOCA: clientes, contact_messages
-- ============================================================

create extension if not exists "uuid-ossp";

-- Borrar solo lo que falla (orden: items → reservations → promos → products)
drop table if exists public.reservation_items cascade;
drop table if exists public.reservations cascade;
drop table if exists public.promotions cascade;
drop table if exists public.products cascade;

-- ========== PRODUCTOS ==========
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  material text default '',
  category text default 'gala',
  price numeric(12,2) not null default 0,
  image_url text default '',
  sizes text[] default array['S','M','L'],
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- ========== PROMOCIONES ==========
create table public.promotions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  discount_percent integer default 0,
  discount_label text default '',
  original_price numeric(12,2) default 0,
  category text default '',
  image_url text default '',
  end_date date,
  days_total integer default 20,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- ========== RESERVAS / VENTAS ==========
create table public.reservations (
  id uuid default gen_random_uuid() primary key,
  reservation_number text unique not null,
  customer_name text not null,
  customer_email text default '',
  customer_phone text default '',
  total_amount numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null default 0,
  payment_method text default 'efectivo',
  payment_status text default 'pagado',
  pickup_status text default 'pendiente',
  tipo text default 'reserva',
  pickup_deadline date,
  employee_email text default '',
  created_at timestamptz default now() not null
);

-- ========== ÍTEMS DE CADA RESERVA ==========
create table public.reservation_items (
  id uuid default gen_random_uuid() primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  product_name text not null default 'Producto',
  size text default 'M',
  unit_price numeric(12,2) not null default 0,
  quantity integer not null default 1
);

-- ========== RLS ==========
alter table public.products enable row level security;
alter table public.promotions enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;

drop policy if exists "all_products" on public.products;
drop policy if exists "p_products" on public.products;
drop policy if exists "all_promotions" on public.promotions;
drop policy if exists "p_promotions" on public.promotions;
drop policy if exists "all_reservations" on public.reservations;
drop policy if exists "p_reservations" on public.reservations;
drop policy if exists "all_items" on public.reservation_items;
drop policy if exists "p_items" on public.reservation_items;

create policy "all_products" on public.products for all using (true) with check (true);
create policy "all_promotions" on public.promotions for all using (true) with check (true);
create policy "all_reservations" on public.reservations for all using (true) with check (true);
create policy "all_items" on public.reservation_items for all using (true) with check (true);

-- ========== PERMISOS PARA LA WEB (anon key) ==========
grant usage on schema public to anon, authenticated, service_role;

grant all on public.products to anon, authenticated, service_role;
grant all on public.promotions to anon, authenticated, service_role;
grant all on public.reservations to anon, authenticated, service_role;
grant all on public.reservation_items to anon, authenticated, service_role;

-- Refuerzo de las que ya te funcionan (sin borrar datos)
grant all on public.clientes to anon, authenticated, service_role;
grant all on public.contact_messages to anon, authenticated, service_role;

-- Recargar API
notify pgrst, 'reload schema';

-- ========== PRUEBAS ==========
insert into public.products (name, description, material, category, price, sizes)
values ('Prueba producto SQL', 'Desde SQL', 'Satén', 'gala', 500, array['S','M','L']);

insert into public.promotions (title, description, discount_percent, discount_label, category, days_total)
values ('Prueba promo SQL', 'Desde SQL', 20, '-20%', 'gala', 15);

insert into public.reservations (
  reservation_number, customer_name, customer_email, customer_phone,
  total_amount, deposit_amount, remaining_amount,
  payment_method, payment_status, pickup_status, tipo, pickup_deadline
)
values (
  'R-2026-TEST01',
  'Cliente Prueba',
  'prueba@correo.com',
  '70000000',
  1000, 200, 800,
  'efectivo', 'pagado', 'pendiente', 'reserva',
  (current_date + 7)
);

insert into public.reservation_items (reservation_id, product_name, size, unit_price, quantity)
select id, 'Prueba producto SQL', 'M', 1000, 1
from public.reservations
where reservation_number = 'R-2026-TEST01';