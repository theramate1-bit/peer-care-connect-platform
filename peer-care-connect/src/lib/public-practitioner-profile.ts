import { supabase } from '@/integrations/supabase/client';

export type TherapistType = 'clinic_based' | 'mobile' | 'hybrid' | null;

export interface PublicQualification {
  id: string;
  name: string;
  institution?: string | null;
  year_obtained?: number | null;
  verified?: boolean | null;
}

export interface PublicQualificationDocument {
  id: string;
  file_url: string;
  file_name: string;
  file_type?: string | null;
  file_size_bytes?: number | null;
}

export interface PublicProfileProduct {
  id: string;
  name: string;
  description?: string | null;
  price_amount: number;
  duration_minutes?: number | null;
  service_type?: 'clinic' | 'mobile' | 'both' | null;
  is_active: boolean;
}

export interface PublicPractitionerProfile {
  id: string;
  first_name: string;
  last_name: string;
  user_role?: string | null;
  profile_photo_url?: string | null;
  bio?: string | null;
  experience_years?: number | null;
  specializations?: string[];
  services_offered?: string[];
  professional_body?: string | null;
  professional_body_other?: string | null;
  registration_number?: string | null;
  qualification_type?: string | null;
  therapist_type?: TherapistType;
  base_latitude?: number | null;
  base_longitude?: number | null;
  clinic_address?: string | null;
  address_city?: string | null;
  location?: string | null;
  base_address?: string | null;
  mobile_service_radius_km?: number | null;
  has_liability_insurance?: boolean | null;
  qualifications: PublicQualification[];
  qualificationDocuments: PublicQualificationDocument[];
  products: PublicProfileProduct[];
}

export interface PublicLocationDisplay {
  summary: string | null;
  mapAddress?: string | null;
}

