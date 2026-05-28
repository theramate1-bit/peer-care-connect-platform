# Data Retention Schedule
## Location & IP Tracking

**Date:** February 2025  
**Version:** 1.0  
**Reference:** UK GDPR Article 5(1)(e), DPA 2018

---

## 1. Retention Principles

### 1.1 UK GDPR Requirements

**Article 5(1)(e):** Personal data shall be kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed.

**Key Principles:**
- Data retained only as long as necessary for stated purpose
- Legal obligations may require longer retention
- Automated deletion after retention period
- Secure deletion methods

---

## 2. Location Data Retention

### 2.1 Active User Location Data

| Data Type | Retention Period | Legal Basis | Deletion Trigger |
|-----------|-----------------|-------------|------------------|
| User-provided addresses | Until account deletion | User control | User deletes account |
| GPS coordinates | Until account deletion | User control | User deletes account |
| Service radius preferences | Until account deletion | User control | User deletes account |
| PostGIS geometry points | Until account deletion | User control | User deletes account |

**Rationale:**
- Users control their location data
- Location data needed for active marketplace functionality
- Users can update or delete location at any time

### 2.2 Inactive User Location Data

| Data Type | Retention Period | Legal Basis | Deletion Trigger |
|-----------|-----------------|-------------|------------------|
| Location data (inactive accounts) | 7 years after last activity | Legal compliance (tax, healthcare records) | Automated deletion after 7 years |

**Rationale:**
- Legal requirements for healthcare-related records (7 years)
- Tax and accounting compliance (7 years)
- Limitation Act considerations

**Deletion Process:**
- Automated function runs monthly
- Identifies accounts inactive for 7+ years
- Deletes location data from `user_locations` table
- Logs deletion in `data_destruction_log`

### 2.3 Location Access Logs

| Data Type | Retention Period | Legal Basis | Deletion Trigger |
|-----------|-----------------|-------------|------------------|
| Location access audit logs | 3 years | Security/audit | Automated deletion after 3 years |

**Rationale:**
- Security audit requirements
- Incident investigation needs
- 3 years sufficient for audit purposes

---

## 3. IP Address Retention

### 3.1 Security Logs

| Data Type | Retention Period | Legal Basis | Deletion Trigger |
|-----------|-----------------|-------------|------------------|
| IP addresses (security logs) | 12 months | Security/fraud prevention | Automated anonymization after 12 months |

**Rationale:**
- Security monitoring requires recent IP data
- Fraud detection needs recent patterns
- 12 months sufficient for security purposes
- Anonymization (not deletion) after retention

**Anonymization Process:**
- Last octet of IPv4 addresses set to 0 (e.g., 192.168.1.1 → 192.168.1.0)
- Last 64 bits of IPv6 addresses set to 0
- Retains general location (country/city) but not precise IP

### 3.2 Analytics Data

| Data Type | Retention Period | Legal Basis | Deletion Trigger |
|-----------|-----------------|-------------|------------------|
| IP addresses (analytics) | 26 months | Analytics/statistics | Automated anonymization after 26 months |

**Rationale:**
- Google Analytics default retention (26 months)
- Service improvement requires historical data
- Anonymization after retention period

**Anonymization Process:**
- Same as security logs
- IP addresses anonymized but analytics data retained (aggregated)

### 3.3 Error Logs

| Data Type | Retention Period | Legal Basis | Deletion Trigger |
|-----------|-----------------|-------------|------------------|
| IP addresses (error logs) | 3 months | Debugging | Automated deletion after 3 months |

**Rationale:**
- Error debugging requires recent data
- 3 months sufficient for troubleshooting
- Full deletion (not anonymization)

---

## 4. Automated Deletion Implementation

### 4.1 Location Data Deletion Function

**Function:** `delete_old_location_data()`

**Logic:**
```sql
-- Delete location data for accounts inactive 7+ years
DELETE FROM user_locations
WHERE user_id IN (
  SELECT id FROM users
  WHERE updated_at < NOW() - INTERVAL '7 years'
  AND deleted_at IS NULL
);
```

