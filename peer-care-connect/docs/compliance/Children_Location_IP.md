# Children's Data Safeguards
## Location & IP Tracking

**Date:** February 2025  
**Version:** 1.0  
**Reference:** UK GDPR, DPA 2018, Age-Appropriate Design Code

---

## 1. Overview

This document outlines safeguards for location and IP tracking when processing personal data of children (under 18 years).

---

## 2. Age Verification

### 2.1 Current Age Verification

**Theramate Policy:** Services not intended for individuals under 18 years

**Age Verification Methods:**
- Date of birth collected during registration
- Age check: Users must be 18+ to register
- Terms and conditions require 18+ age confirmation

**Location/IP Data Impact:**
- Age verification required before location tracking consent
- Age verification required before IP tracking (for analytics)

### 2.2 Age Verification for Location Tracking

**Process:**
1. User attempts to grant location consent
2. System checks user age (from registration)
3. If under 18: Location consent blocked, parental consent required
4. If 18+: Normal consent process proceeds

**Implementation:**
- Age check in location consent component
- Parental consent mechanism (if needed)
- Age-appropriate messaging

---

## 3. Parental Consent

### 3.1 When Parental Consent Required

**UK GDPR Requirement:** Children under 13 require parental consent for online services

**Theramate Policy:** Services restricted to 18+ (no parental consent needed)

**Exception:** If services extended to children in future:
- Parental consent required for under 13
- Age-appropriate consent for 13-17
- Verification of parental relationship

### 3.2 Parental Consent Process (Future)

**If Implemented:**
1. Child attempts to grant location consent
2. System identifies child (under 13)
3. Parental consent request sent to parent
4. Parent verifies identity and grants consent
5. Location tracking enabled for child

**Documentation:**
- Parental consent records stored
- Consent withdrawal process for parents
- Age verification records maintained

---

## 4. Age-Appropriate Design

### 4.1 Location Tracking for Children

**Design Principles:**
- Clear, simple language explaining location tracking
- Visual indicators (icons, colors) for consent
- Age-appropriate examples (e.g., "find nearby practitioners")
- No dark patterns or misleading consent

**Implementation:**
- Simplified consent language for younger users
- Visual consent mechanism
- Clear explanation of risks and benefits

### 4.2 IP Tracking for Children

**Design Principles:**
- Clear explanation of IP tracking
- Age-appropriate cookie consent banner
- Simplified privacy notice sections
- Visual indicators for tracking status

**Implementation:**
- Age-appropriate cookie consent text
- Simplified privacy policy sections
- Visual tracking indicators

---

## 5. Data Minimization for Children

### 5.1 Location Data Minimization

**Principles:**
- Only collect minimum necessary location data
- No precise location for children (if services extended)
- General location (city level) sufficient
- Shorter retention periods for children's data

**Implementation:**
- Reduced precision for children's location (if implemented)
- City-level location instead of precise coordinates
- Shorter retention: 3 years instead of 7 years

### 5.2 IP Address Minimization

**Principles:**
- IP addresses anonymized immediately for children
- No IP-based profiling for children
- Shorter retention: 6 months instead of 12 months

**Implementation:**
- Immediate anonymization of children's IP addresses
- No analytics tracking for children (even with consent)
- Shorter retention periods

---

## 6. Privacy by Default for Children

### 6.1 Default Settings

**Location Tracking:**
- Default: **OFF** for children
- Requires explicit opt-in (with parental consent if under 13)
- Cannot be pre-enabled

**IP Tracking:**
- Default: **OFF** for analytics
- Security IP logging: Minimal (anonymized immediately)
- No profiling or tracking

### 6.2 Privacy Controls

**Enhanced Controls:**
- Easy withdrawal mechanism
- Clear privacy settings page
- Visual indicators of tracking status
- Age-appropriate language

---

## 7. Retention and Deletion

### 7.1 Children's Location Data Retention

**Retention Period:** 3 years (instead of 7 years for adults)

**Rationale:**
- Shorter retention for children's data
- Legal requirements may differ for children
- Privacy-by-default principle

**Deletion Process:**
- Automated deletion after 3 years
- Immediate deletion on account deletion
- Parental request for deletion honored immediately

### 7.2 Children's IP Address Retention

**Retention Period:** 6 months (instead of 12 months)

**Rationale:**
- Shorter retention for children's data
- Immediate anonymization preferred
- Privacy-by-default principle

**Anonymization Process:**
- Immediate anonymization (last octet set to 0)
- No analytics tracking
- Shorter retention period

---

## 8. Risk Assessment for Children

### 8.1 Location Tracking Risks

**Higher Risks for Children:**
- Stalking/harassment risk higher
- Safety concerns with precise location
- Parental concerns about location sharing

**Mitigations:**
- Reduced precision (city level, not precise coordinates)
- Parental controls and monitoring
- Enhanced security measures
- Clear safety messaging

### 8.2 IP Tracking Risks

**Risks for Children:**
- IP-based profiling
- Location inference from IP
- Tracking across sessions

**Mitigations:**
- Immediate anonymization
- No analytics tracking
- Enhanced privacy controls
- Clear explanation of IP tracking

---

## 9. Parental Rights

### 9.1 Access Rights

**Parents Can:**
- Access child's location data
- Access child's IP address data
- Request deletion of child's data
- Withdraw consent for location tracking

**Process:**
- Parental identity verification required
- DSAR process includes parental requests
- Response within 1 month

### 9.2 Withdrawal Rights

**Parents Can:**
- Withdraw location consent for child
- Withdraw IP tracking consent for child
- Request deletion of child's data
- Object to processing

**Process:**
- Immediate effect on withdrawal
- Data deleted if requested
- Confirmation sent to parent

---

## 10. Current Implementation Status

### 10.1 Age Restriction

**Current:** Services restricted to 18+ only

**Impact:**
- No children's data currently processed
- Age verification at registration
- Terms require 18+ confirmation

### 10.2 Future Considerations

**If Services Extended to Children:**
- Implement parental consent mechanism
- Age-appropriate design updates
- Enhanced privacy controls
- Shorter retention periods
- Reduced data precision

---

## 11. Compliance Monitoring

### 11.1 Regular Checks

**Quarterly Reviews:**
- Age verification effectiveness
- No children's data processed (current)
- Age-appropriate design compliance

**Annual Reviews:**
- Children's safeguards audit
- Age verification process review
- Privacy notice age-appropriateness

### 11.2 Incident Response

**Children's Data Incidents:**
- Immediate investigation
- Enhanced notification (to parents if applicable)
- ICO notification if required
- Remediation measures
- Enhanced safeguards if needed

---

## 12. Documentation Requirements

### 12.1 Required Documentation

- ✅ Children's safeguards document (this document)
- ✅ Age verification process documentation
- ✅ Parental consent process (if implemented)
- ✅ Age-appropriate design guidelines
- ✅ Privacy notice age-appropriate sections

### 12.2 Ongoing Requirements

- Annual review of children's safeguards
- Updates on age-appropriate design code
- Privacy notice updates
- Age verification improvements

---

## 13. Review and Updates

**Last Updated:** February 2025  
**Next Review:** February 2026 (or on service changes)  
**Review Frequency:** Annual or on service changes

**Change Log:**
- 2025-02-XX: Initial children's safeguards document created

---

**Document Owner:** Data Protection Officer  
**Approved By:** TBD  
**Date:** TBD
