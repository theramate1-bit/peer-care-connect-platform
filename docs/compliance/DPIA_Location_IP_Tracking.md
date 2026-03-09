# Data Protection Impact Assessment (DPIA)
## Location & IP Tracking

**Date:** February 2025  
**Version:** 1.0  
**Status:** Approved  
**Reference:** UK GDPR Article 35, DPA 2018  
**Approved By:** [To be completed by DPO/Legal Team]  
**Approval Date:** [To be completed]

---

## 1. Purpose of Processing

### 1.1 Location Tracking
**Purpose:** Enable marketplace functionality to match clients with nearby practitioners based on geographic proximity.

**Specific Use Cases:**
- Practitioners set their practice location(s) and service radius
- Clients search for practitioners within a specified distance
- Geospatial queries to find practitioners within X km of client location
- Display distance calculations in marketplace listings
- Mobile therapist service area matching

**Business Objective:** Core marketplace functionality - cannot operate without location matching capability.

### 1.2 IP Address Tracking
**Purpose:** 
- Security and fraud prevention
- Analytics and service improvement (via Google Tag Manager)
- General location data for content personalization

**Specific Use Cases:**
- IP-based fraud detection and security monitoring
- Analytics tracking (page views, user journeys)
- General location inference (country/city level) for content localization
- Error logging and debugging

---

## 2. Nature, Scope, Context, and Purpose

### 2.1 Data Categories

**Location Data (Special Category - Precise Location):**
- Precise GPS coordinates (latitude, longitude) - accuracy typically 10-50 meters
- Street addresses
- PostGIS geometry points for spatial queries
- Service radius preferences
- Historical location data (when locations are updated)

**IP Address Data:**
- IPv4/IPv6 addresses
- General location inference (country, city level - not precise)
- Timestamp of collection
- Associated user session/account

### 2.2 Data Subjects
- **Practitioners:** Provide practice location(s) and service areas
- **Clients:** Provide location for finding nearby practitioners
- **All Users:** IP addresses collected automatically

### 2.3 Data Volume
- **Location Data:** ~1-3 locations per practitioner, 1 location per client (estimated 10,000+ records)
- **IP Addresses:** Every user session (estimated 100,000+ records annually)

### 2.4 Data Retention
- **Location Data:** Until account deletion or 7 years after last activity (legal compliance)
- **IP Addresses:** 12 months (security/analytics), then anonymized

---

## 3. Necessity and Proportionality

### 3.1 Is Processing Necessary?
**Location Tracking:** ✅ **YES - Essential**
- Core marketplace functionality requires location matching
- Cannot provide "find nearby practitioners" without location data
- Value-added service that cannot function without location data (PECR requirement)

**IP Tracking:** ⚠️ **PARTIALLY NECESSARY**
- Security/fraud prevention: Necessary for platform security
- Analytics: Not strictly necessary but supports service improvement
- General location: Supports content personalization but not essential

### 3.2 Is Processing Proportional?
**Location Tracking:** ✅ **YES**
- Only collects minimum necessary (coordinates + address)
- Used only for stated purpose (marketplace matching)
- Users can opt-out by not providing location (manual address entry available)

**IP Tracking:** ✅ **YES**
- IP addresses are standard web server logs
- Used for legitimate security and service improvement purposes
- Anonymized after retention period

---

## 4. Lawful Basis Assessment

### 4.1 Location Tracking

**UK GDPR Article 6 Basis:** **Consent (Article 6(1)(a))**
- Explicit opt-in consent required before collecting precise location
- Users must actively consent to location tracking
- Consent can be withdrawn at any time

**PECR Classification:** **Network-Derived Location Data**
- Precise location coordinates are PECR-regulated location data
- Requires explicit consent before processing
- Must be for value-added service that cannot function without location

**Value-Added Service Justification:**
- Location matching is core marketplace functionality
- Service cannot function without location data
- Users understand location is required for finding nearby practitioners

### 4.2 IP Address Tracking

**UK GDPR Article 6 Basis:** **Legitimate Interests (Article 6(1)(f))**
- Security and fraud prevention: Legitimate interest
- Analytics: Legitimate interest (with cookie consent for non-essential analytics)
- Legal obligation: Some IP logging required for security compliance

**PECR:** IP addresses are not cookies but may be collected with legitimate interests justification

**Balancing Test:**
- **Legitimate Interest:** Security, fraud prevention, service improvement
- **Impact on Individuals:** Low - IP addresses are not highly personal
- **Mitigations:** Anonymization after retention, clear privacy notice
- **Conclusion:** Legitimate interests override individual rights in this case

---

## 5. Risks to Data Subjects

### 5.1 Location Tracking Risks

| Risk | Likelihood | Impact | Severity |
|------|------------|--------|----------|
| Unauthorized access to precise location | Medium | High | **HIGH** |
| Location data breach | Low | High | **MEDIUM** |
| Stalking/harassment via location | Low | Very High | **MEDIUM** |
| Secondary use without consent | Low | Medium | **LOW** |
| Inaccurate location data | Medium | Low | **LOW** |

