-- ============================================================================
-- PIZZERIA D CAFÉ - PRODUCTION POSTGRESQL SCHEMA (v2)
-- Architecture: Delivery + Pickup, COD + Online, KDS, Riders, Settlements, Fraud Check
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. ENUMS
do $$ begin
  create type user_role as enum ('super_admin', 'branch_manager', 'kitchen_staff', 'rider', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fulfillment_type as enum ('delivery', 'pickup');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cod', 'online');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending_payment', 'paid', 'failed', 'refunded', 'partially_refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'pending_payment',      -- Online orders waiting for gateway confirmation
    'pending_confirmation', -- COD waiting for OTP / acceptance
    'confirmed',            -- Accepted by kitchen
    'preparing',            -- In oven / cooking
    'ready_for_dispatch',   -- Ready for pickup or rider assignment
    'out_for_delivery',     -- Rider en route (delivery only)
    'delivered',            -- Handed to customer (cash collected if COD)
    'picked_up',            -- Handed over at counter (pickup only)
    'cancelled',            -- Cancelled by user or store
    'failed_delivery'       -- Refused or customer unreachable
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type rider_status as enum ('offline', 'available', 'delivering', 'settling_shift');
exception when duplicate_object then null; end $$;

-- 2. BRANCHES & DELIVERY ZONES
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text not null,
  email text,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  is_active boolean default true,
  is_delivery_paused boolean default false,
  extra_prep_time_mins int default 0,
  max_pickup_slots_per_15m int default 6,
  opening_time time not null default '11:00:00',
  closing_time time not null default '23:59:59', -- 12:00 cutoff policy
  created_at timestamptz default now()
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete cascade,
  zone_name text not null,
  min_order_amount numeric(10,2) not null default 1000.00,
  free_delivery_threshold numeric(10,2) default 1500.00,
  delivery_fee numeric(10,2) not null default 100.00,
  estimated_delivery_mins int default 45,
  max_radius_km numeric(5,2) not null default 10.00,
  is_active boolean default true
);

-- 3. USERS, ROLES & CUSTOMERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  full_name text not null,
  email text,
  password_hash text,
  role user_role not null default 'customer',
  branch_id uuid references public.branches(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  label text default 'Home',
  address_line text not null,
  landmark text,
  latitude double precision,
  longitude double precision,
  zone_id uuid references public.delivery_zones(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. MENU HIERARCHY & MODIFIERS
create table if not exists public.categories (
  id serial primary key,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  slug text unique not null,
  display_order int default 0,
  is_active boolean default true
);

create table if not exists public.menu_items (
  id serial primary key,
  category_id int references public.categories(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  base_price numeric(10,2) not null,
  is_available boolean default true,
  is_popular boolean default false,
  badge text,
  created_at timestamptz default now()
);

create table if not exists public.modifier_groups (
  id serial primary key,
  name text not null,
  min_selection int default 0,
  max_selection int default 1,
  is_required boolean default false
);

create table if not exists public.menu_item_modifier_groups (
  menu_item_id int references public.menu_items(id) on delete cascade,
  modifier_group_id int references public.modifier_groups(id) on delete cascade,
  primary key (menu_item_id, modifier_group_id)
);

create table if not exists public.modifiers (
  id serial primary key,
  group_id int references public.modifier_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(10,2) not null default 0.00,
  is_available boolean default true
);

-- 5. RIDERS
create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  rider_name text not null,
  phone text not null,
  vehicle_number text,
  current_status rider_status default 'available',
  active_orders_count int default 0,
  created_at timestamptz default now()
);

-- 6. ORDERS & TRANSACTIONS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial unique,
  idempotency_key text unique not null,
  branch_id uuid references public.branches(id) not null,
  customer_id uuid references public.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  fulfillment_type fulfillment_type not null default 'delivery',
  delivery_address text,
  landmark text,
  zone_id uuid references public.delivery_zones(id) on delete set null,
  pickup_code text,
  scheduled_for timestamptz,
  
  -- Server Calculated Pricing
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0.00,
  discount_amount numeric(10,2) not null default 0.00,
  tax_amount numeric(10,2) not null default 0.00,
  total_amount numeric(10,2) not null,
  
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending_payment',
  order_status order_status not null default 'pending_confirmation',
  
  rider_id uuid references public.riders(id) on delete set null,
  cooking_notes text,
  cancellation_reason text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id serial primary key,
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id int references public.menu_items(id),
  item_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null default 1,
  total_price numeric(10,2) not null,
  selected_modifiers jsonb default '[]'::jsonb
);

create table if not exists public.order_status_history (
  id serial primary key,
  order_id uuid references public.orders(id) on delete cascade,
  previous_status order_status,
  new_status order_status not null,
  changed_by text,
  notes text,
  created_at timestamptz default now()
);

-- 7. PAYMENTS, WEBHOOKS & SETTLEMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  gateway_name text not null,
  gateway_transaction_id text unique,
  idempotency_key text unique not null,
  amount numeric(10,2) not null,
  currency text default 'PKR',
  status payment_status not null,
  gateway_response jsonb,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.cod_settlements (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id) not null,
  branch_id uuid references public.branches(id) not null,
  shift_date date not null default current_date,
  total_delivered_orders int not null,
  expected_cash numeric(10,2) not null,
  handed_over_cash numeric(10,2) not null,
  discrepancy numeric(10,2) generated always as (handed_over_cash - expected_cash) stored,
  settled_by_manager text not null,
  notes text,
  created_at timestamptz default now()
);

-- 8. FRAUD PREVENTION, OTP & BLOCKED PHONES
create table if not exists public.blocked_phones (
  phone text primary key,
  reason text not null,
  failed_cod_count int default 1,
  blocked_at timestamptz default now()
);

create table if not exists public.phone_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp_code text not null,
  is_verified boolean default false,
  attempts int default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- 9. SEED DATA (Pizzeria D Café Lahore)
insert into public.branches (id, name, slug, phone, address, latitude, longitude, is_active)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Pizzeria D Café - Main Branch',
  'lahore-main',
  '0308-4382003',
  'Pizzeria D Café, Lahore, Pakistan',
  31.5204,
  74.3587,
  true
) on conflict (slug) do nothing;

insert into public.delivery_zones (id, branch_id, zone_name, min_order_amount, free_delivery_threshold, delivery_fee, max_radius_km)
values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Core Delivery Zone (0-5km)', 1000.00, 1500.00, 100.00, 5.00),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Extended Delivery Zone (5-10km)', 1200.00, 2000.00, 150.00, 10.00)
on conflict (id) do nothing;

-- Demo Riders (using valid hex UUIDs)
insert into public.riders (id, branch_id, rider_name, phone, vehicle_number, current_status)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ali Hassan (Rider 1)', '0300-1122334', 'LEA-4521', 'available'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Usman Tariq (Rider 2)', '0321-9988776', 'LEN-8812', 'available')
on conflict (id) do nothing;

-- 10. REALTIME PUBLICATION (idempotent)
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;

