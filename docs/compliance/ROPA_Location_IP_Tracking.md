# Records of Processing Activities (ROPA)
## Location & IP Tracking

**Date:** February 2025  
**Version:** 1.0  
**Reference:** UK GDPR Article 30, DPA 2018

---

## 1. Controller Information

**Name:** Theramate Limited  
**Address:** [Registered Address - To be provided]  
**Contact:** privacy@theramate.co.uk  
**ICO Registration:** [Registration Number - To be provided]

---

## 2. Processing Activities

### 2.1 Location Data Processing

**Processing Activity:** Location-based marketplace matching

**Categories of Data Subjects:**
- Practitioners (healthcare professionals)
- Clients (service recipients)
- Guest users (unregistered users making bookings)

**Categories of Personal Data:**
- Precise GPS coordinates (latitude, longitude)
- Street addresses
- City, state, postal code, country
- Service radius preferences
- PostGIS geometry points

**Special Categories of Personal Data:** None (location data is not special category under UK GDPR, but is PECR-regulated)

**Purposes of Processing:**
- Enable clients to find nearby practitioners
- Enable practitioners to set service areas
- Calculate distances between users
- Display location-based search results
- Support mobile therapist service area matching

**Lawful Basis:**
- **UK GDPR Article 6(1)(a):** Consent (explicit opt-in required)
- **PECR:** Network-derived location data requires consent for value-added service

**Retention Period:**
- Until account deletion
- Or 7 years after last activity (legal compliance)
- Automated deletion after retention period

**Recipients/Categories of Recipients:**
- **Internal:** Platform users (practitioners can see client locations for bookings, clients can see practitioner locations)
- **Third-Party Processors:**
  - Supabase (database hosting) - DPA in place
  - Google Maps API (geocoding) - DPA in place
  - Nominatim/OpenStreetMap (address geocoding) - open source

**Transfers to Third Countries:**
- Supabase: EU/UK data centers (no transfer)
- Google Maps: May process in US (EU-US Data Privacy Framework)
- Standard Contractual Clauses in place where applicable

**Security Measures:**
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Role-based access controls (RLS policies)
- Audit logging
- Pseudonymization for analytics

**Data Sources:**
- User-provided addresses (manual entry)
- Browser geolocation API (with consent)
- Geocoding services (address → coordinates)

---

### 2.2 IP Address Processing

**Processing Activity:** IP address collection and logging

**Categories of Data Subjects:**
- All website visitors
- Registered users
- Guest users

**Categories of Personal Data:**
- IPv4/IPv6 addresses
- General location inference (country, city level)
- Timestamp of collection
- Associated user session/account (when logged in)

**Special Categories of Personal Data:** None

**Purposes of Processing:**
- Security and fraud prevention
- Analytics and service improvement (with consent)
- Error logging and debugging
- Content personalization (general location)

**Lawful Basis:**
- **UK GDPR Article 6(1)(f):** Legitimate interests (security, fraud prevention)
- **UK GDPR Article 6(1)(a):** Consent (for analytics via cookie consent)
- **PECR:** Cookie consent for analytics tracking

**Retention Period:**
- **Security logs:** 12 months
- **Analytics:** 26 months (then anonymized)
- **Error logs:** 3 months

**Recipients/Categories of Recipients:**
- **Internal:** Security team, development team
- **Third-Party Processors:**
  - Supabase (server logs) - DPA in place
  - Google Tag Manager (analytics) - DPA in place, cookie consent required
  - Vercel (CDN/hosting) - DPA in place

**Transfers to Third Countries:**
- Google Tag Manager: US (EU-US Data Privacy Framework)
- Vercel: EU/UK data centers (no transfer)
- Standard Contractual Clauses in place where applicable

**Security Measures:**
- Secure storage (Supabase)
- Access controls on IP logs
- Anonymization after retention period
- IP addresses not linked to user accounts in analytics (when consent denied)

**Data Sources:**
- Automatic collection (HTTP request headers)
- Server logs
- Analytics services (with consent)

---

## 3. Data Flows

### 3.1 Location Data Flow

```
1. User provides address OR grants geolocation consent
   ↓
2. Frontend captures location (manual entry or browser API)
   ↓
3. Geocoding service converts address to coordinates (if needed)
   ↓
4. Location data stored in Supabase (user_locations table)
   ↓
5. PostGIS queries match users based on proximity
   ↓
6. Marketplace displays results with distance calculations
   ↓
7. Location data retained until account deletion or 7 years
   ↓
8. Automated deletion after retention period
```

### 3.2 IP Address Flow

```
1. User visits website
   ↓
2. Server logs IP address automatically
   ↓
3. IP address stored in server logs (Supabase)
   ↓
4. If analytics consent granted: IP sent to Google Tag Manager
   ↓
5. IP address used for security/fraud detection
   ↓
6. IP address retained for 12 months (security) or 26 months (analytics)
   ↓
7. IP address anonymized after retention period
```

---

## 4. Data Categories

### 4.1 Location Data Categories

| Category | Examples | Sensitivity | Retention |
|----------|----------|-------------|-----------|
| Precise coordinates | Latitude: 51.5074, Longitude: -0.1278 | High | 7 years or account deletion |
| Addresses | "123 Test Street, London" | Medium | 7 years or account deletion |
| Service radius | 25 km | Low | 7 years or account deletion |
| PostGIS points | Geometry(POINT, 4326) | High | 7 years or account deletion |

### 4.2 IP Address Categories

