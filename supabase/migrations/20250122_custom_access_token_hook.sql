-- Custom Access Token Hook for OAuth User Role Assignment
-- This hook sets the user_role in JWT claims based on intendedRole from sessionStorage

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  claims jsonb;
  user_email text;
  user_id text;
  intended_role text;
begin
  -- Extract user information from the event
  user_email := event->>'email';
  user_id := event->>'sub';
  
  -- Initialize claims
  claims := coalesce(event->'claims', '{}'::jsonb);
  
  -- Ensure 'app_metadata' exists in claims
  if jsonb_typeof(claims->'app_metadata') is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  end if;
  
  -- Try to get intended role from user metadata or default to client
  intended_role := coalesce(
    event->'user_metadata'->>'intended_role',
    event->'app_metadata'->>'intended_role',
    'client'
  );
  
  -- Set user_role in app_metadata
  claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(intended_role));
  
  -- Also set oauth_completed flag
  claims := jsonb_set(claims, '{app_metadata, oauth_completed}', 'true');
  
  -- Update the 'claims' object in the original event
  event := jsonb_set(event, '{claims}', claims);
  
  return event;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.custom_access_token_hook(jsonb) to authenticated;
