# Staff Training Guide
## Location Data & IP Tracking Compliance

**Date:** February 2025  
**Version:** 1.0  
**Target Audience:** All Staff  
**Training Duration:** 30 minutes  
**Required:** Annual

---

## 🎯 **TRAINING OBJECTIVES**

By the end of this training, staff will:
1. Understand UK GDPR, DPA 2018, and PECR requirements for location/IP data
2. Know how to handle location/IP data requests from users
3. Understand consent mechanisms and withdrawal processes
4. Know how to identify and escalate data protection incidents
5. Understand their responsibilities regarding data protection

---

## 📚 **MODULE 1: UNDERSTANDING THE LAW**

### **1.1 UK GDPR Overview**

**What is UK GDPR?**
- UK General Data Protection Regulation (retained EU law)
- Applies to all personal data processing
- Location data and IP addresses are personal data
- Requires lawful basis, transparency, and user rights

**Key Principles:**
- Lawfulness, fairness, and transparency
- Purpose limitation
- Data minimization
- Accuracy
- Storage limitation
- Integrity and confidentiality
- Accountability

### **1.2 DPA 2018 Overview**

**What is DPA 2018?**
- Data Protection Act 2018
- Implements UK GDPR in UK law
- Provides enforcement powers to ICO
- Sets out specific exemptions

**Key Points:**
- ICO can issue fines up to £17.5 million or 4% of global turnover
- Criminal offences for serious breaches
- Individual right to compensation

### **1.3 PECR Overview**

**What is PECR?**
- Privacy and Electronic Communications Regulations
- Specific rules for electronic communications
- **Location data requires explicit consent**
- Cookie consent requirements

**Key Requirements:**
- Network-derived location data = PECR-regulated
- Must have consent before processing
- Must be for value-added service
- Service cannot function without location

---

## 📚 **MODULE 2: WHAT DATA WE COLLECT**

### **2.1 Location Data**

**What We Collect:**
- Precise GPS coordinates (latitude, longitude)
- Street addresses
- Service radius preferences

**Why We Collect:**
- Marketplace matching (find nearby practitioners)
- Core functionality - cannot operate without it

**Legal Basis:**
- **Consent** (UK GDPR Article 6(1)(a))
- **PECR:** Network-derived location data requires consent

**Consent Required:** ✅ **YES - Explicit opt-in**

### **2.2 IP Addresses**

**What We Collect:**
- IPv4/IPv6 addresses
- General location inference (country/city level)

**Why We Collect:**
- Security and fraud prevention (legitimate interests)
- Analytics and service improvement (with consent)

**Legal Basis:**
- **Legitimate Interests** (security) - Article 6(1)(f)
- **Consent** (analytics) - Article 6(1)(a)

**Consent Required:** ⚠️ **PARTIAL** - Consent for analytics, not for security

---

## 📚 **MODULE 3: CONSENT MECHANISMS**

### **3.1 Location Consent**

**How It Works:**
1. User sees location consent prompt
2. User must explicitly grant permission
3. Consent is recorded in database (`location_consents` table)
4. Location tracking begins only after consent

**Key Points:**
- ✅ Consent is explicit (not pre-checked)
- ✅ Consent can be withdrawn anytime
- ✅ Withdrawal takes effect immediately
- ✅ Users can still use platform without location (manual address entry)

**What Staff Should Know:**
- Never assume consent
- Always check consent status before accessing location
- Respect withdrawal immediately
- Document consent interactions

### **3.2 Cookie Consent**

**How It Works:**
1. User sees cookie consent banner
2. User chooses: Accept all, Reject non-essential, or Custom
3. Consent stored in localStorage
4. Google Tag Manager respects consent

**Key Points:**
- ✅ Analytics cookies require consent
- ✅ IP addresses collected via analytics require consent
- ✅ Security IP logging does NOT require consent (legitimate interests)
- ✅ Users can change preferences anytime

**What Staff Should Know:**
- Cookie consent affects analytics IP tracking
- Security IP logging happens regardless
- Users can opt-out of analytics anytime

---

## 📚 **MODULE 4: HANDLING USER REQUESTS**

### **4.1 Data Subject Access Requests (DSARs)**

