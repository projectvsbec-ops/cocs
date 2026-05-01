-- ==========================================
-- COCS Archival System Schema
-- ==========================================

-- 1. Archive Logs Table
CREATE TABLE public.archive_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_name text NOT NULL,
  record_counts jsonb DEFAULT '{}',
  file_size text,
  download_status boolean DEFAULT false,
  verified_by_admin boolean DEFAULT false,
  deletion_status boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  admin_id uuid REFERENCES public.profiles(id)
);

-- 2. RLS Policies
ALTER TABLE public.archive_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view archive logs" 
ON public.archive_logs FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Admin'
  )
);

CREATE POLICY "Admins can insert archive logs" 
ON public.archive_logs FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Admin'
  )
);

CREATE POLICY "Admins can update archive logs" 
ON public.archive_logs FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Admin'
  )
);

-- 3. Activity Log entry
INSERT INTO public.activity_log (user_id, action_type, entity_type, detail)
VALUES (
  (SELECT id FROM public.profiles WHERE role = 'Admin' LIMIT 1),
  'SYSTEM_UPDATE',
  'system',
  'Archival system schema initialized'
);
