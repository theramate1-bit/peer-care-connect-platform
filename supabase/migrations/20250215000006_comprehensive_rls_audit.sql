-- Comprehensive RLS Audit and Enforcement
-- Cyber Essentials Plus 2026 Compliance
-- Ensures all tables have Row Level Security enabled with appropriate policies

-- Function to audit RLS status on all tables
CREATE OR REPLACE FUNCTION audit_rls_status()
RETURNS TABLE (
  schema_name TEXT,
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT,
  policies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_schema::TEXT,
    t.table_name::TEXT,
    COALESCE(c.relrowsecurity, false) as rls_enabled,
    COUNT(p.polname)::BIGINT as policy_count,
    COALESCE(ARRAY_AGG(p.polname) FILTER (WHERE p.polname IS NOT NULL), ARRAY[]::TEXT[]) as policies
  FROM information_schema.tables t
  LEFT JOIN pg_class c ON c.relname = t.table_name
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'pg_%'
    AND t.table_name NOT LIKE '_prisma%'
  GROUP BY t.table_schema, t.table_name, c.relrowsecurity
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a table needs RLS
CREATE OR REPLACE FUNCTION table_needs_rls(p_table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_sensitive_data BOOLEAN;
BEGIN
  -- Check if table contains user data, personal information, or sensitive data
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = p_table_name
      AND (
        c.column_name IN ('user_id', 'email', 'phone', 'address', 'location', 'ip_address', 'password', 'token', 'secret', 'key')
        OR c.column_name LIKE '%personal%'
        OR c.column_name LIKE '%sensitive%'
        OR c.column_name LIKE '%private%'
      )
  ) INTO v_has_sensitive_data;
  
  RETURN v_has_sensitive_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables that need it (if not already enabled)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT IN (
        -- Tables that don't need RLS (public reference data)
        'migrations',
        'schema_migrations'
      )
  LOOP
    -- Check if RLS is enabled
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = r.table_name
        AND c.relrowsecurity = true
    ) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
      
      -- Log the action
      RAISE NOTICE 'Enabled RLS on table: %', r.table_name;
    END IF;
  END LOOP;
END $$;

-- Create default deny-all policy for tables without policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      t.table_name,
      COUNT(p.polname) as policy_count
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE 'pg_%'
      AND EXISTS (
        SELECT 1 FROM pg_class c2
        JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
        WHERE n2.nspname = 'public'
          AND c2.relname = t.table_name
          AND c2.relrowsecurity = true
      )
    GROUP BY t.table_name
    HAVING COUNT(p.polname) = 0
  LOOP
    -- Create deny-all policy as safety measure
    EXECUTE format(
      'CREATE POLICY "deny_all_%s" ON public.%I FOR ALL USING (false)',
      r.table_name,
      r.table_name
    );
    
    RAISE NOTICE 'Created deny-all policy on table: %', r.table_name;
  END LOOP;
END $$;

-- Grant execute permission on audit functions
GRANT EXECUTE ON FUNCTION audit_rls_status() TO authenticated;
GRANT EXECUTE ON FUNCTION table_needs_rls(TEXT) TO authenticated;

-- Create view for RLS audit dashboard
CREATE OR REPLACE VIEW rls_audit_dashboard AS
SELECT 
  schema_name,
  table_name,
  rls_enabled,
  policy_count,
  policies,
  CASE 
    WHEN rls_enabled = false THEN 'CRITICAL: RLS not enabled'
    WHEN policy_count = 0 THEN 'WARNING: No policies defined'
    WHEN policy_count < 2 THEN 'INFO: Limited policies'
    ELSE 'OK: Adequate policies'
  END as status
FROM audit_rls_status()
ORDER BY 
  CASE 
    WHEN rls_enabled = false THEN 1
    WHEN policy_count = 0 THEN 2
    WHEN policy_count < 2 THEN 3
    ELSE 4
  END,
  table_name;

-- Grant select on audit dashboard
GRANT SELECT ON rls_audit_dashboard TO authenticated;

COMMENT ON FUNCTION audit_rls_status() IS 'Audits RLS status on all tables for Cyber Essentials Plus compliance';
COMMENT ON FUNCTION table_needs_rls(TEXT) IS 'Determines if a table contains sensitive data requiring RLS';
COMMENT ON VIEW rls_audit_dashboard IS 'Dashboard view for RLS compliance status';
