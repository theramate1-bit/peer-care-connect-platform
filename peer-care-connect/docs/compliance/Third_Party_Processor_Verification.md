# Third-Party Processor Verification Checklist
## Location Data & IP Tracking

**Date:** February 2025  
**Version:** 1.0  
**Review Frequency:** Annual  
**Last Review:** [To be completed]

---

## 📋 **OVERVIEW**

**Purpose:**
This checklist ensures all third-party processors handling location/IP data have appropriate safeguards and comply with UK GDPR requirements.

**Legal Requirement:**
UK GDPR Article 28 requires data processing agreements (DPAs) with all processors and verification of their compliance.

---

## 🔍 **PROCESSOR VERIFICATION CHECKLIST**

### **PROCESSOR 1: SUPABASE (Database & Hosting)**

**Data Processed:**
- Location data (GPS coordinates, addresses)
- IP addresses (server logs)
- Consent records
- Access logs

**Verification Status:** ⚠️ **NEEDS VERIFICATION**

#### **Checklist:**

- [ ] **DPA Signed:** Verify Data Processing Agreement is signed
- [ ] **DPA Date:** [Date]
- [ ] **DPA Expiry:** [Date]
- [ ] **Location:** EU/UK data centers (no third-country transfer)
- [ ] **Security Certification:** ISO 27001 or equivalent
- [ ] **Encryption:** AES-256 at rest, TLS 1.3 in transit
- [ ] **Access Controls:** Role-based access controls verified
- [ ] **Audit Logging:** Processor provides audit logs
- [ ] **Breach Notification:** Processor commits to 72-hour notification
- [ ] **Sub-processors:** List of sub-processors reviewed
- [ ] **Data Retention:** Processor respects our retention requirements
- [ ] **Deletion:** Processor can delete data on request
- [ ] **Compliance:** Processor certified for UK GDPR compliance

**Action Items:**
- [ ] Request DPA copy from Supabase
- [ ] Verify DPA includes UK GDPR clauses
- [ ] Review sub-processor list
- [ ] Verify data center locations
- [ ] Test data deletion process

**Next Review:** [Date + 1 year]

---

### **PROCESSOR 2: GOOGLE TAG MANAGER (Analytics)**

**Data Processed:**
- IP addresses (via analytics cookies)
- Behavioral tracking data
- User journey data

**Verification Status:** ⚠️ **NEEDS VERIFICATION**

#### **Checklist:**

- [ ] **DPA Signed:** Verify Data Processing Agreement is signed
- [ ] **DPA Date:** [Date]
- [ ] **DPA Expiry:** [Date]
- [ ] **Location:** US (EU-US Data Privacy Framework)
- [ ] **Transfer Safeguards:** EU-US Data Privacy Framework adequacy
- [ ] **Consent Mechanism:** GTM respects cookie consent
- [ ] **IP Anonymization:** IP addresses anonymized by Google
- [ ] **Data Retention:** Google Analytics retention settings configured
- [ ] **Sub-processors:** Google sub-processors reviewed
- [ ] **Breach Notification:** Google commits to breach notification
- [ ] **Data Minimization:** Only necessary data collected
- [ ] **User Rights:** Google supports data subject rights

**Action Items:**
- [ ] Verify Google Analytics DPA is signed
- [ ] Configure IP anonymization in GTM
- [ ] Set data retention to 26 months
- [ ] Verify consent mechanism works
- [ ] Review Google sub-processor list
- [ ] Test data deletion via Google Analytics

**Next Review:** [Date + 1 year]

**Notes:**
- Google Analytics 4 automatically anonymizes IP addresses
- EU-US Data Privacy Framework provides adequacy for transfers
- Cookie consent must be respected before GTM loads

---

### **PROCESSOR 3: VERCEL (Hosting & CDN)**

**Data Processed:**
- IP addresses (server logs, CDN logs)
- General location data (CDN routing)

