// Environment Configuration
// Handles production vs development settings

export interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  apiUrl: string;
  stripe: {
    publishableKey: string;
    connectClientId: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    name: string;
    version: string;
    domain: string;
  };
}

// Environment detection
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;
const isTest = import.meta.env.MODE === "test";

// Production configuration
const productionConfig: EnvironmentConfig = {
  isProduction: true,
  isDevelopment: false,
  isTest: false,
  apiUrl: import.meta.env.VITE_API_URL || "https://api.peercareconnect.com",
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
    connectClientId: import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID || "",
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || "",
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  },
  app: {
    name: "Theramate",
    version: "1.0.0",
    domain: "peercareconnect.com",
  },
};

// Development configuration
const developmentConfig: EnvironmentConfig = {
  isProduction: false,
  isDevelopment: true,
  isTest: false,
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:5173",
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
    connectClientId: import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID || "",
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || "",
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  },
  app: {
    name: "Peer Care Connect (Dev)",
    version: "1.0.0-dev",
    domain: "localhost:5173",
  },
};

// Test configuration
const testConfig: EnvironmentConfig = {
  isProduction: false,
  isDevelopment: false,
  isTest: true,
  apiUrl: "http://localhost:3000",
  stripe: {
    publishableKey: "pk_test_test_key",
    connectClientId: "ca_test_connect_client_id",
  },
  supabase: {
    url: "https://test.supabase.co",
    anonKey: "test_anon_key",
  },
  app: {
    name: "Peer Care Connect (Test)",
    version: "1.0.0-test",
    domain: "localhost:3000",
  },
};

// Export the appropriate configuration
export const config: EnvironmentConfig = isProduction
  ? productionConfig
  : isTest
    ? testConfig
    : developmentConfig;

// Environment helpers
export const isProd = config.isProduction;
export const isDev = config.isDevelopment;
export const isTestEnv = config.isTest;

// Feature flags
export const FEATURES = {
  PAYMENT_DEMO: isDev || isTestEnv, // Only show demo in dev/test
  MOCK_PAYMENTS: isDev || isTestEnv, // Only allow mock payments in dev/test
  DEBUG_LOGGING: isDev || isTestEnv, // Only show debug logs in dev/test
  STRIPE_LIVE_MODE: isProd, // Use live Stripe in production
  HTTPS_REQUIRED: isProd, // Require HTTPS in production
  ANALYTICS: isProd, // Enable analytics in production
} as const;

// Validation
export const validateEnvironment = (): string[] => {
  const errors: string[] = [];

  // Validate required environment variables for all environments
  const requiredVars = {
    stripe: {
      publishableKey: "VITE_STRIPE_PUBLISHABLE_KEY",
      connectClientId: "VITE_STRIPE_CONNECT_CLIENT_ID",
    },
    supabase: {
      url: "VITE_SUPABASE_URL",
      anonKey: "VITE_SUPABASE_ANON_KEY",
    },
  };

  // Hosted Checkout only: publishable key is optional on web (no Stripe.js in bundle).
  if (isDev && config.stripe.publishableKey) {
    if (
      !config.stripe.publishableKey.startsWith("pk_test_") &&
      !config.stripe.publishableKey.startsWith("sk_")
    ) {
      errors.push(
        "Development Stripe key should be pk_test_* when VITE_STRIPE_PUBLISHABLE_KEY is set",
      );
    }
  }

  // Check development environment
  if (isDev) {
    if (!config.supabase.url) {
      errors.push(
        `Missing required environment variable: ${requiredVars.supabase.url}`,
      );
    }
    if (!config.supabase.anonKey) {
      errors.push(
        `Missing required environment variable: ${requiredVars.supabase.anonKey}`,
      );
    }
  }

  // Guardrail: never ship Stripe secrets to the client bundle (any environment).
  // Anything prefixed with VITE_ is exposed via import.meta.env and ends up in built JS.
  const viteStripeSecretKey = (
    import.meta.env as Record<string, string | undefined>
  ).VITE_STRIPE_SECRET_KEY;
  const viteStripeWebhookSecret = (
    import.meta.env as Record<string, string | undefined>
  ).VITE_STRIPE_WEBHOOK_SECRET;

  if (viteStripeSecretKey || viteStripeWebhookSecret) {
    errors.push(
      "SECURITY: Do not set VITE_STRIPE_SECRET_KEY or VITE_STRIPE_WEBHOOK_SECRET. Remove them from Vercel/hosting env and set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET in Supabase Edge Function secrets only.",
    );
  }

  if (config.stripe.publishableKey.startsWith("sk_")) {
    errors.push(
      "SECURITY: VITE_STRIPE_PUBLISHABLE_KEY must be pk_* (publishable), not sk_* (secret). Secret keys belong in Supabase only.",
    );
  }

  // Check production environment
  if (isProd && config.stripe.publishableKey) {
    if (!config.stripe.publishableKey.startsWith("pk_live_")) {
      errors.push(
        "When set, production Stripe publishable key must be pk_live_... (hosted-only web can omit this var)",
      );
    }
    if (!config.supabase.url.includes("supabase.co")) {
      errors.push("Production requires valid Supabase URL");
    }
    if (!config.supabase.anonKey) {
      errors.push(
        `Missing required environment variable: ${requiredVars.supabase.anonKey}`,
      );
    }
  }

  return errors;
};

// Validate on module load in the browser (fail closed on secret-key exposure).
if (typeof window !== "undefined") {
  const envErrors = validateEnvironment();
  const securityErrors = envErrors.filter((e) => e.startsWith("SECURITY:"));
  if (securityErrors.length > 0) {
    throw new Error(securityErrors.join(" "));
  }
  if (isDev && envErrors.length > 0) {
    console.warn("⚠️ Environment Configuration Issues:", envErrors);
    console.warn(
      "Please check your .env file and ensure all required variables are set.",
    );
  }
}

export default config;
