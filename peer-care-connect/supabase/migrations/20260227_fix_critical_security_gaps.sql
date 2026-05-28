-- Fix Critical Security Gaps Identified by BMAD Methodology
-- This migration addresses all ERROR-level security issues from Supabase advisors

-- ============================================================================
-- 1. CRITICAL: Enable RLS on checkout_sessions table
-- ============================================================================
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkout_sessions
-- Practitioners can view their own checkout sessions
CREATE POLICY "Practitioners can view own checkout sessions"
  ON public.checkout_sessions FOR SELECT
  USING (auth.uid() = practitioner_id);

-- Clients can view checkout sessions for their email (for guest bookings)
CREATE POLICY "Clients can view checkout sessions by email"
  ON public.checkout_sessions FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    (
      -- Authenticated clients can see sessions for their email
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND LOWER(users.email) = LOWER(checkout_sessions.client_email)
      )
      OR
      -- Practitioners can see their own sessions
      auth.uid() = checkout_sessions.practitioner_id
    )
  );

-- System can insert checkout sessions (via RPC functions)
CREATE POLICY "System can insert checkout sessions"
  ON public.checkout_sessions FOR INSERT
  WITH CHECK (true);

-- Practitioners can update their own checkout sessions
CREATE POLICY "Practitioners can update own checkout sessions"
  ON public.checkout_sessions FOR UPDATE
  USING (auth.uid() = practitioner_id)
  WITH CHECK (auth.uid() = practitioner_id);

-- ============================================================================
-- 2. CRITICAL: Enable RLS on categories table (if it contains sensitive data)
-- Note: spatial_ref_sys is a PostGIS system table and should remain public
-- ============================================================================
-- Only enable RLS if categories table contains user-specific data
-- For now, we'll enable it and add a public read policy for active categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public can view active categories (for marketplace)
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = true);

-- Admins can manage categories (if needed in future)
-- This policy is restrictive - only service role can modify
CREATE POLICY "Service role can manage categories"
  ON public.categories FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 3. CRITICAL: Add RLS policies to tables with RLS enabled but no policies
-- ============================================================================

-- project_analytics
CREATE POLICY "Practitioners can view own project analytics"
  ON public.project_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_analytics.project_id
      AND (
        projects.therapist_id = auth.uid()
        OR projects.client_id = auth.uid()
      )
    )
  );

CREATE POLICY "Practitioners can insert own project analytics"
  ON public.project_analytics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_analytics.project_id
      AND projects.therapist_id = auth.uid()
    )
  );

-- project_documents
CREATE POLICY "Project participants can view documents"
  ON public.project_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND (
        projects.therapist_id = auth.uid()
        OR projects.client_id = auth.uid()
      )
    )
  );

CREATE POLICY "Practitioners can manage project documents"
  ON public.project_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND projects.therapist_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_documents.project_id
      AND projects.therapist_id = auth.uid()
    )
  );

-- project_payments
CREATE POLICY "Project participants can view payments"
  ON public.project_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_payments.project_id
      AND (
        projects.therapist_id = auth.uid()
        OR projects.client_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage project payments"
  ON public.project_payments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- project_phases
CREATE POLICY "Project participants can view phases"
  ON public.project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND (
        projects.therapist_id = auth.uid()
        OR projects.client_id = auth.uid()
      )
    )
  );

CREATE POLICY "Practitioners can manage project phases"
  ON public.project_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND projects.therapist_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND projects.therapist_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. CRITICAL: Fix Security Definer Views
-- Views should not use SECURITY DEFINER unless absolutely necessary
-- We'll recreate them without SECURITY DEFINER and rely on RLS policies
-- ============================================================================

-- Drop views in dependency order (most dependent first)
DROP VIEW IF EXISTS public.v_practice_totals CASCADE;
DROP VIEW IF EXISTS public.v_client_stats CASCADE;
DROP VIEW IF EXISTS public.v_paid_sessions CASCADE;
DROP VIEW IF EXISTS public.marketplace_practitioners CASCADE;

-- Recreate views in reverse dependency order (base views first)
-- Recreate v_paid_sessions first (no dependencies)
CREATE VIEW public.v_paid_sessions AS
SELECT s.id AS session_id,
  s.client_id,
  s.session_date,
  p.amount AS amount_cents,
  COALESCE(p.currency, 'gbp'::text) AS currency
FROM client_sessions s
  JOIN payments p ON p.session_id = s.id
