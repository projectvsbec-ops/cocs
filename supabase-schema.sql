-- ==========================================
-- COCS Supabase Migration Schema
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments Table
CREATE TABLE public.departments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- 2. Locations Table
CREATE TABLE public.locations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE
);

-- 3. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('Admin', 'Manager')),
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Work Updates Table
CREATE TABLE public.work_updates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  work_type text NOT NULL,
  status text NOT NULL CHECK(status IN ('Completed', 'Pending')),
  photo_url text,
  notes text DEFAULT '',
  verified_status text DEFAULT 'Pending' CHECK(verified_status IN ('Pending', 'Approved', 'Rejected')),
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verify_comment text DEFAULT '',
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. Issues Table
CREATE TABLE public.issues (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  reported_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  issue_type text NOT NULL,
  priority text NOT NULL CHECK(priority IN ('High', 'Medium', 'Low')),
  description text DEFAULT '',
  photo_url text DEFAULT '',
  status text DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Closed')) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6. Audits Table
CREATE TABLE public.audits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  findings text NOT NULL,
  score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 7. Activity Log Table
CREATE TABLE public.activity_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  detail text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper Function: Get user department
CREATE OR REPLACE FUNCTION public.get_user_department()
RETURNS uuid AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for departments
CREATE POLICY "Anyone can read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Only admins can insert/update departments" ON public.departments FOR ALL USING (public.get_user_role() = 'Admin');

-- Policies for locations
CREATE POLICY "Anyone can read locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Only admins can insert/update locations" ON public.locations FOR ALL USING (public.get_user_role() = 'Admin');

-- Policies for profiles
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Need a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email, COALESCE(new.raw_user_meta_data->>'role', 'Manager'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Policies for work_updates
CREATE POLICY "Admins can read all work updates" ON public.work_updates FOR SELECT USING (public.get_user_role() = 'Admin');
CREATE POLICY "Managers can read own department work updates" ON public.work_updates FOR SELECT USING (
  public.get_user_role() = 'Manager' AND department_id = public.get_user_department()
);
CREATE POLICY "Users can insert work updates" ON public.work_updates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers and Admins can update work updates" ON public.work_updates FOR UPDATE USING (
  public.get_user_role() = 'Admin' OR 
  (public.get_user_role() = 'Manager' AND department_id = public.get_user_department())
);

-- Policies for issues
CREATE POLICY "Admins can read all issues" ON public.issues FOR SELECT USING (public.get_user_role() = 'Admin');
CREATE POLICY "Managers can read own department issues" ON public.issues FOR SELECT USING (
  public.get_user_role() = 'Manager' AND department_id = public.get_user_department()
);
CREATE POLICY "Users can insert issues" ON public.issues FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Managers and Admins can update issues" ON public.issues FOR UPDATE USING (
  public.get_user_role() = 'Admin' OR 
  (public.get_user_role() = 'Manager' AND department_id = public.get_user_department())
);

-- Policies for audits
CREATE POLICY "Admins can read/write audits" ON public.audits FOR ALL USING (public.get_user_role() = 'Admin');
CREATE POLICY "Managers can read own department audits" ON public.audits FOR SELECT USING (
  public.get_user_role() = 'Manager' AND department_id = public.get_user_department()
);

-- Policies for activity_log
CREATE POLICY "Admins can read all activity" ON public.activity_log FOR SELECT USING (public.get_user_role() = 'Admin');
CREATE POLICY "Users can insert their own activity" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- SEED DATA (Departments & Locations)
-- ==========================================

INSERT INTO public.departments (name) VALUES 
('Electrical'), ('Purchase'), ('Maintenance'),
('MIS'), ('Security'), ('Transport'), ('Civil')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  dept RECORD;
  loc text;
  locations_list text[] := ARRAY[
    'Main Block – I', 'Main Block – II', 'Main Block – III', 
    'Admission Block', 'PG Block', 'Mechanical Block',
    'Boys Hostel – I', 'Boys Hostel – II', 
    'Girls Hostel – I', 'Girls Hostel – II',
    'Auditorium', 'Canteen Block', 'Library'
  ];
BEGIN
  FOR dept IN SELECT id FROM public.departments LOOP
    FOREACH loc IN ARRAY locations_list LOOP
      INSERT INTO public.locations (name, department_id) VALUES (loc, dept.id);
    END LOOP;
  END LOOP;
END $$;
