// Stripe Configuration - Production Ready
// Supports both test and live modes based on environment

import { config, FEATURES } from "./environment";

export interface StripeConfig {
  publishableKey: string;
  connectClientId: string;
  isLiveMode: boolean;
  apiVersion: string;
  currency: string;
  supportedCountries: string[];
}

// Stripe configuration
export const STRIPE_CONFIG: StripeConfig = {
  publishableKey: config.stripe.publishableKey,
  connectClientId: config.stripe.connectClientId,
  isLiveMode: FEATURES.STRIPE_LIVE_MODE,
  apiVersion: "2024-12-18",
  currency: "gbp",
  supportedCountries: ["GB", "US", "CA", "AU", "EU"],
};

// Stripe initialization options
export const STRIPE_OPTIONS = {
  apiVersion: STRIPE_CONFIG.apiVersion,
  typescript: true,
  stripeAccount: undefined, // Will be set for Connect accounts
};

// Webhook events to listen for
export const STRIPE_WEBHOOK_EVENTS = [
  // Payment events
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "payment_intent.processing",
  "payment_intent.requires_action",

  // Connect account events
  "account.updated",
  "account.application.deauthorized",
  "account.application.authorized",

  // Payout events
  "payout.paid",
  "payout.failed",
  "payout.canceled",

  // Dispute events
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",

  // Refund events
  "charge.refunded",
  "charge.refund.updated",

  // Subscription events (for platform subscriptions)
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",

  // Invoice events
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.payment_action_required",

  // Checkout events
  "checkout.session.completed",
  "checkout.session.expired",

  // Customer events
  "customer.created",
  "customer.updated",
  "customer.deleted",
] as const;

// Marketplace fee (online card payments) — keep in sync with `src/config/payments.ts` and Supabase RPCs
export const MARKETPLACE_FEE_CONFIG = {
  percent: 0.0195, // 1.95%
  fixedPence: 20, // £0.20
  currency: "gbp",
  description: "Platform marketplace fee (1.95% + 20p per booking)",
} as const;

// Connect account requirements
export const CONNECT_ACCOUNT_REQUIREMENTS = {
  business_type: ["individual", "company"],
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_profile: {
    mcc: "8011", // Health Practitioners
    url: "https://peercareconnect.com",
    product_description: "Therapy and wellness services",
  },
  tos_acceptance: {
    date: Math.floor(Date.now() / 1000),
    ip: "127.0.0.1", // Will be set dynamically
  },
};

// Payment method types
export const SUPPORTED_PAYMENT_METHODS = [
  "card",
  "sepa_debit", // For EU customers
  "bacs_debit", // For UK customers
  "sofort", // For German customers
  "ideal", // For Dutch customers
  "bancontact", // For Belgian customers
];

// Currency formatting
export const CURRENCY_FORMAT = {
  gbp: {
    symbol: "£",
    position: "before",
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  usd: {
    symbol: "$",
    position: "before",
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  eur: {
    symbol: "€",
    position: "before",
    decimalPlaces: 2,
    thousandsSeparator: ".",
    decimalSeparator: ",",
  },
};

// Error handling
export const STRIPE_ERROR_MESSAGES = {
  card_declined: "Your card was declined. Please try a different card.",
  insufficient_funds: "Your card has insufficient funds.",
  expired_card: "Your card has expired.",
  incorrect_cvc: "The security code is incorrect.",
  processing_error: "An error occurred while processing your card.",
  rate_limit: "Too many requests made to the API too quickly.",
  invalid_request: "Invalid parameters were supplied to Stripe's API.",
  authentication_error: "Authentication with Stripe's API failed.",
  api_connection_error: "Network communication with Stripe failed.",
  api_error: "An error occurred internally with Stripe's API.",
  invalid_grant: "Invalid grant.",
  invalid_client: "Invalid client.",
  invalid_scope: "Invalid scope.",
  invalid_request: "Invalid request.",
  unsupported_grant_type: "Unsupported grant type.",
  unsupported_response_type: "Unsupported response type.",
  invalid_grant: "Invalid grant.",
  invalid_client: "Invalid client.",
  invalid_scope: "Invalid scope.",
  invalid_request: "Invalid request.",
  unsupported_grant_type: "Unsupported grant type.",
  unsupported_response_type: "Unsupported response type.",
};

// Validation functions
export const validateStripeConfig = (): string[] => {
  const errors: string[] = [];

  if (!STRIPE_CONFIG.publishableKey) {
    errors.push("Stripe publishable key is required");
  }

  // Safety: publishable keys must never be secret keys.
  if (STRIPE_CONFIG.publishableKey?.startsWith("sk_")) {
    errors.push(
      "SECURITY: Stripe publishable key is set to a secret key (sk_*). Use a publishable key (pk_*) on the client.",
    );
  }

  if (FEATURES.STRIPE_LIVE_MODE) {
    if (!STRIPE_CONFIG.publishableKey.startsWith("pk_live_")) {
      errors.push("Production requires live Stripe publishable key");
    }
  } else {
    if (!STRIPE_CONFIG.publishableKey.startsWith("pk_test_")) {
      errors.push("Development requires test Stripe publishable key");
    }
  }

  return errors;
};

// Environment validation
export const validateEnvironment = (): void => {
  const errors = validateStripeConfig();

  if (errors.length > 0) {
    console.error("Stripe configuration errors:", errors);

    if (FEATURES.STRIPE_LIVE_MODE) {
      throw new Error(
        `Production Stripe configuration invalid: ${errors.join(", ")}`,
      );
    } else {
      console.warn(
        "Development mode: Stripe configuration issues will not prevent startup",
      );
    }
  }
};

// Initialize validation on import
if (typeof window !== "undefined") {
  validateEnvironment();
}

export default STRIPE_CONFIG;
