-- Location Data Retention Enforcement
-- Creates functions for automated deletion of location data after retention period
-- Required for UK GDPR data minimization and retention compliance

-- Function to delete location data for inactive users (7 years after last activity)
CREATE OR REPLACE FUNCTION delete_old_location_data()
RETURNS TABLE(deleted_count INTEGER, deleted_user_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_deleted_user_ids UUID[] := ARRAY[]::UUID[];
  v_user_id UUID;
BEGIN
  -- Find users inactive for 7+ years
  FOR v_user_id IN
    SELECT DISTINCT ul.user_id
    FROM public.user_locations ul
    INNER JOIN public.users u ON u.id = ul.user_id
    WHERE 
      u.updated_at < NOW() - INTERVAL '7 years'
      AND u.deleted_at IS NULL
      -- Don't delete if user has active bookings or sessions
      AND NOT EXISTS (
        SELECT 1 FROM public.client_sessions cs
        WHERE cs.client_id = u.id OR cs.therapist_id = u.id
        AND cs.session_date > NOW() - INTERVAL '1 year'
      )
  LOOP
    -- Log deletion before deleting
    INSERT INTO public.data_destruction_log (
      table_name,
      row_id,
      method,
      reason,
      destroyed_at
    )
    SELECT 
      'user_locations',
      ul.id,
      'automated_deletion',
      'retention_7_years_inactive',
      NOW()
    FROM public.user_locations ul
    WHERE ul.user_id = v_user_id;
    
    -- Delete location data
    DELETE FROM public.user_locations
    WHERE user_id = v_user_id;
    
    v_deleted_count := v_deleted_count + 1;
    v_deleted_user_ids := array_append(v_deleted_user_ids, v_user_id);
  END LOOP;
  
  RETURN QUERY SELECT v_deleted_count, v_deleted_user_ids;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail
  RAISE WARNING 'Error in delete_old_location_data: %', SQLERRM;
  RETURN QUERY SELECT 0, ARRAY[]::UUID[];
END;
$$;

-- Function to delete old location access logs (3 years retention)
CREATE OR REPLACE FUNCTION delete_old_location_access_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete location access logs older than 3 years
  DELETE FROM public.location_access_log
  WHERE accessed_at < NOW() - INTERVAL '3 years';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in delete_old_location_access_logs: %', SQLERRM;
  RETURN 0;
END;
$$;

-- Function to delete location data on user account deletion
CREATE OR REPLACE FUNCTION delete_user_location_data_on_account_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log deletion
  INSERT INTO public.data_destruction_log (
    table_name,
    row_id,
    method,
    reason,
    destroyed_at
  )
  SELECT 
    'user_locations',
    ul.id,
    'cascade_delete',
    'account_deletion',
    NOW()
  FROM public.user_locations ul
  WHERE ul.user_id = OLD.id;
  
  -- Delete location data (CASCADE should handle this, but explicit for logging)
  DELETE FROM public.user_locations
  WHERE user_id = OLD.id;
  
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- Don't block account deletion if logging fails
  RETURN OLD;
END;
$$;

-- Trigger to delete location data when user account is deleted
-- Note: This works with the existing CASCADE delete, but adds logging
CREATE TRIGGER trigger_delete_location_data_on_user_deletion
  AFTER DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION delete_user_location_data_on_account_deletion();

-- Function to get location data retention status (for monitoring)
CREATE OR REPLACE FUNCTION get_location_data_retention_status()
RETURNS TABLE(
  total_locations BIGINT,
  locations_eligible_for_deletion BIGINT,
  oldest_location_date TIMESTAMPTZ,
  access_logs_count BIGINT,
  access_logs_eligible_for_deletion BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.user_locations)::BIGINT AS total_locations,
    (
      SELECT COUNT(DISTINCT ul.user_id)::BIGINT
      FROM public.user_locations ul
      INNER JOIN public.users u ON u.id = ul.user_id
      WHERE 
        u.updated_at < NOW() - INTERVAL '7 years'
        AND u.deleted_at IS NULL
    ) AS locations_eligible_for_deletion,
    (SELECT MIN(created_at) FROM public.user_locations) AS oldest_location_date,
    (SELECT COUNT(*) FROM public.location_access_log)::BIGINT AS access_logs_count,
    (
      SELECT COUNT(*)::BIGINT
      FROM public.location_access_log
      WHERE accessed_at < NOW() - INTERVAL '3 years'
    ) AS access_logs_eligible_for_deletion;
END;
$$;

-- Comments
COMMENT ON FUNCTION delete_old_location_data() IS 'Deletes location data for users inactive for 7+ years (retention compliance)';
COMMENT ON FUNCTION delete_old_location_access_logs() IS 'Deletes location access logs older than 3 years';
COMMENT ON FUNCTION delete_user_location_data_on_account_deletion() IS 'Deletes location data when user account is deleted (with logging)';
COMMENT ON FUNCTION get_location_data_retention_status() IS 'Returns status of location data retention for monitoring purposes';

-- Note: These functions should be scheduled as cron jobs:
-- 1. delete_old_location_data() - Monthly
-- 2. delete_old_location_access_logs() - Monthly
-- 3. anonymize_old_ip_addresses() - Monthly (from ip_tracking_audit.sql)
-- 4. delete_old_anonymized_ip_addresses() - Monthly (from ip_tracking_audit.sql)
