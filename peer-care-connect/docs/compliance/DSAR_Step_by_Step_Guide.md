# Data Subject Access Request (DSAR) Guide
## Step-by-Step Procedures for Location & IP Data

**Date:** February 2025  
**Version:** 1.0  
**Reference:** UK GDPR Article 15, DPA 2018

---

## 📋 **OVERVIEW**

**What is a DSAR?**
A Data Subject Access Request (DSAR) is a user's right to request a copy of all personal data we hold about them, including location data and IP addresses.

**Legal Requirement:**
- Must respond within **30 days** (can extend to 60 days for complex requests)
- Must provide data in structured, commonly used format
- Must be free of charge (unless requests are excessive or unfounded)

**What Data Must Be Included:**
- Location data (GPS coordinates, addresses)
- IP addresses (if collected)
- Consent records
- Access logs (who accessed their data)
- Any other personal data

---

## 🔄 **DSAR PROCESS FLOW**

```
1. Receive Request
   ↓
2. Acknowledge (within 3 days)
   ↓
3. Verify Identity
   ↓
4. Collect Data
   ↓
5. Review & Redact (if necessary)
   ↓
6. Format Data
   ↓
7. Send Response (within 30 days)
   ↓
8. Document Request
```

---

## 📝 **STEP-BY-STEP PROCEDURE**

### **STEP 1: RECEIVE REQUEST**

**Where Requests Come From:**
- Email: privacy@theramate.co.uk
- Support tickets
- In-app requests
- Postal mail

**What to Look For:**
- "I want my data"
- "Subject access request"
- "GDPR request"
- "Data protection request"
- "What data do you have on me?"

**Action:**
1. Log request in DSAR tracking system
2. Assign unique DSAR reference number (e.g., DSAR-2025-001)
3. Note request date and time
4. Forward to privacy@theramate.co.uk if not already there

**Template Response (Acknowledgment):**
```
Subject: DSAR Acknowledgment - Reference: DSAR-2025-001

Dear [User Name],

Thank you for your data subject access request received on [Date].

We have assigned your request reference number: DSAR-2025-001

We will respond to your request within 30 days as required by UK GDPR. 
If your request is complex, we may extend this to 60 days, in which 
case we will notify you within 30 days.

To process your request, we need to verify your identity. Please provide:
- Your registered email address
- Your account ID (if available)
- A copy of photo ID (passport or driving licence)

Once we have verified your identity, we will proceed with collecting 
your data.

If you have any questions, please contact privacy@theramate.co.uk

Best regards,
Theramate Data Protection Team
```

---

### **STEP 2: VERIFY IDENTITY**

**Why Verify?**
- Prevent unauthorized access to personal data
- Protect user privacy
- Legal requirement

**Verification Methods:**
1. **Email Verification:** User must request from registered email
2. **Account Login:** User must be logged into their account
3. **ID Verification:** For sensitive requests, require photo ID

**Action:**
1. Check if request is from registered email address
2. If not, request verification:
   - Ask user to confirm registered email
   - Request photo ID if sensitive data involved
3. Verify user account exists
4. Document verification method used

**If Identity Cannot Be Verified:**
- Request additional verification
- Do not proceed until verified
- Document attempts

---

### **STEP 3: COLLECT DATA**

**Data Sources:**

#### **3.1 Location Data**

**SQL Query:**
```sql
-- Get user location data
SELECT 
  id,
  user_id,
  address,
  city,
  state,
  postal_code,
  country,
  latitude,
  longitude,
  service_radius_km,
  created_at,
  updated_at
FROM user_locations
WHERE user_id = '[USER_ID]';
```

**What to Include:**
- All addresses
- GPS coordinates
- Service radius preferences
- Creation/update dates

#### **3.2 IP Addresses**

**SQL Query:**
```sql
-- Get IP tracking logs
SELECT 
  id,
  user_id,
  ip_address,
  purpose,
  consent_status,
  timestamp,
  metadata
FROM ip_tracking_log
WHERE user_id = '[USER_ID]'
ORDER BY timestamp DESC;
```

**What to Include:**
- All IP addresses collected
- Purpose (security/analytics)
- Consent status
- Timestamps

