# Data Subject Access Request (DSAR) Process
## Location & IP Data Handling

**Date:** February 2025  
**Version:** 1.0  
**Reference:** UK GDPR Article 15, DPA 2018

---

## 1. Overview

This document outlines how location and IP address data is handled in Data Subject Access Requests (DSARs) under UK GDPR Article 15.

---

## 2. DSAR Process for Location Data

### 2.1 Location Data Included in DSAR

**Data Categories:**
- All addresses stored in `user_locations` table
- GPS coordinates (latitude, longitude)
- Service radius preferences
- Location history (if location updated multiple times)
- PostGIS geometry points (exported as coordinates)

**Data Sources:**
- `user_locations` table
- Location access audit logs
- Location consent records

### 2.2 Location Data Export Format

**Format:** JSON and CSV

**JSON Structure:**
```json
{
  "location_data": {
    "primary_location": {
      "address": "123 Test Street, London",
      "city": "London",
      "postal_code": "SW1A 1AA",
      "country": "United Kingdom",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "service_radius_km": 25,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-02-01T14:20:00Z"
    },
    "additional_locations": [...],
    "location_consent": {
      "consented": true,
      "consented_at": "2025-01-15T10:25:00Z",
      "withdrawn_at": null
    },
    "location_access_log": [...]
  }
}
```

**CSV Structure:**
```csv
address,city,postal_code,country,latitude,longitude,service_radius_km,created_at,updated_at
123 Test Street,London,SW1A 1AA,United Kingdom,51.5074,-0.1278,25,2025-01-15T10:30:00Z,2025-02-01T14:20:00Z
```

### 2.3 Location Data Collection Process

**SQL Query:**
```sql
SELECT 
  ul.*,
  lc.consented,
  lc.consented_at,
  lc.withdrawn_at
FROM user_locations ul
LEFT JOIN location_consents lc ON lc.user_id = ul.user_id
WHERE ul.user_id = :user_id
ORDER BY ul.created_at DESC;
```

**Access Log Query:**
```sql
SELECT *
FROM location_access_log
WHERE user_id = :user_id
ORDER BY accessed_at DESC;
```

---

## 3. DSAR Process for IP Address Data

### 3.1 IP Address Data Included in DSAR

**Data Categories:**
- IP addresses from security logs (last 12 months)
- IP addresses from analytics (if consent granted, last 26 months)
- IP addresses from error logs (last 3 months)
- General location inference (country, city)
- Timestamps of IP collection
- Associated user sessions

**Data Sources:**
- `ip_tracking_log` table
- Server logs (Supabase)
- Analytics data (Google Tag Manager - if accessible)

### 3.2 IP Address Export Format

**Format:** JSON and CSV

**JSON Structure:**
```json
{
  "ip_address_data": {
    "security_logs": [
      {
        "ip_address": "192.168.1.1",
        "general_location": {
          "country": "United Kingdom",
          "city": "London"
        },
        "purpose": "security",
        "collected_at": "2025-01-15T10:30:00Z",
        "anonymized": false
      }
    ],
    "analytics_data": [
      {
        "ip_address": "192.168.1.2",
        "general_location": {
          "country": "United Kingdom",
          "city": "London"
        },
        "purpose": "analytics",
        "consent_status": "granted",
        "collected_at": "2025-01-15T10:35:00Z",
        "anonymized": false
      }
    ],
    "ip_consent": {
      "analytics_consent": true,
      "consented_at": "2025-01-10T09:00:00Z"
    }
  }
}
```

**CSV Structure:**
```csv
ip_address,general_location_country,general_location_city,purpose,consent_status,collected_at,anonymized
192.168.1.1,United Kingdom,London,security,N/A,2025-01-15T10:30:00Z,false
192.168.1.2,United Kingdom,London,analytics,granted,2025-01-15T10:35:00Z,false
```

### 3.3 IP Address Collection Process

**SQL Query:**
```sql
SELECT 
  itl.*,
  ic.analytics_consent,
  ic.consented_at
FROM ip_tracking_log itl
LEFT JOIN ip_consents ic ON ic.user_id = itl.user_id
WHERE itl.user_id = :user_id
AND itl.collected_at > NOW() - INTERVAL '26 months'
ORDER BY itl.collected_at DESC;
```

---

## 4. DSAR Response Timeline

### 4.1 Standard Timeline

**UK GDPR Requirement:** Response within 1 month (can be extended by 2 months for complex requests)