**Verification Status:** ⚠️ **NEEDS VERIFICATION**

#### **Checklist:**

- [ ] **DPA Signed:** Verify Data Processing Agreement is signed
- [ ] **DPA Date:** [Date]
- [ ] **DPA Expiry:** [Date]
- [ ] **Location:** EU/UK data centers (no third-country transfer)
- [ ] **Security Certification:** ISO 27001 or equivalent
- [ ] **Encryption:** TLS 1.3 in transit
- [ ] **Log Retention:** CDN logs retention period verified
- [ ] **Access Controls:** Vercel access controls reviewed
- [ ] **Breach Notification:** Vercel commits to breach notification
- [ ] **Sub-processors:** Vercel sub-processors reviewed
- [ ] **Data Deletion:** Vercel can delete logs on request
- [ ] **Compliance:** Vercel certified for UK GDPR compliance

**Action Items:**
- [ ] Request DPA copy from Vercel
- [ ] Verify DPA includes UK GDPR clauses
- [ ] Review Vercel sub-processor list
- [ ] Verify data center locations
- [ ] Configure log retention periods
- [ ] Test log deletion process

**Next Review:** [Date + 1 year]

---

### **PROCESSOR 4: GOOGLE MAPS API (Geocoding)**

**Data Processed:**
- Addresses (for geocoding to coordinates)
- General location data (for map display)

**Verification Status:** ⚠️ **NEEDS VERIFICATION**

#### **Checklist:**

- [ ] **DPA Signed:** Verify Data Processing Agreement is signed
- [ ] **DPA Date:** [Date]
- [ ] **DPA Expiry:** [Date]
- [ ] **Location:** US (EU-US Data Privacy Framework)
- [ ] **Transfer Safeguards:** EU-US Data Privacy Framework adequacy
- [ ] **Data Minimization:** Only addresses sent (not user IDs)
- [ ] **Data Retention:** Google Maps retention policy reviewed
- [ ] **Sub-processors:** Google sub-processors reviewed
- [ ] **Breach Notification:** Google commits to breach notification
- [ ] **Compliance:** Google certified for UK GDPR compliance

**Action Items:**
- [ ] Verify Google Maps DPA is signed
- [ ] Review Google Maps data retention policy
- [ ] Ensure user IDs are not sent to Google Maps
- [ ] Review Google sub-processor list
- [ ] Verify EU-US Data Privacy Framework applies

**Next Review:** [Date + 1 year]

**Notes:**
- Google Maps API processes addresses for geocoding
- User IDs should not be sent to Google Maps
- EU-US Data Privacy Framework provides adequacy

---

### **PROCESSOR 5: RESEND (Email Service)**

**Data Processed:**
- IP addresses (email delivery logs)
- Email addresses (for delivery)

**Verification Status:** ⚠️ **NEEDS VERIFICATION**

#### **Checklist:**

- [ ] **DPA Signed:** Verify Data Processing Agreement is signed
- [ ] **DPA Date:** [Date]
- [ ] **DPA Expiry:** [Date]
- [ ] **Location:** US (EU-US Data Privacy Framework)
- [ ] **Transfer Safeguards:** EU-US Data Privacy Framework adequacy
- [ ] **Log Retention:** Email logs retention verified
- [ ] **Security:** Encryption in transit verified
- [ ] **Breach Notification:** Resend commits to breach notification
- [ ] **Sub-processors:** Resend sub-processors reviewed
- [ ] **Compliance:** Resend certified for UK GDPR compliance

**Action Items:**
- [ ] Request DPA copy from Resend
- [ ] Verify DPA includes UK GDPR clauses
- [ ] Review Resend sub-processor list
- [ ] Verify EU-US Data Privacy Framework applies
- [ ] Configure log retention periods

**Next Review:** [Date + 1 year]

---

## 📊 **VERIFICATION SUMMARY**

### **Overall Status:**