**What is a DSAR?**
- User requests copy of their personal data
- Includes location data and IP addresses
- Must respond within 30 days (can extend to 60 for complex requests)

**How to Handle:**
1. **Acknowledge** request within 3 days
2. **Verify** user identity
3. **Collect** all relevant data:
   - Location data from `user_locations` table
   - IP addresses from `ip_tracking_log` table
   - Consent records from `location_consents` table
   - Access logs from `location_access_log` table
4. **Format** data clearly (JSON or CSV)
5. **Send** securely (encrypted email or secure portal)
6. **Document** request in DSAR log

**What Staff Should Know:**
- Never ignore a DSAR
- Always verify identity
- Include ALL data categories
- Respond within statutory timeframe
- Document everything

**Escalation:** If unsure, escalate to DPO/privacy@theramate.co.uk

### **4.2 Consent Withdrawal Requests**

**How to Handle:**
1. **Acknowledge** request immediately
2. **Verify** user identity
3. **Process** withdrawal:
   - Update `location_consents` table (set `consent_granted = false`, `withdrawn_at = NOW()`)
   - Stop location tracking immediately
   - Delete location data if requested (check retention requirements)
4. **Confirm** withdrawal to user
5. **Document** withdrawal

**What Staff Should Know:**
- Withdrawal must be immediate
- User can still use platform (manual address entry)
- Document all withdrawals
- Check retention requirements before deletion

**Escalation:** Standard procedure, but escalate if user requests deletion during retention period

### **4.3 Erasure Requests**

**How to Handle:**
1. **Acknowledge** request within 3 days
2. **Verify** user identity
3. **Check** retention requirements:
   - Location data: 7 years or account deletion
   - IP addresses: 12-26 months
4. **Process** erasure:
   - If retention period expired: Delete immediately
   - If retention period active: Explain why data must be retained
5. **Confirm** erasure or explain retention
6. **Document** request

**What Staff Should Know:**
- Cannot delete data during retention period (legal requirement)
- Must explain why data is retained
- Can anonymize instead of delete (if appropriate)
- Document all erasure requests

**Escalation:** Always escalate erasure requests to DPO/privacy@theramate.co.uk

### **4.4 Objection to Processing**

**How to Handle:**
1. **Acknowledge** request within 3 days
2. **Verify** user identity
3. **Assess** objection:
   - Location tracking: Can stop (user can use manual address)
   - IP security logging: Cannot stop (legitimate interests, security)
   - IP analytics: Can stop (user can withdraw cookie consent)
4. **Process** objection:
   - Stop processing where possible
   - Explain why processing cannot stop (if applicable)
5. **Confirm** action taken
6. **Document** objection

**What Staff Should Know:**
- Must assess each objection individually
- Cannot stop security IP logging (legitimate interests)
- Can stop location tracking and analytics IP tracking
- Document all objections

**Escalation:** Escalate to DPO/privacy@theramate.co.uk if unsure

---

## 📚 **MODULE 5: INCIDENT RESPONSE**

### **5.1 What is a Personal Data Breach?**

**Definition:**
- Unauthorized access to personal data
- Accidental loss or destruction of personal data
- Unauthorized disclosure of personal data

**Examples:**
- Database hack exposing location data
- Accidental email with location data to wrong recipient
- Lost/stolen device with location data
- Unauthorized access to location database

### **5.2 Incident Response Steps**

**Step 1: Identify**
- Recognize potential breach
- Document what happened
- Assess scope (what data, how many users)

**Step 2: Contain**
- Stop the breach immediately
- Isolate affected systems
- Preserve evidence

**Step 3: Assess**
- Determine if breach is reportable
- Assess risk to individuals
- Document assessment

**Step 4: Notify**
- **ICO:** Within 72 hours (if high risk)
- **Users:** Without undue delay (if high risk)
- Document all notifications

**Step 5: Investigate**
- Root cause analysis
- Prevent recurrence
- Update security measures

**Step 6: Document**
- Complete incident log
- Document all actions taken
- Review and learn

**What Staff Should Know:**
- Report incidents immediately to security@theramate.co.uk
- Never delay reporting
- Document everything
- Follow incident response procedures

**Escalation:** All incidents must be reported to security@theramate.co.uk immediately

