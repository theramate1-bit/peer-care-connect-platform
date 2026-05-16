/**
 * Practitioner profile activation — same rules as web `peer-care-connect/src/lib/profile-completion.ts`
 * (`calculateProfileActivationStatus`, `hasValidAvailability`).
 */

export interface ProfileActivationCheck {
  id: string;
  label: string;
  isComplete: boolean;
}

export interface ProfileActivationStatus {
  percentage: number;
  completed: number;
  total: number;
  checks: ProfileActivationCheck[];
}

export type PractitionerProfileForActivation = {
  bio?: string | null;
  experience_years?: number | null;
  location?: string | null;
} | null;

/**
 * Official 6-check methodology for “activating profile” (matches web Profile page + widget).
 */
export function calculateProfileActivationStatus(
  userProfile: PractitionerProfileForActivation,
  hasAvailability: boolean | null,
  qualificationsCount: number = 0,
  productsCount: number = 0,
  qualificationDocumentsCount: number = 0,
): ProfileActivationStatus {
  if (!userProfile) {
    return {
      percentage: 0,
      completed: 0,
      total: 6,
      checks: [
        { id: "bio", label: "Professional Bio", isComplete: false },
        { id: "experience", label: "Years of Experience", isComplete: false },
        {
          id: "qualifications",
          label: "Qualifications & Document",
          isComplete: false,
        },
        {
          id: "availability",
          label: "Availability Schedule",
          isComplete: false,
        },
        { id: "location", label: "Service Location", isComplete: false },
        { id: "services", label: "Services & Pricing", isComplete: false },
      ],
    };
  }

  const checks: ProfileActivationCheck[] = [
    {
      id: "bio",
      label: "Professional Bio",
      isComplete: !!userProfile.bio && userProfile.bio.trim().length > 0,
    },
    {
      id: "experience",
      label: "Years of Experience",
      isComplete: !!userProfile.experience_years,
    },
    {
      id: "qualifications",
      label: "Qualifications & Document",
      isComplete: qualificationsCount > 0 && qualificationDocumentsCount > 0,
    },
    {
      id: "availability",
      label: "Availability Schedule",
      isComplete: hasAvailability === true,
    },
    {
      id: "location",
      label: "Service Location",
      isComplete: !!userProfile.location,
    },
    {
      id: "services",
      label: "Services & Pricing",
      isComplete: productsCount > 0,
    },
  ];

  const completed = checks.filter((c) => c.isComplete).length;
  const total = checks.length;
  const percentage = Math.round((completed / total) * 100);

  return {
    percentage,
    completed,
    total,
    checks,
  };
}

/**
 * True if at least one day is enabled with valid hours (matches web).
 */
export function hasValidAvailability(workingHours: unknown): boolean {
  if (!workingHours || typeof workingHours !== "object") {
    return false;
  }

  return Object.values(workingHours as Record<string, unknown>).some((day) => {
    if (
      !day ||
      typeof day !== "object" ||
      (day as { enabled?: boolean }).enabled !== true
    ) {
      return false;
    }

    const d = day as {
      hours?: unknown;
      start?: unknown;
      end?: unknown;
    };

    if (d.hours && Array.isArray(d.hours) && d.hours.length > 0) {
      return d.hours.some((hourBlock) => {
        if (!hourBlock || typeof hourBlock !== "object") return false;
        const h = hourBlock as { start?: string; end?: string };
        return (
          h.start &&
          h.end &&
          typeof h.start === "string" &&
          typeof h.end === "string" &&
          h.start.trim() !== "" &&
          h.end.trim() !== ""
        );
      });
    }

    if (d.start && d.end) {
      return (
        typeof d.start === "string" &&
        typeof d.end === "string" &&
        d.start.trim() !== "" &&
        d.end.trim() !== ""
      );
    }

    return false;
  });
}
