# Multi-Factor Authentication (MFA) Setup Guide
## Cyber Essentials Plus 2026 Compliance

**Date:** February 2025  
**Version:** 1.0  
**Status:** Optional Reference Guide

---

## 🎯 **OVERVIEW**

This guide provides step-by-step instructions for enabling and configuring Multi-Factor Authentication (MFA) for Theramate accounts. **MFA is optional** and available for users who want additional security.

**MFA Status:**
- **All Accounts:** Optional (available but not required)
- **Note:** MFA is available for users who want additional security but is not mandatory for compliance

---

## 🔐 **MFA METHODS SUPPORTED**

### **1. Time-based One-Time Password (TOTP)**
- **Apps:** Google Authenticator, Authy, Microsoft Authenticator
- **Security:** High
- **Convenience:** Medium
- **Recommended:** ✅ Yes

### **2. SMS**
- **Security:** Medium
- **Convenience:** High
- **Recommended:** ⚠️ Backup only

### **3. Email**
- **Security:** Low-Medium
- **Convenience:** High
- **Recommended:** ⚠️ Backup only

---

## 📋 **SUPABASE AUTH MFA CONFIGURATION**

### **Step 1: Enable MFA in Supabase Dashboard**

1. **Navigate to Authentication Settings:**
   - Go to Supabase Dashboard
   - Select your project
   - Navigate to Authentication → Settings

2. **Enable MFA:**
   - Find "Multi-Factor Authentication" section
   - Enable "Enable MFA"
   - Select MFA methods:
     - ✅ TOTP (Time-based One-Time Password)
     - ✅ SMS (optional)
     - ✅ Email (optional)

3. **Configure MFA Settings:**
   - **Enforcement:** Optional (users can enable)
   - **Required for Admin:** Enable (mandatory for admin role)
   - **Backup Codes:** Enable (generate backup codes)

4. **Save Settings:**
   - Click "Save"
   - Verify settings are applied

---

### **Step 2: Update Supabase Config**

**File:** `supabase/config.toml`

```toml
[auth]
enable_signup = true
enable_confirmations = true
jwt_expiry = 3600

# MFA Configuration
[auth.mfa]
enabled = true
issuer_name = "Theramate"
totp_enabled = true
sms_enabled = true
email_enabled = true

# MFA Enforcement
[auth.mfa.enforcement]
# Require MFA for admin users
admin_required = true
# Optional for other users
user_required = false
```

---

### **Step 3: Update Application Code**

