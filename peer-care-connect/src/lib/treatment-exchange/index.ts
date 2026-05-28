/**
 * Treatment Exchange Module - Main Entry Point
 * 
 * This module provides a unified interface for treatment exchange functionality.
 * It re-exports all types and functions from sub-modules for easy importing.
 * 
 * @example
 * ```typescript
 * // Import everything from main module
 * import { TreatmentExchangeService, getEligiblePractitioners } from '@/lib/treatment-exchange';
 * 
 * // Or import from specific sub-modules
 * import { getEligiblePractitioners } from '@/lib/treatment-exchange/matching';
 * import { checkCreditBalance } from '@/lib/treatment-exchange/credits';
 * ```
 */

// Re-export types
export type {
  TreatmentExchangePreferences,
  ExchangeRequest,
  MutualExchangeSession,
  EligiblePractitioner,
  PractitionerFilters,
  CreditBalanceResult
} from './types';

// Re-export matching utilities
export {
  getEligiblePractitioners,
  getStarRatingTier,
  calculateDistance
} from './matching';

// Re-export credit utilities
export {
  checkCreditBalance,
  calculateRequiredCredits
} from './credits';

// Re-export main service class
export { TreatmentExchangeService } from '../treatment-exchange';