**Theramate Process:**
- **Day 1:** DSAR received, identity verification initiated
- **Day 2-3:** Identity verification completed
- **Day 4-10:** Data collection and compilation
- **Day 11-20:** Data review and formatting
- **Day 21-28:** Response sent to data subject

**Complex Requests:**
- If request is complex or involves large volumes of data
- Extension notification sent within 1 month
- Extended deadline: 3 months total

### 4.2 Location/IP Data Specific Timeline

**Location Data:**
- Collection: 1-2 days (straightforward database query)
- Formatting: 1 day
- Review: 1 day
- **Total: 3-4 days**

**IP Address Data:**
- Collection: 2-3 days (may require log aggregation)
- Formatting: 1 day
- Review: 1 day
- **Total: 4-5 days**

**Combined Request:**
- **Total: 5-7 days** (within 1 month requirement)

---

## 5. Data Portability (Article 20)

### 5.1 Location Data Portability

**Format:** Machine-readable (JSON, CSV)

**Structure:** As specified in Section 2.2

**Delivery Method:**
- Secure download link (expires in 7 days)
- Encrypted email attachment
- Postal delivery (if requested)

### 5.2 IP Address Portability

**Format:** Machine-readable (JSON, CSV)

**Structure:** As specified in Section 3.2

**Note:** IP addresses are less portable than location data (historical data, not actively used by users)

---

## 6. Verification and Security

### 6.1 Identity Verification

**Required Information:**
- User account email
- Government-issued ID (for sensitive requests)
- Additional verification questions (if needed)

**Process:**
- Verify email matches account
- Cross-reference with account details
- Request additional verification if suspicious

### 6.2 Secure Delivery

**Methods:**
- Encrypted email (PGP if requested)
- Secure download link (password-protected, expires in 7 days)
- Postal delivery (registered mail, if requested)

**Security Measures:**
- No data sent to unverified email addresses
- Download links expire after 7 days
- Access logs maintained for download links

---

## 7. Exemptions and Limitations

### 7.1 Location Data Exemptions

**No exemptions apply** - Location data must be provided in full DSAR response

### 7.2 IP Address Exemptions

**Security Exemptions:**
- IP addresses that would compromise security if disclosed
- IP addresses of other users (third-party data)
- IP addresses in active security investigations

**Process:**
- Review each IP address for security concerns
- Redact sensitive IP addresses if necessary
- Explain redactions in response

---

## 8. Automated DSAR Processing

### 8.1 Location Data Function

**Function:** `export_location_data_for_dsar(user_id)`

**Process:**
1. Query `user_locations` table
2. Query `location_consents` table
3. Query `location_access_log` table
4. Format as JSON and CSV
5. Generate secure download link
6. Log export in DSAR events

### 8.2 IP Address Function

**Function:** `export_ip_data_for_dsar(user_id)`

**Process:**
1. Query `ip_tracking_log` table
2. Query `ip_consents` table
3. Aggregate server logs (if accessible)
4. Format as JSON and CSV
5. Generate secure download link
6. Log export in DSAR events

---

## 9. DSAR Response Template

### 9.1 Location Data Section

```
LOCATION DATA

We have collected the following location data associated with your account:

Primary Location:
- Address: [address]
- Coordinates: [latitude], [longitude]
- Service Radius: [radius] km
- Created: [date]
- Last Updated: [date]

[Additional locations if applicable]

Location Consent:
- Consent Status: [granted/withdrawn]
- Consented At: [date]
- [Withdrawn At: [date] if applicable]

Location Access History:
[Summary of location access logs]

Full data export available in attached JSON/CSV files.
```

### 9.2 IP Address Section

```
IP ADDRESS DATA

We have collected the following IP address data associated with your account:

Security Logs (Last 12 months):
- [Number] IP addresses collected for security purposes
- General locations: [countries/cities]
- Full list in attached export

Analytics Data (Last 26 months, if consent granted):
- [Number] IP addresses collected for analytics
- Consent status: [granted/denied]
- Full list in attached export

IP addresses are anonymized after retention periods as per our privacy policy.

Full data export available in attached JSON/CSV files.
```

---

## 10. Updates and Review

**Last Updated:** February 2025  
**Next Review:** February 2026 (or on process changes)  
**Review Frequency:** Annual or on process changes

**Change Log:**
- 2025-02-XX: Initial DSAR process document created

---

**Document Owner:** Data Protection Officer  
**Approved By:** TBD  
**Date:** TBD
