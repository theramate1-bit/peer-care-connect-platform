/**
 * Platform Fee Configuration
 * Handles calculation of application fees for Stripe Connect marketplace
 */

export const PLATFORM_FEE_PERCENT = 0.5; // 0.5% platform fee (application fee you charge practitioners)
// Note: Stripe Connect processing fees are separate:
// - Stripe Connect processing fee: 1.5% (automatically deducted by Stripe)
// - Total fee to practitioner: 2.0% (0.5% platform + 1.5% Stripe)
// - Practitioner receives: 98% of booking amount
export const STRIPE_CONNECT_FEE_PERCENT = 1.5; // Stripe Connect processing fee (automatically deducted by Stripe)

/**
 * Calculate the application fee amount in pence
 * @param amount - The total transaction amount in pence
 * @param feePercent - The fee percentage (defaults to PLATFORM_FEE_PERCENT)
 * @returns The application fee amount in pence
 */
export function calculateApplicationFee(amount: number, feePercent: number = PLATFORM_FEE_PERCENT): number {
  return Math.round(amount * (feePercent / 100));
}

/**
 * Calculate the net amount the practitioner will receive
 * @param amount - The total transaction amount in pence
 * @param applicationFee - The application fee amount in pence
 * @returns The net amount in pence
 */
export function calculatePractitionerAmount(amount: number, applicationFee: number): number {
  return amount - applicationFee;
}

/**
 * Format amount from pence to pounds for display
 * @param amountInPence - Amount in pence
 * @returns Formatted string (e.g., "£60.00")
 */
export function formatAmount(amountInPence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amountInPence / 100);
}

/**
 * Parse amount from pounds to pence
 * @param amountInPounds - Amount in pounds (e.g., 60.00)
 * @returns Amount in pence
 */
export function parseAmount(amountInPounds: number): number {
  return Math.round(amountInPounds * 100);
}

/**
 * Get fee breakdown for display
 * @param totalAmount - Total transaction amount in pence
 * @returns Object with fee breakdown
 */
export function getFeeBreakdown(totalAmount: number) {
  const applicationFee = calculateApplicationFee(totalAmount);
  const practitionerAmount = calculatePractitionerAmount(totalAmount, applicationFee);
  
  return {
    totalAmount,
    applicationFee,
    practitionerAmount,
    applicationFeePercent: PLATFORM_FEE_PERCENT,
    formattedTotal: formatAmount(totalAmount),
    formattedApplicationFee: formatAmount(applicationFee),
    formattedPractitionerAmount: formatAmount(practitionerAmount),
  };
}

/**
 * Validate pricing constraints
 * @param amount - Amount in pence
 * @returns Validation result
 */
export function validatePricing(amount: number): { isValid: boolean; error?: string } {
  // No minimum or maximum constraints - allow any positive amount
  if (amount < 0) {
    return { isValid: false, error: 'Price must be positive' };
  }
  
  return { isValid: true };
}
