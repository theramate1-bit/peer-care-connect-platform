# PECR Location Data Classification
## Network-Derived Location Data

**Date:** February 2025  
**Version:** 1.0  
**Reference:** Privacy and Electronic Communications Regulations (PECR) 2003

---

## 1. PECR Overview

**PECR** (Privacy and Electronic Communications Regulations) regulates:
- Use of cookies and similar technologies
- Electronic marketing
- **Location data** (network-derived)

**Key Requirement:** Location data requires explicit consent before processing.

---

## 2. Location Data Classification

### 2.1 What is PECR-Regulated Location Data?

**Definition:** Location data that is processed in connection with the provision of an electronic communications service.

**Theramate's Location Data:**
- ✅ **GPS coordinates** (latitude, longitude) - **PECR-REGULATED**
- ✅ **Network-derived location** (via browser geolocation API) - **PECR-REGULATED**
- ⚠️ **User-provided addresses** - **NOT PECR-REGULATED** (but still requires UK GDPR consent)

**Classification:** Theramate processes **PECR-regulated location data** because:
1. GPS coordinates are collected via browser geolocation API (network-derived)
2. Location data is processed in connection with electronic communications service
3. Precise location coordinates are network-derived location data

### 2.2 PECR vs UK GDPR

| Aspect | PECR | UK GDPR |
|--------|------|---------|
| **Applies to** | Network-derived location data | All personal data |
| **Consent requirement** | Explicit consent required | Explicit consent required |
| **Value-added service** | Must be for value-added service | Not required |
| **Cannot function without** | Service cannot function without location | Not required |

**Theramate Compliance:**
- ✅ PECR compliance ensures UK GDPR compliance for location data
- ✅ Both require explicit consent
- ✅ PECR has additional value-added service requirement

---

## 3. Value-Added Service Justification

### 3.1 What is a Value-Added Service?

**PECR Definition:** A service that cannot function without location data and provides value beyond basic communications.

**Theramate's Service:**
- **Core Functionality:** Marketplace matching (clients find nearby practitioners)
- **Location Requirement:** Cannot match users without location data
- **Value Provided:** Enables location-based search and matching

### 3.2 Value-Added Service Assessment

**Question:** Can Theramate's marketplace function without location data?

**Answer:** **NO**

**Justification:**
1. **Core Functionality:** "Find nearby practitioners" requires location data
2. **No Alternative:** Cannot provide location-based matching without location
3. **User Expectation:** Users expect to find practitioners by location
4. **Service Value:** Location matching is primary value proposition

**Conclusion:** ✅ **Theramate's marketplace is a value-added service that cannot function without location data**

### 3.3 User Understanding

**Requirement:** Users must understand that location is required for the service to function.

**Theramate Implementation:**
- ✅ Clear explanation in consent mechanism
- ✅ Privacy policy explains location requirement
- ✅ Users can see that location enables marketplace matching
- ✅ Alternative: Manual address entry (but still requires location for matching)

---

## 4. Consent Requirements

### 4.1 PECR Consent Requirements

**Explicit Consent Required:**
- ✅ Opt-in (not pre-checked)
- ✅ Clear explanation of why location is needed
- ✅ Separate consent (not bundled)
- ✅ Easy withdrawal
- ✅ Consent recorded

**Theramate Compliance:**
- ✅ Location consent component implements opt-in
- ✅ Clear explanation provided
- ✅ Separate from other consents
- ✅ Withdrawal mechanism available
- ✅ Consent stored in database

### 4.2 Consent Before Processing

**PECR Requirement:** Consent must be obtained **before** processing location data.

**Theramate Implementation:**
- ✅ Consent checked before `navigator.geolocation.getCurrentPosition()` calls
- ✅ No location processing without consent
- ✅ Manual address entry available as alternative

---

## 5. Network-Derived Location Data

### 5.1 What is Network-Derived?

**Definition:** Location data derived from network infrastructure (cell towers, WiFi, GPS satellites).

