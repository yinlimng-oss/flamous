-- ============================================================
-- Feast Dining Group Review System — Core Schema
-- ============================================================
create extension if not exists "pgcrypto";

create type sentiment_type as enum ('good', 'bad');
create type category_type as enum ('compliment', 'issue');
create type photo_version as enum ('original', 'enhanced');
create type social_platform as enum ('google', 'xhs', 'instagram', 'facebook', 'tiktok', 'lemon8');
create type admin_role as enum ('super_admin', 'group_admin', 'restaurant_admin', 'marketing', 'viewer');

-- 1. restaurants
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo text,
  google_review_url text,
  xhs_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  lemon8_url text,
  languages text[] not null default array['en','zh','ms','zh-Hant'],
  created_at timestamptz not null default now()
);

-- 2. outlets
create table outlets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  outlet_name text not null,
  location text,
  qr_code text unique, -- e.g. "napa-refined/trx"
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, outlet_name)
);

-- 5. review_categories (used for BOTH "what did you enjoy" compliments
--    and "what happened" issue tags — distinguished by category_type)
create table review_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade, -- null = global default set
  name text not null,
  category_type category_type not null default 'compliment',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- visit types ("Lunch", "Dinner", "Birthday", "Friends", "Family", "Drinks")
create table visit_types (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade, -- null = global default set
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

-- 9. customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  consent_marketing boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_customers_phone on customers(phone);
create index idx_customers_email on customers(email);

-- 3. review_sessions
create table review_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  outlet_id uuid not null references outlets(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  session_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  language text not null default 'en',
  visit_types text[] not null default '{}',
  sentiment sentiment_type,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index idx_sessions_restaurant on review_sessions(restaurant_id);
create index idx_sessions_outlet on review_sessions(outlet_id);
create index idx_sessions_created on review_sessions(created_at);

-- 4. reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references review_sessions(id) on delete cascade,
  rating int check (rating between 1 and 5),
  review_text text,           -- customer's own free-text note
  ai_generated_text jsonb,    -- { platform: { short, natural, detailed } }
  customer_comment text,      -- private "bad" feedback text
  issue_tags text[] default '{}', -- selected issue tags on the "bad" path
  created_at timestamptz not null default now()
);
create index idx_reviews_created on reviews(created_at);
create index idx_reviews_rating on reviews(rating);

-- 6. review_category_responses
create table review_category_responses (
  review_id uuid not null references reviews(id) on delete cascade,
  category_id uuid not null references review_categories(id) on delete cascade,
  selected boolean not null default true,
  rating int check (rating between 1 and 5),
  primary key (review_id, category_id)
);

-- 7. review_photos
create table review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  original_storage_url text not null,
  enhanced_storage_url text,
  selected_version photo_version not null default 'original',
  created_at timestamptz not null default now()
);
create index idx_photos_review on review_photos(review_id);

-- 8. social_posts
create table social_posts (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  platform social_platform not null,
  caption text,
  clicked_post boolean not null default false,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_social_review on social_posts(review_id);
create index idx_social_platform on social_posts(platform);

-- 10. restaurant_admins
create table restaurant_admins (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade, -- null = access to ALL restaurants (group/super admin)
  role admin_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

-- seed initial restaurants
insert into restaurants (name, slug) values
  ('Napa Refined', 'napa-refined'),
  ('Napa Thai', 'napa-thai'),
  ('Thai Co', 'thai-co');

-- seed default global categories/visit types (restaurant_id null = fallback for all)
insert into review_categories (name, category_type, sort_order) values
  ('Food taste', 'compliment', 1),
  ('Service', 'compliment', 2),
  ('Environment', 'compliment', 3),
  ('Staff friendliness', 'compliment', 4),
  ('Food presentation', 'compliment', 5),
  ('Portion', 'compliment', 6),
  ('Value for money', 'compliment', 7),
  ('Cleanliness', 'compliment', 8),
  ('Food issue', 'issue', 1),
  ('Service issue', 'issue', 2),
  ('Waiting time', 'issue', 3),
  ('Cleanliness', 'issue', 4),
  ('Wrong order', 'issue', 5),
  ('Others', 'issue', 6);

insert into visit_types (name, sort_order) values
  ('Lunch', 1), ('Dinner', 2), ('Birthday', 3),
  ('Friends', 4), ('Family', 5), ('Drinks', 6);