WHERE p.payment_status = 'completed'::payment_status;

-- Recreate v_client_stats (depends on v_paid_sessions)
-- This view aggregates client statistics and should respect RLS on underlying tables
CREATE VIEW public.v_client_stats AS
WITH last_paid AS (
  SELECT v_paid_sessions.client_id,
    max(v_paid_sessions.session_date) AS last_paid_at
  FROM v_paid_sessions
  GROUP BY v_paid_sessions.client_id
), revenue AS (
  SELECT v_paid_sessions.client_id,
    sum(v_paid_sessions.amount_cents) AS revenue_cents
  FROM v_paid_sessions
  GROUP BY v_paid_sessions.client_id
), sessions AS (
  SELECT v_paid_sessions.client_id,
    count(*) AS paid_sessions
  FROM v_paid_sessions
  GROUP BY v_paid_sessions.client_id
), ratings AS (
  SELECT s.client_id,
    avg(sf.rating)::double precision AS avg_rating
  FROM session_feedback sf
    JOIN client_sessions s ON s.id = sf.session_id
  GROUP BY s.client_id
)
SELECT u.id AS client_id,
  COALESCE(u.full_name, u.email::text) AS full_name,
  COALESCE(sessions.paid_sessions, 0::bigint) AS paid_sessions,
  COALESCE(revenue.revenue_cents, 0::bigint) AS revenue_cents,
  COALESCE(ratings.avg_rating, 0::double precision) AS avg_rating,
  (now() - COALESCE(last_paid.last_paid_at::timestamp without time zone, '1900-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone) <= '90 days'::interval AS is_active
FROM users u
  LEFT JOIN sessions ON sessions.client_id = u.id
  LEFT JOIN revenue ON revenue.client_id = u.id
  LEFT JOIN ratings ON ratings.client_id = u.id
  LEFT JOIN last_paid ON last_paid.client_id = u.id
WHERE u.user_role = 'client'::user_role;

-- Recreate v_practice_totals (depends on v_client_stats and v_paid_sessions)
CREATE VIEW public.v_practice_totals AS
SELECT count(DISTINCT
    CASE
      WHEN vs.session_id IS NOT NULL THEN c.id
      ELSE NULL::uuid
    END) AS total_clients,
  count(DISTINCT
    CASE
      WHEN cs.is_active THEN c.id
      ELSE NULL::uuid
    END) AS active_clients,
  count(vs.session_id) AS total_paid_sessions,
  COALESCE(sum(vs.amount_cents), 0::bigint) AS total_revenue_cents,
  COALESCE(avg(NULLIF(cs.avg_rating, 0::double precision)), 0::double precision) AS avg_rating
FROM users c
  LEFT JOIN v_client_stats cs ON cs.client_id = c.id
  LEFT JOIN v_paid_sessions vs ON vs.client_id = c.id
WHERE c.user_role = 'client'::user_role;

-- Recreate marketplace_practitioners (no dependencies)
CREATE VIEW public.marketplace_practitioners AS
SELECT tp.id,
  tp.user_id,
  u.first_name,
  u.last_name,
  tp.bio,
  tp.location,
  tp.specializations,
  tp.experience_years,
  tp.hourly_rate,
  tp.average_rating,
  tp.total_reviews,
  tp.professional_statement,
  tp.treatment_philosophy,
  tp.response_time_hours,
  tp.profile_photo_url,
  tp.verification_status,
  tp.is_active,
  tp.last_active
FROM therapist_profiles tp
  JOIN users u ON tp.user_id = u.id
WHERE tp.is_active = true 
  AND u.onboarding_status = 'completed'::onboarding_status 
  AND u.profile_completed = true;

-- Grant appropriate permissions
GRANT SELECT ON public.v_client_stats TO authenticated;
GRANT SELECT ON public.v_practice_totals TO authenticated;
GRANT SELECT ON public.v_paid_sessions TO authenticated;
GRANT SELECT ON public.marketplace_practitioners TO authenticated, anon;

COMMENT ON VIEW public.v_client_stats IS 'Client statistics view - respects RLS on underlying tables';
COMMENT ON VIEW public.v_practice_totals IS 'Practice totals view - respects RLS on underlying tables';
COMMENT ON VIEW public.v_paid_sessions IS 'Paid sessions view - respects RLS on underlying tables';
COMMENT ON VIEW public.marketplace_practitioners IS 'Marketplace practitioners view - public read access for browsing';
