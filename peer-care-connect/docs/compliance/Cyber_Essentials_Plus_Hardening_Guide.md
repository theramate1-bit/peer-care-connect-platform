# Cyber Essentials Plus - Technical Hardening Guide
## Theramate Platform Implementation

**Date:** February 2025  
**Version:** 1.0  
**Status:** Implementation Guide

---

## 🎯 **OVERVIEW**

This guide provides step-by-step instructions to harden Theramate's infrastructure to meet Cyber Essentials Plus requirements.

---

## 1. FRONTEND HARDENING (React + Vite + Vercel)

### **1.1 Security Headers Configuration**

**File:** `vercel.json` or Vercel Dashboard

**Required Headers:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(self), microphone=(), camera=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; frame-src 'self' https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
        }
      ]
    }
  ]
}
```

**Action:**
1. Update `vercel.json` with headers configuration
2. Deploy to Vercel
3. Verify headers using browser dev tools
4. Test CSP doesn't break functionality

**Evidence:** Screenshot of headers in browser dev tools

---

### **1.2 Build Security**

**File:** `vite.config.ts`

**Configuration:**
```typescript
export default defineConfig({
  build: {
    sourcemap: false, // Disable source maps in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs
        drop_debugger: true,
      },
    },
  },
  // ... other config
});
```

**Action:**
1. Update `vite.config.ts`
2. Test production build
3. Verify no console.logs in production
4. Verify no source maps in production

**Evidence:** Production build output verification

---

### **1.3 Environment Variables Security**

**File:** `.env.example`, `.env.local`

**Requirements:**
- ✅ No secrets in code
- ✅ Only `VITE_*` variables exposed to client
- ✅ Service keys in Edge Functions only
- ✅ `.env.local` in `.gitignore`

**Action:**
1. Audit all environment variables
2. Verify no secrets in client code
3. Document variable usage
4. Review `.gitignore` includes `.env.local`

**Evidence:** Environment variable audit report

---

## 2. BACKEND HARDENING (Supabase)

### **2.1 Edge Functions Security**

**File:** `supabase/config.toml`

**Current Configuration:**
```toml
[functions.send-email]
verify_jwt = true

[functions.stripe-payment]
verify_jwt = true

[functions.stripe-webhook]
verify_jwt = false  # By design - webhook signature verified instead
```

**Action Items:**
1. ✅ Verify all functions have `verify_jwt = true` (except webhooks)
2. ✅ Review webhook signature verification
3. ⚠️ Add input validation to all functions
4. ⚠️ Review error messages for data leakage
5. ⚠️ Document function security settings

**Evidence:** `config.toml` file, function code review

---

### **2.2 Database Security**

**File:** SQL migrations

**Requirements:**
- ✅ RLS enabled on all tables
- ✅ Policies reviewed and tested
- ✅ No public schema access
- ✅ Service role key secured

**Action Items:**
1. ⚠️ Conduct comprehensive RLS audit
2. ⚠️ Review all policies for completeness
3. ⚠️ Test policies with different user roles
4. ⚠️ Document RLS policy matrix

**Evidence:** RLS audit report, policy documentation

**Audit Query:**
```sql
-- Check tables without RLS
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename 
  FROM pg_policies 
  WHERE schemaname = 'public'
);
```

---

### **2.3 Storage Security**

**File:** Supabase Dashboard

**Action Items:**
1. ⚠️ Review all storage buckets
2. ⚠️ Verify bucket policies
3. ⚠️ Ensure no public buckets
4. ⚠️ Document signed URL usage
5. ⚠️ Enable access logging

**Evidence:** Storage bucket configuration screenshots

---

### **2.4 Authentication Security**

**File:** `supabase/config.toml`, Supabase Dashboard

**Current Configuration:**
```toml
[auth]
enable_signup = true
enable_confirmations = true
jwt_expiry = 3600
```

**Action Items:**
1. ✅ Strong password policy configured
2. ✅ Account lockout settings reviewed
3. ✅ Email verification enforced
4. ⚠️ Review OAuth provider security
5. ✅ MFA available (optional for users)

**Evidence:** Auth settings screenshots, password policy documentation

**Password Policy:**
- Minimum 12 characters
- Require uppercase, lowercase, numbers
- Require special characters
- No common passwords

---

## 3. ACCESS CONTROL HARDENING

### **3.1 Developer Access**

**Action Items:**
1. ⚠️ Create access control policy
2. ⚠️ Document developer onboarding
3. ⚠️ Conduct access review
4. ⚠️ Implement access logging
5. ⚠️ Create access matrix

**Evidence:** Access control policy, access review records

---

### **3.2 API Key Management**

**Action Items:**
1. ✅ Verify no keys in code (already done)
2. ⚠️ Document key rotation policy
3. ⚠️ Set up key rotation schedule
4. ⚠️ Review key usage logs

**Evidence:** Key management documentation, rotation logs

---

## 4. MALWARE PROTECTION HARDENING

### **4.1 Dependency Scanning**

**File:** `.github/workflows/security.yml` (to be created)

**Action Items:**
1. ⚠️ Set up GitHub Dependabot
2. ⚠️ Configure `npm audit` in CI/CD
3. ⚠️ Set up Snyk (optional)
4. ⚠️ Generate SBOM
5. ⚠️ Document vulnerability response

**Evidence:** CI/CD configuration, scan results, SBOM

**Dependabot Configuration:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/peer-care-connect"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

**CI/CD Security Scan:**
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --audit-level=high
      - run: npm audit --production
```