**File:** `src/lib/auth.ts` (create if doesn't exist)

```typescript
import { supabase } from '@/integrations/supabase/client';

/**
 * Enable MFA for current user
 */
export async function enableMFA() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Theramate Authenticator App'
  });

  if (error) throw error;

  return {
    qrCode: data.qr_code,
    secret: data.secret,
    uri: data.uri
  };
}

/**
 * Verify MFA enrollment
 */
export async function verifyMFAEnrollment(code: string) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId: data.id,
    code
  });

  if (error) throw error;
  return data;
}

/**
 * Challenge MFA (for login)
 */
export async function challengeMFA() {
  const { data, error } = await supabase.auth.mfa.challenge({
    factorId: factorId
  });

  if (error) throw error;
  return data;
}

/**
 * Verify MFA challenge
 */
export async function verifyMFAChallenge(code: string, challengeId: string) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId: factorId,
    challengeId,
    code
  });

  if (error) throw error;
  return data;
}

/**
 * Check if user has MFA enabled
 */
export async function hasMFAEnabled(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) return false;
  return data.totp?.length > 0 || data.sms?.length > 0;
}

/**
 * Disable MFA (requires re-authentication)
 */
export async function disableMFA(factorId: string) {
  const { data, error } = await supabase.auth.mfa.unenroll({
    factorId
  });

  if (error) throw error;
  return data;
}
```

---

### **Step 4: Create MFA Setup Component**

**File:** `src/components/auth/MFASetup.tsx`

```typescript
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { enableMFA, verifyMFAEnrollment } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const MFASetup: React.FC = () => {
  const [step, setStep] = useState<'start' | 'qr' | 'verify'>('start');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEnableMFA = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await enableMFA();
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep('qr');
    } catch (err: any) {
      setError(err.message || 'Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);
      await verifyMFAEnrollment(verificationCode);
      setStep('verify');
      // Redirect or show success
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enable Multi-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'start' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Secure your account with multi-factor authentication. You'll need
              an authenticator app like Google Authenticator or Authy.
            </p>
            <Button onClick={handleEnableMFA} disabled={loading}>
              {loading ? 'Setting up...' : 'Enable MFA'}
            </Button>
          </div>
        )}

        {step === 'qr' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app:
            </p>
            <div className="flex justify-center">
              <QRCodeSVG value={qrCode} size={200} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Or enter this code manually: <code>{secret}</code>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Enter verification code:
              </label>
              <Input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
              />
              <Button onClick={handleVerify} disabled={loading || verificationCode.length !== 6}>
                Verify
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <Alert>
            <AlertDescription>
              ✅ MFA has been successfully enabled for your account!
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
```

---

### **Step 5: Update Login Flow**

**File:** `src/pages/auth/Login.tsx` (update existing)

Add MFA challenge step after password verification:

```typescript
// After successful password login
const { data: session } = await supabase.auth.getSession();

if (session?.user) {
  // Check if MFA is required
  const factors = await supabase.auth.mfa.listFactors();
  
  if (factors.data?.totp?.length > 0) {
    // Challenge MFA
    const challenge = await challengeMFA();
    // Show MFA input component
    setMFARequired(true);
    setChallengeId(challenge.id);
  } else {
    // Normal login flow
    navigate('/dashboard');
  }
}
```

---

## 📱 **USER GUIDE: SETTING UP MFA**

### **For Admin Users (Mandatory):**

1. **Log in to Theramate**
2. **Navigate to Settings → Security**
3. **Click "Enable Multi-Factor Authentication"**
4. **Scan QR Code:**
   - Open authenticator app (Google Authenticator, Authy, etc.)
   - Scan QR code displayed
   - Or enter secret code manually
5. **Verify Setup:**
   - Enter 6-digit code from app
   - Click "Verify"
6. **Save Backup Codes:**
   - Download backup codes
   - Store securely
   - Use if you lose access to authenticator app

### **For Practitioner Users (Recommended):**

Same process as admin users (optional but recommended).

### **For Client Users (Optional):**

Same process as admin users (completely optional).

---

## 🔧 **TROUBLESHOOTING**

### **Issue: QR Code Not Scanning**

**Solution:**
- Ensure good lighting
- Try manual entry of secret code
- Use different authenticator app
- Check camera permissions

---

### **Issue: Verification Code Not Working**

**Solutions:**
1. **Check Time Sync:**
   - Authenticator app time must be synced
   - Enable automatic time sync in app settings

2. **Check Code Entry:**
   - Ensure no spaces
   - Enter all 6 digits
   - Code expires every 30 seconds

3. **Try Backup Code:**
   - Use backup code if available
   - Generate new backup codes after use

---

### **Issue: Lost Authenticator Device**

**Solutions:**
1. **Use Backup Codes:**
   - Enter backup code to log in
   - Disable old MFA
   - Set up new MFA

2. **Contact Support:**
   - Email: security@theramate.co.uk
   - Provide account verification
   - Support will disable MFA
   - Set up new MFA

---

## 📊 **MFA STATUS**

### **MFA is Optional:**

**Status:**
- MFA is available for all users
- Users can enable MFA if they want additional security
- MFA is not required for any account type
- Users can enable/disable MFA at any time

**Note:** This guide is provided as a reference for users who want to enable MFA for additional security. MFA is not mandatory for compliance.

---

## 📋 **MFA COMPLIANCE CHECKLIST**

### **Implementation:**
- [ ] MFA enabled in Supabase Dashboard
- [ ] MFA configuration in `config.toml`
- [ ] MFA functions implemented (`auth.ts`)
- [ ] MFA setup component created
- [ ] Login flow updated for MFA challenge
- [ ] Admin MFA enforcement implemented
- [ ] Backup codes generation implemented
- [ ] MFA documentation created

### **Testing:**
- [ ] MFA setup flow tested
- [ ] MFA login flow tested
- [ ] Backup codes tested
- [ ] MFA disable flow tested
- [ ] Admin enforcement tested
- [ ] Error handling tested

### **Documentation:**
- [ ] User guide created
- [ ] Admin guide created
- [ ] Troubleshooting guide created
- [ ] Security policy updated

---

## 📚 **REFERENCES**

**Official Sources:**
- **Supabase MFA Docs:** https://supabase.com/docs/guides/auth/auth-mfa
- **NCSC MFA Guidance:** https://www.ncsc.gov.uk/guidance/multi-factor-authentication-online-services
- **NIST MFA Guidelines:** https://pages.nist.gov/800-63-3/sp800-63b.html

---

**Last Updated:** February 2025  
**Next Review:** May 2025
