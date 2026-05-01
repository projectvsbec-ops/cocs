-- ==========================================
-- COCS Supabase Production Schema
-- ==========================================

-- Enable UUID extension
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
  category text,
  latitude float8,
  longitude float8,
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

-- 4. Work Updates Table (Strict State Machine)
CREATE TABLE public.work_updates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  work_type text NOT NULL,
  claim_status text NOT NULL CHECK(claim_status IN ('Completed', 'Pending')),
  workflow_status text DEFAULT 'SUBMITTED' CHECK(workflow_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED', 'RESUBMITTED')),
  photo_url text,
  notes text DEFAULT '',
  verify_comment text DEFAULT '',
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_transition_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 5. Issues Table (Lifecycle with SLA)
CREATE TABLE public.issues (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  reported_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  issue_type text NOT NULL,
  priority text NOT NULL CHECK(priority IN ('High', 'Medium', 'Low')),
  description text DEFAULT '',
  photo_url text DEFAULT '',
  lifecycle_status text DEFAULT 'OPEN' CHECK(lifecycle_status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 6. Audits Table
CREATE TABLE public.audits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  findings text NOT NULL,
  score integer DEFAULT 0 CHECK(score >= 0 AND score <= 100),
  created_at timestamptz DEFAULT now()
);

-- 7. Activity Log Table (Immutable & Traceable)
CREATE TABLE public.activity_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL CHECK(entity_type IN ('work', 'issue', 'audit', 'system')),
  entity_id uuid,
  detail text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 8. Notifications Table
CREATE TABLE public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  entity_type text,
  entity_id uuid,
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for departments/locations
CREATE POLICY "Anyone can read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins manage departments" ON public.departments FOR ALL USING (public.get_user_role() = 'Admin');
CREATE POLICY "Anyone can read locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Admins manage locations" ON public.locations FOR ALL USING (public.get_user_role() = 'Admin');

-- Policies for profiles
CREATE POLICY "Users read profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for work_updates
CREATE POLICY "Admins read all work" ON public.work_updates FOR SELECT USING (public.get_user_role() = 'Admin');
CREATE POLICY "Managers read own work" ON public.work_updates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Managers insert work" ON public.work_updates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Only Admins update work status" ON public.work_updates FOR UPDATE USING (public.get_user_role() = 'Admin');

-- Policies for issues
CREATE POLICY "Authenticated users read issues" ON public.issues FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone insert issues" ON public.issues FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Admins and Assigned can update issues" ON public.issues FOR UPDATE USING (
  public.get_user_role() = 'Admin' OR assigned_to = auth.uid()
);

-- Policies for audits
CREATE POLICY "Admins manage audits" ON public.audits FOR ALL USING (public.get_user_role() = 'Admin');
CREATE POLICY "Managers read audits" ON public.audits FOR SELECT USING (public.get_user_role() = 'Manager');

-- Policies for activity_log
CREATE POLICY "Admins read logs" ON public.activity_log FOR SELECT USING (public.get_user_role() = 'Admin');
CREATE POLICY "System inserts logs" ON public.activity_log FOR INSERT WITH CHECK (true);

-- Policies for notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- SLA Calculation Trigger
CREATE OR REPLACE FUNCTION public.calculate_issue_sla() 
RETURNS trigger AS $$
BEGIN
  IF NEW.priority = 'High' THEN
    NEW.due_at := NEW.created_at + interval '2 hours';
  ELSIF NEW.priority = 'Medium' THEN
    NEW.due_at := NEW.created_at + interval '6 hours';
  ELSE
    NEW.due_at := NEW.created_at + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calculate_sla
  BEFORE INSERT ON public.issues
  FOR EACH ROW EXECUTE PROCEDURE public.calculate_issue_sla();

-- Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'User'), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'Manager')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
