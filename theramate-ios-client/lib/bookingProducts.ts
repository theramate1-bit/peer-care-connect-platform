import {
  isProductClinicBookable,
  isProductMobileBookable,
  normalizeTherapistType,
  type TherapistType,
} from "@/lib/booking-flow-type";
import type { PractitionerProductRow } from "@/lib/api/booking";

function toProductLike(row: PractitionerProductRow) {
  return {
    is_active: row.is_active !== false,
    service_type: row.service_type,
  };
}

export function filterClinicBookableProducts(
  therapistType: TherapistType | string | null | undefined,
  products: PractitionerProductRow[],
): PractitionerProductRow[] {
  const type = normalizeTherapistType(
    typeof therapistType === "string" ? therapistType : null,
  );
  return products.filter(
    (p) =>
      p.is_active !== false && isProductClinicBookable(type, toProductLike(p)),
  );
}

export function filterMobileBookableProducts(
  therapistType: TherapistType | string | null | undefined,
  products: PractitionerProductRow[],
): PractitionerProductRow[] {
  const type = normalizeTherapistType(
    typeof therapistType === "string" ? therapistType : null,
  );
  return products.filter(
    (p) =>
      p.is_active !== false && isProductMobileBookable(type, toProductLike(p)),
  );
}