#### **3.3 Consent Records**

**SQL Query:**
```sql
-- Get location consent records
SELECT 
  id,
  user_id,
  consent_granted,
  granted_at,
  withdrawn_at
FROM location_consents
WHERE user_id = '[USER_ID]';
```

**What to Include:**
- Consent status
- Grant date
- Withdrawal date (if applicable)

#### **3.4 Access Logs**

**SQL Query:**
```sql
-- Get location access logs
SELECT 
  id,
  user_id,
  accessed_by_user_id,
  location_id,
  action,
  ip_address,
  user_agent,
  endpoint,
  accessed_at,
  metadata
FROM location_access_log
WHERE user_id = '[USER_ID]'
ORDER BY accessed_at DESC;
```

**What to Include:**
- Who accessed location data
- When accessed
- Why accessed (action/purpose)
- IP address of accessor

#### **3.5 Other Personal Data**

**Additional Queries:**
```sql
-- User account data
SELECT * FROM users WHERE id = '[USER_ID]';

-- Booking data (may contain location)
SELECT * FROM bookings WHERE client_id = '[USER_ID]' OR practitioner_id = '[USER_ID]';

-- Messages (may contain location references)
SELECT * FROM messages WHERE sender_id = '[USER_ID]' OR recipient_id = '[USER_ID]';
```

---

### **STEP 4: REVIEW & REDACT**

