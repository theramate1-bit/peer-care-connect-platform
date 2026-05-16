/**
 * UK-focused address checks — aligned with web `validateDetailedStreetAddress`.
 */

export type AddressValidationResult = {
  isValid: boolean;
  message?: string;
};

const UK_POSTCODE_PATTERN =
  /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/;

/** Rejects generic place-only values for mobile base addresses. */
export function validateDetailedStreetAddress(
  address: string | null | undefined,
): AddressValidationResult {
  const value = address?.trim() || "";

  if (!value) {
    return { isValid: false, message: "Address is required." };
  }

  const hasStreetNumber = /\d/.test(value);
  const hasUkPostcode = UK_POSTCODE_PATTERN.test(value);
  const hasCommaParts =
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean).length >= 2;

  if (!hasStreetNumber && !hasUkPostcode) {
    return {
      isValid: false,
      message:
        "Please enter a full base address (street + postcode), not just a town or city.",
    };
  }

  if (!hasCommaParts && !hasUkPostcode) {
    return {
      isValid: false,
      message:
        "Please enter a full address with postcode for accurate travel radius.",
    };
  }

  return { isValid: true };
}