| Category | Examples | Sensitivity | Retention |
|----------|----------|-------------|-----------|
| IPv4 addresses | 192.168.1.1 | Low-Medium | 12-26 months |
| IPv6 addresses | 2001:0db8::1 | Low-Medium | 12-26 months |
| General location | Country: UK, City: London | Low | 12-26 months |

---

## 5. Processing Operations

### 5.1 Location Data Operations

**Collection:**
- User provides address manually
- User grants geolocation consent → browser API
- Geocoding service converts address to coordinates

**Storage:**
- Supabase `user_locations` table
- Encrypted at rest (AES-256)
- PostGIS geometry points for spatial queries

**Use:**
- Marketplace proximity searches
- Distance calculations
- Service area matching
- Display in user profiles (with privacy controls)

**Disclosure:**
- To other users (practitioner locations visible to clients, client locations visible to practitioners for bookings)
- To third-party geocoding services (addresses only, not coordinates)

**Deletion:**
- On account deletion
- After 7 years of inactivity
- Automated deletion function

### 5.2 IP Address Operations

**Collection:**
- Automatic (HTTP request headers)
- Server logs
- Analytics services (with consent)

**Storage:**
- Supabase server logs
- Analytics databases (Google Tag Manager)

**Use:**
- Security monitoring
- Fraud detection
- Analytics (with consent)
- Error debugging

**Disclosure:**
- To analytics providers (with consent)
- To security monitoring services

**Deletion/Anonymization:**
- After 12 months (security logs)
- After 26 months (analytics)
- Automated anonymization

---

## 6. Technical and Organizational Measures

### 6.1 Technical Measures

**Encryption:**
- Data at rest: AES-256 (Supabase)
- Data in transit: TLS 1.3
- Database connections: Encrypted

**Access Controls:**
- Role-based access control (RLS policies)
- Principle of least privilege
- Strong password policy and account lockout protection
- Audit logging of all access

**Data Minimization:**
- Only collect minimum necessary location data
- IP addresses anonymized after retention
- Pseudonymization for analytics

**Backup and Recovery:**
- Automated backups (Supabase)
- Encrypted backups
- Disaster recovery procedures

### 6.2 Organizational Measures

**Staff Training:**
- UK GDPR and DPA 2018 training
- Location data handling procedures
- Incident response training

**Policies and Procedures:**
- Data protection policy
- Privacy policy
- Incident response procedures
- Access control procedures

**Monitoring and Auditing:**
- Quarterly access log reviews
- Annual security audits
- Regular compliance reviews

---

## 7. Third-Party Processors

### 7.1 Location Data Processors

| Processor | Service | Location | DPA Status | Transfer Mechanism |
|-----------|---------|----------|------------|-------------------|
| Supabase | Database hosting | EU/UK | ✅ In place | N/A (EU data centers) |
| Google Maps API | Geocoding | US | ✅ In place | EU-US Data Privacy Framework |
| Nominatim | Address geocoding | EU | N/A (open source) | N/A |

### 7.2 IP Address Processors

| Processor | Service | Location | DPA Status | Transfer Mechanism |
|-----------|---------|----------|------------|-------------------|
| Supabase | Server logs | EU/UK | ✅ In place | N/A (EU data centers) |
| Google Tag Manager | Analytics | US | ✅ In place | EU-US Data Privacy Framework |
| Vercel | CDN/Hosting | EU/UK | ✅ In place | N/A (EU data centers) |

---

## 8. Data Subject Rights

### 8.1 Location Data Rights

**Right of Access (Article 15):**
- Users can access their location data via account settings
- DSAR process includes location data export

**Right to Rectification (Article 16):**
- Users can update location data at any time
- Location data editable in profile settings

**Right to Erasure (Article 17):**
- Users can delete location data
- Account deletion removes all location data
- Subject to legal retention requirements (7 years)

**Right to Restrict Processing (Article 18):**
- Users can withdraw location consent
- Location tracking stops immediately on withdrawal

**Right to Data Portability (Article 20):**
- Location data exportable in machine-readable format
- DSAR process includes location data export

**Right to Object (Article 21):**
- Users can object to location tracking
- Withdrawal mechanism available

### 8.2 IP Address Rights

**Right of Access (Article 15):**
- IP addresses included in DSAR responses
- Accessible via privacy tools

**Right to Erasure (Article 17):**
- IP addresses anonymized after retention period
- Can be deleted on request (subject to security requirements)

**Right to Object (Article 21):**
- Users can object to IP tracking for analytics
- Cookie consent allows opt-out

---

## 9. Records Retention

### 9.1 Location Data Retention

| Data Type | Retention Period | Legal Basis | Deletion Method |
|-----------|-----------------|-------------|-----------------|
| Active user locations | Until account deletion | User control | Manual or automated |
| Inactive user locations | 7 years after last activity | Legal compliance | Automated deletion |
| Location access logs | 3 years | Security/audit | Automated deletion |

### 9.2 IP Address Retention

| Data Type | Retention Period | Legal Basis | Deletion Method |
|-----------|-----------------|-------------|-----------------|
| Security logs | 12 months | Security | Automated anonymization |
| Analytics data | 26 months | Analytics | Automated anonymization |
| Error logs | 3 months | Debugging | Automated deletion |

---

## 10. Updates and Review

**Last Updated:** February 2025  
**Next Review:** February 2026 (or on significant change)  
**Review Frequency:** Annual or on change to processing activities

**Change Log:**
- 2025-02-XX: Initial ROPA created for location and IP tracking

---

**Document Owner:** Data Protection Officer  
**Approved By:** TBD  
**Date:** TBD
