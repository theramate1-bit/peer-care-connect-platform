/**
 * Online marketplace platform fee — must match Postgres (e.g. `create_mobile_booking_request`)
 * and migration `update_commission_to_195_plus_20p`: 1.95% of gross + 20p.
 */
export function calculatePlatformFeePence(grossPence: number): number {
  return Math.round(grossPence * 0.0195) + 20;
}