**What to Review:**
- Remove third-party data (other users' information)
- Remove sensitive business information
- Remove system/internal data not relevant to user

**Redaction Guidelines:**
- ✅ Include: User's own data
- ❌ Exclude: Other users' data
- ❌ Exclude: Internal system data
- ❌ Exclude: Business-sensitive information

**Example Redaction:**
```
Original: "Location accessed by practitioner_id: abc123"
Redacted: "Location accessed by practitioner [ID redacted for privacy]"
```

---

### **STEP 5: FORMAT DATA**

**Format Options:**
- JSON (structured, machine-readable)
- CSV (spreadsheet-friendly)
- PDF (human-readable)

**Recommended Format: JSON**

**JSON Structure:**
```json
{
  "dsar_reference": "DSAR-2025-001",
  "request_date": "2025-02-15",
  "response_date": "2025-02-20",
  "user_id": "user_abc123",
  "data_categories": {
    "location_data": [
      {
        "id": "loc_001",
        "address": "123 Test Street, London",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-06-20T14:30:00Z"
      }
    ],
    "ip_addresses": [
      {
        "ip_address": "192.168.1.1",
        "purpose": "analytics",
        "consent_status": "granted",
        "timestamp": "2024-01-15T10:00:00Z"
      }
    ],
    "consent_records": [
      {
        "consent_type": "location_tracking",
        "consent_granted": true,
        "granted_at": "2024-01-15T10:00:00Z",
        "withdrawn_at": null
      }
    ],
    "access_logs": [
      {
        "accessed_by": "system",
        "action": "marketplace_search",
        "accessed_at": "2024-01-15T10:05:00Z",
        "endpoint": "/api/marketplace/search"
      }
    ]
  },
  "metadata": {
    "data_retention": {
      "location_data": "7 years or until account deletion",
      "ip_addresses": "12-26 months depending on purpose"
    },
    "lawful_basis": {
      "location_data": "Consent (UK GDPR Article 6(1)(a))",
      "ip_addresses": "Legitimate Interests (security) and Consent (analytics)"
    }
  }
}
```

---

### **STEP 6: SEND RESPONSE**

**Response Requirements:**
- Within 30 days of request (or 60 days if complex)
- Secure delivery method
- Clear explanation of data
- Information about rights

**Delivery Methods:**
1. **Encrypted Email** (preferred)
   - Use encrypted email service
   - Password-protect attachment
   - Send password separately

2. **Secure Portal** (if available)
   - Upload to secure portal
   - Send link to user
   - Require authentication

3. **Postal Mail** (if requested)
   - Send via recorded delivery
   - Use secure envelope
   - Require signature

**Template Response:**
```
Subject: DSAR Response - Reference: DSAR-2025-001

Dear [User Name],

Thank you for your data subject access request (Reference: DSAR-2025-001).

We have completed our search and are providing you with a copy of all 
personal data we hold about you, including location data and IP addresses.

**Data Included:**
- Location data (addresses, GPS coordinates)
- IP addresses (with purpose and consent status)
- Consent records
- Access logs (who accessed your data and when)

**Data Format:**
The data is provided in JSON format, which is structured and 
machine-readable. You can open it in any text editor or JSON viewer.

**Data Retention:**
- Location data: Retained for 7 years or until account deletion
- IP addresses: Retained for 12-26 months depending on purpose

**Your Rights:**
You have the right to:
- Rectify inaccurate data
- Erase your data (subject to retention requirements)
- Restrict processing
- Object to processing
- Data portability

To exercise any of these rights, please contact privacy@theramate.co.uk

**Security:**
This email contains sensitive personal data. Please keep it secure 
and do not share it with unauthorized parties.

If you have any questions about your data, please contact us at 
privacy@theramate.co.uk

Best regards,
Theramate Data Protection Team

---
Attachment: DSAR-2025-001-data.json (password-protected)
Password: [Sent separately]
```

---

### **STEP 7: DOCUMENT REQUEST**

**Documentation Required:**
- Request date and time
- User identity verification method
- Data collection date
- Response date
- Data categories provided
- Any issues or complications
- User feedback (if any)

**DSAR Log Entry:**
```
DSAR Reference: DSAR-2025-001
Request Date: 2025-02-15
User ID: user_abc123
Request Method: Email
Identity Verified: Yes (email verification)
Data Collected: 2025-02-18
Response Sent: 2025-02-20
Response Time: 5 days
Data Categories: Location, IP addresses, Consent, Access logs
Status: Completed
Notes: User requested JSON format, provided successfully
```

---

## ⚠️ **SPECIAL CASES**

### **Case 1: Excessive or Unfounded Requests**

**Definition:**
- Multiple requests from same user
- Requests clearly intended to disrupt business
- Requests for data we don't hold

**Action:**
1. Can charge reasonable fee
2. Can refuse request (with explanation)
3. Must still respond within 30 days
4. Document refusal and reason

**Template:**
```
We are unable to process your request as it is excessive/unfounded.

Reason: [Explain why]

You have the right to complain to the ICO if you disagree.
```

### **Case 2: Third-Party Data**

**Issue:**
- User's data contains other users' information
- Cannot disclose third-party data

**Action:**
1. Redact third-party data
2. Explain redaction
3. Provide user's own data only

**Template:**
```
Some data has been redacted to protect other users' privacy.

Redacted: [Explain what was redacted and why]
```

### **Case 3: Complex Request**

**Definition:**
- Multiple data categories
- Historical data spanning years
- Requires extensive investigation

**Action:**
1. Acknowledge within 3 days
2. Notify extension within 30 days
3. Explain why extension needed
4. Provide estimated completion date

**Template:**
```
Your request is complex and requires additional time.

We will respond within 60 days (extended from 30 days).

Reason: [Explain complexity]

Estimated completion: [Date]
```

---

## 📊 **METRICS & REPORTING**

### **DSAR Metrics to Track:**
- Number of requests received
- Average response time
- Data categories requested
- Completion rate
- User satisfaction

### **Monthly Report:**
```
DSAR Report - [Month] [Year]

Total Requests: X
Completed: X
In Progress: X
Average Response Time: X days
Data Categories:
  - Location: X requests
  - IP Addresses: X requests
  - Both: X requests
Issues: [List any issues]
```

---

## ✅ **CHECKLIST**

**Before Sending Response:**
- [ ] Identity verified
- [ ] All data collected
- [ ] Third-party data redacted
- [ ] Data formatted correctly
- [ ] Response within 30 days
- [ ] Secure delivery method used
- [ ] Request documented
- [ ] User rights information included

---

## 📞 **ESCALATION**

**Escalate to DPO if:**
- Request is complex
- Identity cannot be verified
- Data contains sensitive information
- User threatens legal action
- Request involves third-party data
- Any uncertainty about response

**Contact:** privacy@theramate.co.uk

---

**Last Updated:** February 2025  
**Next Review:** February 2026