**Schedule:** Monthly cron job

**Logging:** All deletions logged in `data_destruction_log` table

### 4.2 IP Address Anonymization Function

**Function:** `anonymize_old_ip_addresses()`

**Logic:**
```sql
-- Anonymize IP addresses older than retention period
UPDATE ip_tracking_log
SET ip_address = anonymize_ip(ip_address)
WHERE created_at < NOW() - INTERVAL '12 months'
AND anonymized_at IS NULL;
```

**Schedule:** Monthly cron job

**Logging:** Anonymization logged in audit tables

---

## 5. Legal Retention Requirements

### 5.1 Healthcare Records

**Requirement:** Healthcare-related records must be retained per UK healthcare regulations

**Application:**
- Location data may be part of healthcare records if linked to treatment
- Practitioners' location data may be part of clinical records
- Retention: 7-10 years for adults, longer for children

**Impact:** Location data retention extended to 7 years minimum

### 5.2 Tax and Accounting

**Requirement:** Financial records must be retained for 7 years (HMRC)

**Application:**
- Location data linked to transactions (bookings, payments)
- Retention: 7 years

**Impact:** Location data retention extended to 7 years minimum

### 5.3 Limitation Act

**Requirement:** Records may be needed for legal claims (6 years limitation period)

**Application:**
- Location data may be relevant to legal disputes
- Retention: 6-7 years

**Impact:** Location data retention extended to 7 years minimum

---

## 6. Deletion Methods

### 6.1 Secure Deletion

**Database Deletion:**
- Hard delete from database tables
- No soft delete for location/IP data (privacy requirement)
- Backup retention: 30 days (then overwritten)

**Anonymization:**
- IP addresses: Last octet/bits set to 0
- Location data: Not anonymized (deleted instead)

### 6.2 Backup Retention

**Backup Policy:**
- Daily backups retained for 30 days
- Weekly backups retained for 12 weeks
- Monthly backups retained for 12 months

**Impact:**
- Deleted data may exist in backups for up to 30 days
- After 30 days, backups overwritten
- No long-term backup retention of deleted data

---

## 7. User-Requested Deletion

### 7.1 Account Deletion

**Process:**
- User requests account deletion
- All location data deleted immediately
- IP addresses anonymized (if in security logs)
- Deletion logged in `data_destruction_log`

**Timeline:**
- Immediate deletion from active database
- Backup retention: 30 days maximum

### 7.2 Location Data Deletion (Without Account Deletion)

**Process:**
- User withdraws location consent
- Location data deleted immediately
- User can continue using platform with manual address entry
- Deletion logged

**Timeline:**
- Immediate deletion
- Backup retention: 30 days maximum

---

## 8. Exceptions to Retention Limits

### 8.1 Legal Holds

**Scenario:** Legal proceedings require data retention

**Process:**
- Data subject to legal hold marked in database
- Retention limits suspended for held data
- Data retained until legal hold released
- Documented in legal hold register

### 8.2 Active Investigations

**Scenario:** Security incident investigation requires data retention

**Process:**
- Data relevant to investigation marked
- Retention limits suspended
- Data retained until investigation complete
- Maximum extension: 12 months

---

## 9. Monitoring and Compliance

### 9.1 Retention Monitoring

**Metrics:**
- Data older than retention period identified monthly
- Deletion/anonymization success rate tracked
- Exceptions documented

**Reporting:**
- Monthly retention compliance report
- Annual review of retention periods
- Updates to retention schedule as needed

### 9.2 Compliance Verification

**Checks:**
- Automated deletion functions tested quarterly
- Retention periods reviewed annually
- Legal requirements checked for changes
- Privacy policy updated if retention changes

---

## 10. Review and Updates

**Last Updated:** February 2025  
**Next Review:** February 2026 (or on legal requirement changes)  
**Review Frequency:** Annual or on legal requirement changes

**Change Log:**
- 2025-02-XX: Initial retention schedule created

---

**Document Owner:** Data Protection Officer  
**Approved By:** TBD  
**Date:** TBD
