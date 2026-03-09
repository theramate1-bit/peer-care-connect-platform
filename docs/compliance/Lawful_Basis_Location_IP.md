# Lawful Basis Assessment
## Location & IP Tracking

**Date:** February 2025  
**Version:** 1.0  
**Reference:** UK GDPR Article 6, PECR

---

## 1. Location Tracking - Lawful Basis

### 1.1 UK GDPR Article 6 Basis

**Selected Basis:** **Article 6(1)(a) - Consent**

**Justification:**
- Location tracking requires explicit, opt-in consent from users
- Users must actively grant permission before precise location is collected
- Consent can be withdrawn at any time
- Location tracking is not necessary for contract performance (users can manually enter addresses)
- Legitimate interests would not be appropriate for precise location data due to privacy sensitivity

**Consent Requirements Met:**
- ✅ Explicit consent (opt-in, not pre-checked)
- ✅ Clear explanation of why location is needed
- ✅ Separate consent for location (not bundled)
- ✅ Easy withdrawal mechanism
- ✅ Consent recorded and auditable

### 1.2 PECR Classification

**Classification:** **Network-Derived Location Data**

**PECR Requirements:**
- ✅ Consent obtained before processing location data
- ✅ Value-added service justification documented
- ✅ Service cannot function without location data (marketplace matching)
- ✅ Users understand location is required for service

**Value-Added Service Justification:**
Theramate's marketplace matching service requires location data to:
- Match clients with nearby practitioners
- Calculate distances between users
- Display location-based search results
- Enable mobile therapist service area matching

**Without location data, the core marketplace functionality cannot operate.**

### 1.3 Special Category Data Assessment

**Is location data special category under UK GDPR Article 9?**

**Answer:** **NO**

Location data (GPS coordinates, addresses) is **not** special category personal data under UK GDPR Article 9. However, it is **PECR-regulated** as network-derived location data, which requires explicit consent.

**Note:** If location data reveals health information (e.g., visits to specific healthcare facilities), this could be special category data, but Theramate does not process location data in a way that reveals health information.

---

## 2. IP Address Tracking - Lawful Basis

### 2.1 UK GDPR Article 6 Basis

**Selected Basis:** **Article 6(1)(f) - Legitimate Interests** (for security/fraud prevention)  
**Additional Basis:** **Article 6(1)(a) - Consent** (for analytics)

**Justification:**

#### Security and Fraud Prevention (Legitimate Interests)
- IP addresses are necessary for security monitoring
- Fraud detection requires IP address logging
- Legal obligations may require IP logging for security compliance
- Impact on individuals is low (IP addresses are not highly personal)
- Legitimate interests override individual rights in this case

#### Analytics (Consent)
- IP addresses used for analytics require consent via cookie consent mechanism
- PECR requires consent for analytics cookies
- Users can opt-out via cookie consent banner

### 2.2 Legitimate Interests Balancing Test

**Legitimate Interest:**
- Security and fraud prevention
- Service improvement through analytics
- Error debugging and troubleshooting

**Necessity:**
- IP addresses are standard web server logs
- Security monitoring requires IP logging
- Analytics improve service quality

**Balancing Test:**

| Factor | Assessment |
|--------|------------|
| **Legitimate Interest** | Strong - Security and service improvement |
| **Impact on Individuals** | Low - IP addresses are not highly personal |
| **Mitigations** | Anonymization after retention, clear privacy notice |
| **Opt-out Available** | Yes - Cookie consent for analytics |
| **Conclusion** | Legitimate interests override individual rights |

**Result:** ✅ **Legitimate interests basis is appropriate for security/fraud prevention**

### 2.3 PECR Considerations

**IP Addresses and PECR:**
- IP addresses themselves are not cookies
- However, IP addresses collected via analytics cookies require consent
- Cookie consent mechanism covers IP tracking for analytics purposes

**Consent Mechanism:**
- Cookie consent banner includes analytics consent
- Analytics consent covers IP address collection for analytics
- Users can opt-out via cookie consent preferences

---

## 3. Lawful Basis Summary

### 3.1 Location Tracking

| Aspect | Details |
|--------|---------|
| **UK GDPR Basis** | Article 6(1)(a) - Consent |
| **PECR Classification** | Network-derived location data |
| **Consent Type** | Explicit opt-in |
| **Withdrawal** | Available at any time |
| **Value-Added Service** | Yes - Marketplace matching requires location |

### 3.2 IP Address Tracking

| Aspect | Details |
|--------|---------|
| **Security/Fraud Basis** | Article 6(1)(f) - Legitimate Interests |
| **Analytics Basis** | Article 6(1)(a) - Consent (via cookie consent) |
| **PECR** | Cookie consent for analytics |
| **Retention** | 12 months (security), 26 months (analytics) |
| **Anonymization** | After retention period |

---

## 4. Privacy Policy Updates Required

### 4.1 Location Tracking Section

**Required Updates:**
- Explicit statement that location tracking requires consent
- Clear explanation of why location is needed
- PECR classification explanation
- Value-added service justification
- Withdrawal instructions

**Draft Text:**
```
Location Tracking and PECR Compliance

We collect precise location data (GPS coordinates) to enable our marketplace 
matching service. This is classified as network-derived location data under 
PECR and requires your explicit consent.

Why we need location data:
- To match you with nearby practitioners
- To calculate distances for search results
- To enable mobile therapist service area matching

This is a value-added service that cannot function without location data. 
You can withdraw your consent at any time via your privacy settings.
```

### 4.2 IP Address Section

**Required Updates:**
- Clarify lawful basis (legitimate interests for security, consent for analytics)
- Explain retention periods
- Explain anonymization process

**Draft Text:**
```
IP Address Collection

We collect IP addresses for:
- Security and fraud prevention (legitimate interests)
- Analytics and service improvement (with your consent via cookie consent)

IP addresses are retained for 12 months (security) or 26 months (analytics), 
then anonymized. You can opt-out of analytics IP tracking via cookie consent.
```

---

## 5. Consent Mechanism Requirements

### 5.1 Location Consent

**Requirements:**
- ✅ Explicit opt-in (not pre-checked)
- ✅ Clear explanation before consent
- ✅ Separate consent (not bundled with other consents)
- ✅ Easy withdrawal mechanism
- ✅ Consent recorded in database
- ✅ Consent timestamp recorded

**Implementation:**
- Location consent component before geolocation API calls
- Database table to store consent records
- Privacy settings page for withdrawal

### 5.2 IP Address Consent

**Requirements:**
- ✅ Cookie consent banner covers analytics IP tracking
- ✅ Clear explanation in privacy policy
- ✅ Opt-out available via cookie consent preferences
- ✅ Consent status recorded

**Implementation:**
- Cookie consent component already exists
- Update cookie consent text to mention IP addresses
- Privacy policy clarification

---

## 6. Documentation Requirements

### 6.1 Required Documentation

- ✅ DPIA completed (see DPIA_Location_IP_Tracking.md)
- ✅ ROPA updated (see ROPA_Location_IP_Tracking.md)
- ✅ Privacy policy updated
- ✅ Consent mechanisms implemented
- ✅ Withdrawal mechanisms implemented

### 6.2 Ongoing Requirements

- Annual review of lawful basis
- Review on significant changes to processing
- Document any changes to lawful basis
- Update privacy notices if lawful basis changes

---

## 7. Review and Approval

**Last Updated:** February 2025  
**Next Review:** February 2026 (or on significant change)  
**Approved By:** TBD  
**Date:** TBD

---

**Document Owner:** Data Protection Officer  
**Legal Review:** TBD
