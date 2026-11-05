-- Pizzeria D Café - Complete Supabase PostgreSQL Schema & Realtime Setup

-- 1. Create Enums
create type user_role as enum ('customer', 'admin', 'kitchen');
create type order_status as enum ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
create type payment_method as enum ('cod', 'online_transfer');
create type payment_status as enum ('unpaid', 'proof_submitted', 'verified', 'failed');

-- 2. Customer & Staff Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique not null,
  full_name text,
  address text,
  landmark text,
  role user_role default 'customer',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Categories & Menu Items
create table if not exists public.categories (
  id serial primary key,
  name text not null,
  slug text unique not null,
  description text,
  display_order int default 0
);

create table if not exists public.menu_items (
  id serial primary key,
  category_id int references public.categories(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  is_available boolean default true,
  base_price numeric(10,2) not null,
  has_sizes boolean default false,
  badge text,
  spice_level text default 'Mild',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.item_variants (
  id serial primary key,
  menu_item_id int references public.menu_items(id) on delete cascade,
  size_name text not null,
  price numeric(10,2) not null
);

-- 4. Orders & Order Items
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number serial,
  customer_id uuid references public.profiles(id),
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  landmark text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 100,
  total_amount numeric(10,2) not null,
  payment_method payment_method not null,
  payment_status payment_status default 'unpaid',
  payment_receipt_url text,
  verified_transaction_id text,
  verification_details jsonb,
  order_status order_status default 'pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.order_items (
  id serial primary key,
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id int references public.menu_items(id),
  variant_id int references public.item_variants(id),
  item_name text not null,
  size_name text,
  unit_price numeric(10,2) not null,
  quantity int not null default 1,
  addons jsonb, -- e.g. [{"name": "Extra Cheese", "price": 250}]
  special_instructions text
);

-- 5. Realtime Publication
alter publication supabase_realtime add table public.orders;

-- 6. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public read for categories & menu
create policy "Allow public read categories" on public.categories for select using (true);
create policy "Allow public read menu_items" on public.menu_items for select using (true);
create policy "Allow public read item_variants" on public.item_variants for select using (true);

-- Allow public creation of orders and order_items
create policy "Allow public create orders" on public.orders for insert with check (true);
create policy "Allow public read own orders" on public.orders for select using (true);
create policy "Allow public update order status" on public.orders for update using (true);

create policy "Allow public create order_items" on public.order_items for insert with check (true);
create policy "Allow public read order_items" on public.order_items for select using (true);