**Key Risks:**
1. **Precise location reveals sensitive information:**
   - Home addresses (for mobile therapists)
   - Daily routines and patterns
   - Health-related locations (if visiting practitioners)

2. **Location data can be used for profiling:**
   - Wealth indicators (neighborhoods)
   - Lifestyle patterns
   - Health conditions (via practitioner visits)

### 5.2 IP Address Tracking Risks

| Risk | Likelihood | Impact | Severity |
|------|------------|--------|----------|
| IP address linked to user identity | Medium | Medium | **MEDIUM** |
| IP-based profiling | Low | Medium | **LOW** |
| IP address breach | Low | Low | **LOW** |

**Key Risks:**
1. **IP addresses can reveal general location** (country/city)
2. **IP addresses can be linked to user accounts** in logs
3. **IP addresses used for tracking across sessions**

---

## 6. Mitigating Measures

### 6.1 Location Tracking Mitigations

**Technical Measures:**
- ✅ Encryption at rest (Supabase AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Role-based access controls (RLS policies)
- ✅ Audit logging of all location access
- ✅ Pseudonymization for analytics (aggregate coordinates)
- ✅ Automated deletion after retention period

**Organizational Measures:**
- ✅ Explicit consent before collection
- ✅ Clear privacy notice explaining use
- ✅ Consent withdrawal mechanism
- ✅ Staff training on location data handling
- ✅ Regular access reviews
- ✅ Data minimization (only collect what's needed)

**Operational Measures:**
- ✅ Purpose limitation (marketplace matching only)
- ✅ No secondary use without reassessment
- ✅ Regular security audits
- ✅ Incident response procedures

### 6.2 IP Address Tracking Mitigations

**Technical Measures:**
- ✅ IP addresses anonymized after 12 months
- ✅ IP addresses not linked to user accounts in analytics (when consent denied)
- ✅ Secure storage (Supabase)
- ✅ Access controls on IP logs

**Organizational Measures:**
- ✅ Clear privacy notice
- ✅ Cookie consent for analytics (PECR)
- ✅ Legitimate interests assessment documented
- ✅ Retention limits enforced

---

## 7. Residual Risks

### 7.1 Location Tracking Residual Risks

**Risk:** Unauthorized access to precise location data  
**Residual Risk Level:** **MEDIUM**  
**Acceptance:** Acceptable with mitigations in place
- Strong encryption and access controls reduce likelihood
- Audit logging enables detection
- Consent requirement ensures user awareness

**Risk:** Location data breach  
**Residual Risk Level:** **LOW**  
**Acceptance:** Acceptable
- Industry-standard security measures
- Regular security audits
- Incident response procedures

### 7.2 IP Address Tracking Residual Risks

**Risk:** IP address linked to user identity  
**Residual Risk Level:** **LOW**  
**Acceptance:** Acceptable
- IP addresses are less sensitive than precise location
- Anonymization after retention period
- Legitimate interests justification

---

## 8. Consultation

### 8.1 DPO Review
**Status:** Pending DPO review  
**Date:** TBD  
**Outcome:** TBD

### 8.2 Stakeholder Consultation
- **Technical Team:** Reviewed technical mitigations ✅
- **Legal Team:** Reviewed lawful basis assessment ✅
- **Product Team:** Reviewed business necessity ✅

---

## 9. Approval

**DPIA Status:** Draft for Review  
**Next Review Date:** February 2026 (or on significant change)  
**Approved By:** TBD  
**Date:** TBD

---

## 10. Monitoring and Review

### 10.1 Review Triggers
- Significant change to processing activities
- New risks identified
- Security incident involving location/IP data
- Regulatory guidance changes
- Annual review (February each year)

### 10.2 Monitoring
- Quarterly access log reviews
- Annual security audits
- Incident tracking and analysis
- Consent rate monitoring
- Withdrawal rate monitoring

---

## Appendix A: Data Flows

### Location Data Flow
```
User → Browser Geolocation API → Frontend → Supabase (encrypted) → PostGIS queries → Marketplace results
```

### IP Address Flow
```
User Request → Server → IP Logged → Analytics (if consented) → Anonymized after 12 months
```

---

## Appendix B: Third-Party Processors

### Location Data Processors
- **Supabase:** Database hosting (DPA in place)
- **Google Maps API:** Geocoding (DPA in place)
- **Nominatim/OpenStreetMap:** Address geocoding (open source)

### IP Address Processors
- **Supabase:** Server logs
- **Google Tag Manager:** Analytics (cookie consent required)
- **Vercel:** CDN/hosting (DPA in place)

---

**Document Owner:** Data Protection Officer  
**Last Updated:** February 2025  
**Version:** 1.0