**Theramate's Data:**
- **GPS coordinates:** Derived from GPS satellites (network-derived) ✅
- **Browser geolocation:** Uses GPS, WiFi, cell towers (network-derived) ✅
- **User-provided addresses:** Not network-derived (but geocoded to coordinates) ⚠️

**Classification:**
- GPS coordinates collected via browser API: **PECR-REGULATED**
- User-provided addresses geocoded to coordinates: **PECR-REGULATED** (once converted to network-derived format)

### 5.2 Processing Chain

```
User provides address OR grants geolocation consent
         ↓
Browser geolocation API (network-derived) OR Geocoding service
         ↓
GPS coordinates (network-derived location data)
         ↓
Stored in database (PECR-regulated)
         ↓
Used for marketplace matching
```

**All steps require PECR compliance** once network-derived location data is created.

---

## 6. PECR Compliance Checklist

### 6.1 Pre-Processing Requirements

- ✅ **Purpose defined:** Marketplace matching documented
- ✅ **Value-added service:** Justification documented
- ✅ **Consent mechanism:** Explicit opt-in implemented
- ✅ **User understanding:** Clear explanation provided
- ✅ **Consent before processing:** Checked before geolocation API calls

### 6.2 Processing Requirements

- ✅ **Consent recorded:** Stored in database
- ✅ **Consent timestamp:** Recorded
- ✅ **Purpose limitation:** Used only for stated purpose
- ✅ **Data minimization:** Only minimum necessary data collected

### 6.3 Post-Processing Requirements

- ✅ **Withdrawal mechanism:** Available in privacy settings
- ✅ **Withdrawal effect:** Immediate stop of processing
- ✅ **Data deletion:** On withdrawal if requested
- ✅ **Privacy notice:** Updated with PECR information

---

## 7. PECR vs Manual Address Entry

### 7.1 Manual Address Entry

**Scenario:** User manually enters address (no geolocation API used)

**PECR Status:** ⚠️ **Still PECR-regulated** once geocoded to coordinates

**Reason:** Geocoding converts address to network-derived location data (GPS coordinates)

**Coment Requirement:** Still requires consent (UK GDPR and PECR)

### 7.2 Geolocation API

**Scenario:** User grants browser geolocation permission

**PECR Status:** ✅ **PECR-regulated** (direct network-derived location)

**Consent Requirement:** Explicit consent required before API call

---

## 8. Privacy Notice Requirements

### 8.1 PECR-Specific Information

**Required in Privacy Notice:**
- ✅ Classification as network-derived location data
- ✅ Value-added service justification
- ✅ Consent requirement explanation
- ✅ Withdrawal instructions
- ✅ Purpose of location processing

**Theramate Privacy Policy Updates:**
- Section on location tracking
- PECR classification explained
- Value-added service justification
- Consent and withdrawal information

---

## 9. Compliance Monitoring

### 9.1 Regular Checks

**Quarterly Reviews:**
- Consent rates monitored
- Withdrawal rates monitored
- Consent mechanism tested
- Privacy notice reviewed

**Annual Reviews:**
- PECR compliance audit
- Value-added service justification reviewed
- Consent mechanism reviewed
- Privacy notice updated if needed

### 9.2 Incident Response

**PECR Violations:**
- Immediate stop of processing
- Investigation of violation
- Remediation measures
- Notification to ICO if required
- User notification if high risk

---

## 10. Documentation Requirements

### 10.1 Required Documentation

- ✅ PECR classification document (this document)
- ✅ Value-added service justification (in DPIA)
- ✅ Consent mechanism documentation
- ✅ Privacy notice updates
- ✅ Withdrawal process documentation

### 10.2 Ongoing Requirements

- Annual PECR compliance review
- Updates on regulatory changes
- Privacy notice updates
- Consent mechanism improvements

---

## 11. Review and Updates

**Last Updated:** February 2025  
**Next Review:** February 2026 (or on regulatory changes)  
**Review Frequency:** Annual or on regulatory changes

**Change Log:**
- 2025-02-XX: Initial PECR classification document created

---

**Document Owner:** Data Protection Officer  
**Legal Review:** TBD  
**Approved By:** TBD  
**Date:** TBD
