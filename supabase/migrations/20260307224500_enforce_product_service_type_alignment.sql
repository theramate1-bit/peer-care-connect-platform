-- Ensure practitioner product service_type stays aligned with practitioner therapist_type.
-- This prevents future UI contradictions (e.g. mobile practitioner with clinic-only products).

begin;

-- 1) Backfill null or incompatible service_type values based on therapist_type.
update public.practitioner_products p
set service_type = case
  when u.therapist_type = 'mobile' then 'mobile'
  when u.therapist_type = 'clinic_based' then 'clinic'
  when u.therapist_type = 'hybrid' then coalesce(p.service_type, 'both')
  else coalesce(p.service_type, 'clinic')
end
from public.users u
where u.id = p.practitioner_id
  and (
    p.service_type is null
    or (u.therapist_type = 'mobile' and p.service_type = 'clinic')
    or (u.therapist_type = 'clinic_based' and p.service_type = 'mobile')
  );

-- 2) Trigger function: normalize and validate future writes.
create or replace function public.enforce_practitioner_product_service_type()
returns trigger
language plpgsql
as $$
declare
  v_therapist_type public.therapist_type;
begin
  select therapist_type
  into v_therapist_type
  from public.users
  where id = new.practitioner_id;

  -- Normalize missing values from practitioner type.
  if new.service_type is null then
    if v_therapist_type = 'mobile' then
      new.service_type := 'mobile';
    elsif v_therapist_type = 'clinic_based' then
      new.service_type := 'clinic';
    elsif v_therapist_type = 'hybrid' then
      new.service_type := 'both';
    end if;
  end if;

  -- Validate incompatible combinations.
  if v_therapist_type = 'mobile' and new.service_type = 'clinic' then
    raise exception 'Invalid service_type: mobile practitioner cannot have clinic-only product';
  end if;

  if v_therapist_type = 'clinic_based' and new.service_type = 'mobile' then
    raise exception 'Invalid service_type: clinic-based practitioner cannot have mobile-only product';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_practitioner_product_service_type on public.practitioner_products;

create trigger trg_enforce_practitioner_product_service_type
before insert or update on public.practitioner_products
for each row
execute function public.enforce_practitioner_product_service_type();

commit;
