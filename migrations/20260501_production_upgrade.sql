-- ==========================================
-- PRODUCTION UPGRADE MIGRATION
-- ==========================================

-- 1. Locations Category & Geo
ALTER TABLE public.locations 
ADD COLUMN category text,
ADD COLUMN latitude float8,
ADD COLUMN longitude float8;

-- 2. Work Updates Workflow
-- We'll keep existing status but add workflow_status for the state machine
ALTER TABLE public.work_updates 
ADD COLUMN workflow_status text DEFAULT 'SUBMITTED' CHECK (workflow_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED', 'RESUBMITTED')),
ADD COLUMN last_transition_at timestamptz DEFAULT now();

-- 3. Issues Lifecycle & SLA
ALTER TABLE public.issues 
ADD COLUMN lifecycle_status text DEFAULT 'OPEN' CHECK (lifecycle_status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED')),
ADD COLUMN assigned_to uuid REFERENCES public.profiles(id),
ADD COLUMN due_at timestamptz,
ADD COLUMN resolved_at timestamptz,
ADD COLUMN closed_at timestamptz;

-- SLA Trigger Function
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

-- 4. Activity Log Enhancements
ALTER TABLE public.activity_log 
ADD COLUMN entity_type text,
ADD COLUMN entity_id uuid,
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- 5. Notifications Table
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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 6. Updated RLS Policies
-- Only Admins can verify/approve
DROP POLICY IF EXISTS "Managers and Admins can update work updates" ON public.work_updates;
CREATE POLICY "Only Admins can update work updates" ON public.work_updates 
FOR UPDATE USING (public.get_user_role() = 'Admin');

DROP POLICY IF EXISTS "Managers and Admins can update issues" ON public.issues;
CREATE POLICY "Only Admins and Assigned Managers can update issues" ON public.issues 
FOR UPDATE USING (
  public.get_user_role() = 'Admin' OR 
  (public.get_user_role() = 'Manager' AND assigned_to = auth.uid())
);
