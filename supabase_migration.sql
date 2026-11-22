-- DakMitra Supabase Schema & Security Hardening Migration
-- Run this in your Supabase SQL Editor to align the database with the frontend fixes.

-- 1. Add missing mts_list column required by SO/HO staff editor in index.html
ALTER TABLE public.post_offices
  ADD COLUMN IF NOT EXISTS mts_list jsonb DEFAULT '[]'::jsonb;

-- 2. Attach existing check_self_vote() trigger to request_approvals
DROP TRIGGER IF EXISTS trg_check_self_vote ON public.request_approvals;
CREATE TRIGGER trg_check_self_vote
  BEFORE INSERT ON public.request_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_self_vote();

-- 3. Restrict direct voting inserts so non-admins cannot spoof is_admin = true
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.request_approvals;
CREATE POLICY "Authenticated users can vote"
  ON public.request_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = approved_by
    AND (
      is_admin = false
      OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    )
  );

-- 4. Restrict profiles SELECT to authenticated staff only (stops public/anon PII scraping)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Authenticated staff can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Replace overly broad post_offices UPDATE policy with a safe RPC for staff details only
-- (Prevents non-admins from directly modifying Address, Office, Pin, or is_deleted via API)
CREATE OR REPLACE FUNCTION public.update_office_staff_details(
  p_office_id bigint,
  p_bpm_name text DEFAULT NULL,
  p_bpm_contact text DEFAULT NULL,
  p_abpm_name text DEFAULT NULL,
  p_abpm_contact text DEFAULT NULL,
  p_spm_name text DEFAULT NULL,
  p_spm_contact text DEFAULT NULL,
  p_pm_name text DEFAULT NULL,
  p_pm_contact text DEFAULT NULL,
  p_pa_list jsonb DEFAULT NULL,
  p_mts_list jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.post_offices
  SET
    bpm_name     = COALESCE(p_bpm_name, bpm_name),
    bpm_contact  = COALESCE(p_bpm_contact, bpm_contact),
    abpm_name    = COALESCE(p_abpm_name, abpm_name),
    abpm_contact = COALESCE(p_abpm_contact, abpm_contact),
    spm_name     = COALESCE(p_spm_name, spm_name),
    spm_contact  = COALESCE(p_spm_contact, spm_contact),
    pm_name      = COALESCE(p_pm_name, pm_name),
    pm_contact   = COALESCE(p_pm_contact, pm_contact),
    pa_list      = COALESCE(p_pa_list, pa_list),
    mts_list     = COALESCE(p_mts_list, mts_list)
  WHERE id = p_office_id AND is_deleted = false;
END;
$$;

-- Optional hardening (uncomment after verifying your app uses RPC or admins-only direct writes):
-- DROP POLICY IF EXISTS "Allow authenticated users to update office staff details" ON public.post_offices;
-- DROP POLICY IF EXISTS "Users can insert own post offices" ON public.post_offices;