---

## 📚 **MODULE 6: DATA HANDLING BEST PRACTICES**

### **6.1 Access Controls**

**Principle of Least Privilege:**
- Only access data you need for your role
- Don't access location/IP data out of curiosity
- Log all access (automatic via audit logs)

**What Staff Should Know:**
- Access is logged automatically
- Unauthorized access is a breach
- Report suspicious access immediately

### **6.2 Data Minimization**

**Only Collect What You Need:**
- Don't collect location data without consent
- Don't collect IP addresses unnecessarily
- Don't retain data longer than necessary

**What Staff Should Know:**
- Follow data minimization principles
- Question if data collection is necessary
- Report unnecessary data collection

### **6.3 Security**

**Keep Data Secure:**
- Use encrypted channels (HTTPS)
- Don't share location/IP data via unencrypted email
- Don't store location/IP data on personal devices
- Use strong passwords (12+ characters, complexity requirements)

**What Staff Should Know:**
- Security is everyone's responsibility
- Report security concerns immediately
- Follow security policies

---

## 📚 **MODULE 7: COMMON SCENARIOS**

### **Scenario 1: User Asks "What Location Data Do You Have?"**

**Response:**
1. Verify user identity
2. Check `user_locations` table for their data
3. Provide clear explanation:
   - "We have your practice location at [address]"
   - "We have your GPS coordinates: [lat, lng]"
   - "This data is used for marketplace matching"
4. Offer to provide copy (DSAR)
5. Document interaction

### **Scenario 2: User Wants to Delete Location Data**

**Response:**
1. Verify user identity
2. Check retention requirements:
   - If account active: Explain 7-year retention requirement
   - If account deleted: Can delete immediately
3. If deletion possible: Process deletion
4. If deletion not possible: Explain why and offer anonymization
5. Document request

### **Scenario 3: User Reports Location Tracking Without Consent**

**Response:**
1. Take report seriously
2. Investigate immediately:
   - Check `location_consents` table
   - Check `location_access_log` table
   - Review code for bugs
3. If breach confirmed: Follow incident response
4. If false alarm: Explain and reassure
5. Document investigation

### **Scenario 4: User Wants to Know Who Accessed Their Location**

**Response:**
1. Verify user identity
2. Check `location_access_log` table
3. Provide access log:
   - Who accessed (user ID or system)
   - When accessed
   - Why accessed (purpose)
4. Explain access controls
5. Document request

---

## ✅ **TRAINING COMPLETION**

### **Knowledge Check**

**Question 1:** What is the lawful basis for location tracking?
- [ ] Legitimate Interests
- [x] Consent
- [ ] Contract
- [ ] Legal Obligation

**Question 2:** How long do we retain location data?
- [ ] 1 year
- [ ] 3 years
- [x] 7 years or until account deletion
- [ ] Forever

**Question 3:** What should you do if a user requests their location data?
- [ ] Ignore it
- [ ] Tell them we don't have it
- [x] Process as DSAR within 30 days
- [ ] Ask them to wait

**Question 4:** When must we notify ICO of a breach?
- [ ] Within 7 days
- [x] Within 72 hours (if high risk)
- [ ] Within 30 days
- [ ] Never

**Question 5:** Can users withdraw location consent?
- [x] Yes, anytime
- [ ] No, once granted
- [ ] Only within 30 days
- [ ] Only if they delete account

---

## 📞 **CONTACTS & RESOURCES**

**Data Protection Officer:**
- Email: privacy@theramate.co.uk
- Escalate all data protection questions here

**Security Team:**
- Email: security@theramate.co.uk
- Report all security incidents here

**Legal Team:**
- Email: legal@theramate.co.uk
- For legal questions

**Resources:**
- Privacy Policy: https://theramate.co.uk/privacy
- Cookie Policy: https://theramate.co.uk/cookies
- Terms & Conditions: https://theramate.co.uk/terms
- Compliance Documentation: `/docs/compliance/`

---

## 📋 **TRAINING RECORD**

**Staff Name:** _________________  
**Date Completed:** ___________  
**Score:** ___/5  
**Trainer:** _________________  
**Next Training Due:** ___________

---

**Last Updated:** February 2025  
**Next Review:** February 2026