| Processor | DPA Status | Location | Transfer Safeguards | Compliance | Next Review |
|-----------|------------|----------|-------------------|------------|-------------|
| Supabase | ⚠️ Needs Verification | EU/UK | N/A | ⚠️ | [Date] |
| Google Tag Manager | ⚠️ Needs Verification | US | EU-US DPF | ⚠️ | [Date] |
| Vercel | ⚠️ Needs Verification | EU/UK | N/A | ⚠️ | [Date] |
| Google Maps | ⚠️ Needs Verification | US | EU-US DPF | ⚠️ | [Date] |
| Resend | ⚠️ Needs Verification | US | EU-US DPF | ⚠️ | [Date] |

**Legend:**
- ✅ Verified
- ⚠️ Needs Verification
- ❌ Non-Compliant

---

## 🎯 **ACTION PLAN**

### **Immediate Actions (This Month):**

1. **Request DPAs:**
   - [ ] Email Supabase: Request DPA copy
   - [ ] Email Google: Request Analytics DPA
   - [ ] Email Vercel: Request DPA copy
   - [ ] Email Google: Request Maps DPA
   - [ ] Email Resend: Request DPA copy

2. **Review DPAs:**
   - [ ] Verify UK GDPR clauses included
   - [ ] Verify breach notification clauses
   - [ ] Verify data deletion clauses
   - [ ] Verify sub-processor clauses

3. **Verify Compliance:**
   - [ ] Check processor certifications
   - [ ] Verify data center locations
   - [ ] Review sub-processor lists
   - [ ] Test data deletion processes

### **Short-term Actions (Next 3 Months):**

4. **Document Findings:**
   - [ ] Create DPA register
   - [ ] Document verification results
   - [ ] Update ROPA with processor details
   - [ ] Create processor compliance report

5. **Establish Monitoring:**
   - [ ] Schedule annual reviews
   - [ ] Set up DPA expiry alerts
   - [ ] Create processor change notification process
   - [ ] Establish breach notification procedures

---

## 📋 **DPA TEMPLATE REQUIREMENTS**

**Required Clauses:**
- ✅ Subject matter and duration of processing
- ✅ Nature and purpose of processing
- ✅ Type of personal data
- ✅ Categories of data subjects
- ✅ Obligations and rights of controller
- ✅ Processor must process only on documented instructions
- ✅ Processor must ensure persons authorized to process are bound by confidentiality
- ✅ Processor must implement appropriate security measures
- ✅ Processor must assist controller with data subject rights
- ✅ Processor must assist controller with breach notifications
- ✅ Processor must delete or return data after processing
- ✅ Processor must make available information for compliance audits
- ✅ Processor must notify controller before engaging sub-processors
- ✅ Processor must ensure sub-processors are bound by same obligations

---

## 🔄 **ANNUAL REVIEW PROCESS**

**Review Schedule:**
- **Frequency:** Annual
- **Timing:** February (aligned with compliance review)
- **Responsible:** DPO/Privacy Team

**Review Steps:**
1. Request updated DPAs from all processors
2. Verify processor compliance status
3. Review sub-processor lists
4. Test data deletion processes
5. Update processor register
6. Document findings
7. Address any non-compliance issues

**Review Checklist:**
- [ ] All DPAs current and signed
- [ ] All processors still compliant
- [ ] Sub-processor lists reviewed
- [ ] Data deletion processes tested
- [ ] Processor register updated
- [ ] Findings documented
- [ ] Action items tracked

---

## 📞 **CONTACTS**

**DPA Requests:**
- Supabase: legal@supabase.com
- Google: gdpr-requests@google.com
- Vercel: legal@vercel.com
- Resend: legal@resend.com

**Internal:**
- DPO: privacy@theramate.co.uk
- Legal: legal@theramate.co.uk

---

**Last Updated:** February 2025  
**Next Review:** February 2026