const splitAddressSegments = (address?: string | null): string[] =>
  (address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const sanitizeAreaSegment = (segment: string): string =>
  segment
    .replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const isStreetLikeSegment = (value: string): boolean =>
  /\b(street|st|road|rd|avenue|ave|lane|ln|close|crescent|drive|dr|way|court|ct|place|pl|gardens|square|sq)\b/i.test(
    value
  );

const getSafeLocalityFromBaseAddress = (baseAddress?: string | null): string | null => {
  const segments = splitAddressSegments(baseAddress);
  if (segments.length === 0) return null;

  // Prefer locality-like segments (no house number, postcode, or street-level labels).
  for (const raw of segments) {
    const value = sanitizeAreaSegment(raw);
    if (!value) continue;
    const hasNumber = /\d/.test(value);
    if (!hasNumber && !isStreetLikeSegment(value)) return value;
  }

  return null;
};

const formatRadiusText = (radius?: number | null): string | null =>
  radius != null && radius > 0 ? `${radius} km` : null;

export const getPublicLocationDisplay = (profile: {
  therapist_type?: TherapistType;
  clinic_address?: string | null;
  address_city?: string | null;
  location?: string | null;
  base_address?: string | null;
  mobile_service_radius_km?: number | null;
}): PublicLocationDisplay => {
  const therapistType = profile.therapist_type ?? null;
  const clinicAddress = profile.clinic_address?.trim() || null;
  const city = profile.address_city?.trim() || null;
  const safeLocality = getSafeLocalityFromBaseAddress(profile.base_address);
  // For mobile privacy, do not trust raw location (it may contain copied base address).
  const mobileArea = city || safeLocality || 'Local area';
  const area = city || profile.location?.trim() || safeLocality || 'Local area';
  const radiusText = formatRadiusText(profile.mobile_service_radius_km);

  if (therapistType === 'mobile') {
    return {
      summary: radiusText ? `${mobileArea} • Serves within ${radiusText}` : mobileArea,
      mapAddress: null,
    };
  }

  if (therapistType === 'hybrid') {
    if (clinicAddress) {
      return {
        summary: radiusText ? `${clinicAddress} • Also travels within ${radiusText}` : clinicAddress,
        mapAddress: clinicAddress,
      };
    }
    return {
      summary: radiusText ? `Also travels within ${radiusText}` : area,
      mapAddress: null,
    };
  }

  return {
    summary: clinicAddress || area,
    mapAddress: clinicAddress || null,
  };
};

export const formatProfessionalBody = (
  body?: string | null,
  bodyOther?: string | null
): string | null => {
  if (!body) return null;
  if (body === 'other') return bodyOther?.trim() || null;

  const bodyMap: Record<string, string> = {
    british_association_of_sports_rehabilitators: 'British Association of Sports Rehabilitators',
    society_of_sports_therapists: 'Society of Sports Therapists',
    chartered_society_of_physiotherapy: 'Chartered Society of Physiotherapy',
    general_osteopathic_council: 'General Osteopathic Council',
    british_osteopathic_association: 'British Osteopathic Association',
    institute_of_osteopathy: 'Institute of Osteopathy',
    complementary_and_natural_healthcare_council: 'Complementary and Natural Healthcare Council',
    federation_of_holistic_therapists: 'Federation of Holistic Therapists',
    massage_therapy_institute: 'Massage Therapy Institute',
  };

  if (bodyMap[body.toLowerCase()]) return bodyMap[body.toLowerCase()];

  return body
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const formatQualificationType = (qualification?: string | null): string | null => {
  if (!qualification) return null;

  const map: Record<string, string> = {
    itmmif: 'ITMMIF (International Therapist Management in Football)',
    atmmif: 'ATMMIF (Advanced Therapist Management in Football)',
    basrat_qualification: 'BASRaT Qualification',
    basrat: 'BASRaT Qualification',
    equivalent: 'Equivalent Qualification',
    none: 'None',
  };

  if (map[qualification.toLowerCase()]) return map[qualification.toLowerCase()];

  return qualification
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const formatRoleDisplayName = (role?: string | null): string => {
  if (!role) return 'Practitioner';
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const fetchPublicPractitionerProfile = async (
  practitionerId: string
): Promise<PublicPractitionerProfile | null> => {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      user_role,
      bio,
      experience_years,
      professional_body,
      professional_body_other,
      registration_number,
      qualification_type,
      therapist_type,
      base_latitude,
      base_longitude,
      clinic_address,
      address_city,
      location,
      base_address,
      mobile_service_radius_km,
      has_liability_insurance,
      profile_photo_url,
      services_offered,
      specializations
    `)
    .eq('id', practitionerId)
    .single();

  if (userError || !userData) {
    throw userError ?? new Error('Practitioner not found');
  }

  const [{ data: qualifications }, { data: documents }, { data: products }] = await Promise.all([
    supabase
      .from('qualifications')
      .select('id, name, institution, year_obtained, verified')
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: true }),
    supabase
      .from('practitioner_qualification_documents')
      .select('id, file_url, file_name, file_type, file_size_bytes')
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('practitioner_products')
      .select('id, name, description, price_amount, duration_minutes, service_type, is_active')
      .eq('practitioner_id', practitionerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  return {
    id: userData.id,
    first_name: userData.first_name ?? '',
    last_name: userData.last_name ?? '',
    user_role: userData.user_role ?? null,
    profile_photo_url: userData.profile_photo_url ?? null,
    bio: userData.bio ?? null,
    experience_years: userData.experience_years ?? null,
    specializations: Array.isArray(userData.specializations) ? userData.specializations : [],
    services_offered: Array.isArray(userData.services_offered) ? userData.services_offered : [],
    professional_body: userData.professional_body ?? null,
    professional_body_other: userData.professional_body_other ?? null,
    registration_number: userData.registration_number ?? null,
    qualification_type: userData.qualification_type ?? null,
    therapist_type: (userData.therapist_type as TherapistType) ?? null,
    base_latitude: userData.base_latitude ?? null,
    base_longitude: userData.base_longitude ?? null,
    clinic_address: userData.clinic_address ?? null,
    address_city: (userData as typeof userData & { address_city?: string | null }).address_city ?? null,
    location: userData.location ?? null,
    base_address: userData.base_address ?? null,
    mobile_service_radius_km: userData.mobile_service_radius_km ?? null,
    has_liability_insurance: userData.has_liability_insurance ?? null,
    qualifications: (qualifications ?? []).map((q) => ({
      id: q.id,
      name: q.name,
      institution: q.institution ?? null,
      year_obtained: q.year_obtained ?? null,
      verified: q.verified ?? null,
    })),
    qualificationDocuments: (documents ?? []).map((doc) => ({
      id: doc.id,
      file_url: doc.file_url,
      file_name: doc.file_name,
      file_type: doc.file_type ?? null,
      file_size_bytes: doc.file_size_bytes ?? null,
    })),
    products: (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      price_amount: p.price_amount,
      duration_minutes: p.duration_minutes ?? null,
      service_type: p.service_type ?? null,
      is_active: p.is_active,
    })),
  };
};