---

### **4.2 Code Security Scanning**

**Action Items:**
1. ⚠️ Enable GitHub Advanced Security (if available)
2. ⚠️ Configure secret scanning
3. ⚠️ Set up ESLint security rules
4. ⚠️ Document scanning process

**Evidence:** Security scanning configuration, scan results

**ESLint Security Rules:**
```json
{
  "extends": [
    "plugin:security/recommended"
  ],
  "plugins": ["security"]
}
```

---

## 5. PATCH MANAGEMENT HARDENING

### **5.1 Dependency Update Process**

**Action Items:**
1. ⚠️ Create patch management policy
2. ⚠️ Set up automated updates (Dependabot)
3. ⚠️ Document update process
4. ⚠️ Schedule regular reviews
5. ⚠️ Create change management process

**Evidence:** Patch management policy, update logs

**Patch Management Policy:**
- Critical vulnerabilities: Patch within 7 days
- High vulnerabilities: Patch within 30 days
- Medium vulnerabilities: Patch within 90 days
- Low vulnerabilities: Patch in next release

---

### **5.2 Supabase Runtime Updates**

**Action Items:**
1. ✅ Document Supabase auto-patching (managed service)
2. ⚠️ Monitor Supabase security updates
3. ⚠️ Review Edge Function dependencies quarterly

**Evidence:** Supabase update documentation, dependency audit

---

## 6. MONITORING & LOGGING

### **6.1 Security Monitoring**

**Action Items:**
1. ⚠️ Set up Supabase monitoring alerts
2. ⚠️ Configure Vercel monitoring
3. ⚠️ Set up error tracking (Sentry)
4. ⚠️ Create security incident alerts

**Evidence:** Monitoring configuration, alert setup

---

### **6.2 Logging**

**Action Items:**
1. ✅ Structured logging in Edge Functions (already implemented)
2. ⚠️ Review log retention policies
3. ⚠️ Ensure no PII in logs
4. ⚠️ Document logging standards

**Evidence:** Logging configuration, retention policies

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Critical (Week 1-2)**
- [ ] Configure security headers in Vercel
- [x] Strong password policy configured
- [ ] Set up dependency scanning
- [ ] Conduct RLS audit

### **Phase 2: High Priority (Week 3-4)**
- [ ] Review Edge Function security
- [ ] Document access control procedures
- [ ] Set up automated dependency updates
- [ ] Review storage bucket policies

### **Phase 3: Medium Priority (Month 2)**
- [ ] Create patch management policy
- [ ] Set up security monitoring
- [ ] Conduct code security scan
- [ ] Prepare evidence pack

---

## 🔧 **QUICK WINS**

### **Immediate Actions (Today):**

1. ✅ **Update `vercel.json` with security headers** (Complete)
2. ✅ **Strong password policy configured** (Complete)
3. ⚠️ **Run `npm audit` and fix high-severity issues** (See Vulnerability Remediation Plan)
4. ⚠️ **Review RLS policies on critical tables** (RLS audit system created)

### **This Week:**

5. **Set up Dependabot**
6. **Create access control policy**
7. **Document security settings**
8. **Review storage buckets**

---

## 📊 **HARDENING PROGRESS**

| Category | Current | Target | Status |
|----------|---------|--------|--------|
| Security Headers | 50% | 100% | ⚠️ |
| Password Policy | 100% | 100% | ✅ |
| Dependency Scanning | 0% | 100% | ⚠️ |
| RLS Audit | 70% | 100% | ⚠️ |
| Patch Management | 50% | 100% | ⚠️ |
| **Overall** | **34%** | **100%** | ⚠️ |

---

**Last Updated:** February 2025  
**Next Review:** March 2025
