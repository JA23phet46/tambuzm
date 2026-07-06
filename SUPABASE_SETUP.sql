-- =====================================================================
-- COMPLETE RESET & INITIALIZATION SCRIPT FOR SUPABASE (TAMBU PLACEMENTS)
-- =====================================================================
-- WARNING: This script will delete any existing 'properties' and 'profiles' 
-- tables and recreate them cleanly with correct columns and Row-Level Security 
-- (RLS) policies.
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard.
-- 2. Go to "SQL Editor" on the left menu, then click "New Query".
-- 3. If there is any existing text in the editor, SELECT ALL and DELETE IT to ensure a blank slate.
-- 4. Paste this entire script and click "Run" at the bottom right.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1: CLEAN UP EXISTING TABLES & STORAGE POLICIES (FULL RESET)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ---------------------------------------------------------------------
-- STEP 2: CREATE THE 'profiles' TABLE
-- ---------------------------------------------------------------------
CREATE TABLE public.profiles (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '0977223344',
    role TEXT NOT NULL DEFAULT 'seeker',
    saved_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    is_subscribed BOOLEAN DEFAULT false NOT NULL,
    subscription_expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create ultra-permissive policies for client-side profiles operation
CREATE POLICY "Allow public read of profiles" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow public insert of profiles" 
ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update of profiles" 
ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public delete of profiles" 
ON public.profiles FOR DELETE USING (true);


-- ---------------------------------------------------------------------
-- STEP 3: CREATE THE 'properties' TABLE
-- ---------------------------------------------------------------------
CREATE TABLE public.properties (
    id TEXT PRIMARY KEY,
    title TEXT,
    name TEXT,
    price NUMERIC NOT NULL,
    location TEXT NOT NULL,
    description TEXT DEFAULT '',
    image TEXT,
    photos TEXT[] DEFAULT '{}',
    photos_array TEXT[] DEFAULT '{}',
    phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    owner_phone TEXT DEFAULT '',
    owner_whatsapp TEXT DEFAULT '',
    beds INTEGER DEFAULT 0,
    baths INTEGER DEFAULT 0,
    sqm INTEGER DEFAULT 0,
    province TEXT DEFAULT 'Lusaka',
    distance TEXT DEFAULT '',
    owner_id TEXT DEFAULT 'demo_owner123',
    owner_name TEXT DEFAULT '',
    ownerName TEXT DEFAULT '',
    verified BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create ultra-permissive policies for client-side properties operation
CREATE POLICY "Allow public read of properties" 
ON public.properties FOR SELECT USING (true);

CREATE POLICY "Allow public insert of properties" 
ON public.properties FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update of properties" 
ON public.properties FOR UPDATE USING (true);

CREATE POLICY "Allow public delete of properties" 
ON public.properties FOR DELETE USING (true);


-- ---------------------------------------------------------------------
-- STEP 4: STORAGE BUCKET CONFIGURATION FOR PHOTO UPLOADS
-- ---------------------------------------------------------------------
-- Ensure the storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop any conflicting storage policies if they exist from previous configurations
DROP POLICY IF EXISTS "Allow public image access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public image uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public image updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public image deletions" ON storage.objects;

-- Create brand new, clean permissive storage policies
CREATE POLICY "Allow public image access"
ON storage.objects FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Allow public image uploads"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Allow public image updates"
ON storage.objects FOR UPDATE USING (bucket_id = 'property-images');

CREATE POLICY "Allow public image deletions"
ON storage.objects FOR DELETE USING (bucket_id = 'property-images');


-- =====================================================================
-- SUCCESS! YOUR TAMBU SUPABASE ENVIRONMENT IS FULLY INITIALIZED.
-- =====================================================================
