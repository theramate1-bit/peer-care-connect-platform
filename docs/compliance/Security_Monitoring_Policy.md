# Security Monitoring and Alerting Policy
## Cyber Essentials Plus 2026 Compliance

**Date:** February 2025  
**Version:** 1.0  
**Status:** Approved  
**Review Frequency:** Monthly  
**Next Review:** March 2025

---

## 📋 **POLICY OVERVIEW**

This policy defines security monitoring, logging, and alerting requirements for Theramate to detect, respond to, and prevent security incidents in compliance with Cyber Essentials Plus 2026 standards.

**Scope:**
- Authentication and authorization events
- API access and usage
- Database access and queries
- Infrastructure events
- Security incidents
- Performance anomalies

**Objectives:**
- Detect security incidents early
- Enable rapid incident response
- Maintain audit trails
- Support compliance requirements
- Prevent data breaches

---

## 🔍 **MONITORING REQUIREMENTS**

### **1. Authentication Monitoring**

**Events Monitored:**
- ✅ Login attempts (success/failure)
- ✅ Logout events
- ✅ Password reset requests
- ✅ Account lockouts
- ✅ MFA enrollment/changes
- ✅ MFA challenge attempts
- ✅ Session creation/termination
- ✅ Unusual login patterns

**Alerts:**
- **Critical:** >10 failed logins in 5 minutes
- **High:** >5 failed logins in 5 minutes
- **Medium:** Account lockout
- **Low:** Successful login from new location

**Log Retention:** 90 days

---

### **2. Authorization Monitoring**

**Events Monitored:**
- ✅ Authorization failures
- ✅ Privilege escalation attempts
- ✅ Unauthorized access attempts
- ✅ RLS policy violations
- ✅ Admin action logs
- ✅ Role changes

**Alerts:**
- **Critical:** Unauthorized admin access attempt
- **High:** Multiple authorization failures
- **Medium:** Privilege escalation attempt
- **Low:** Unusual access pattern

**Log Retention:** 90 days

---

### **3. API Access Monitoring**

**Events Monitored:**
- ✅ API endpoint access
- ✅ Rate limit violations
- ✅ Unusual API patterns
- ✅ Error rates
- ✅ Response times
- ✅ Edge Function invocations

**Alerts:**
- **Critical:** API endpoint down
- **High:** Rate limit exceeded (>1000 req/min)
- **Medium:** Error rate spike (>10%)
- **Low:** Unusual API usage pattern

**Log Retention:** 30 days

---

### **4. Database Access Monitoring**

**Events Monitored:**
- ✅ Database queries (sensitive tables)
- ✅ RLS policy violations
- ✅ Unusual query patterns
- ✅ Large data exports
- ✅ Schema changes
- ✅ Backup/restore operations

**Alerts:**
- **Critical:** Unauthorized database access
- **High:** Large data export (>10,000 rows)
- **Medium:** Unusual query pattern
- **Low:** Schema change detected

**Log Retention:** 90 days (queries), 365 days (admin actions)

---

### **5. Infrastructure Monitoring**

**Events Monitored:**
- ✅ System resource usage
- ✅ Error rates
- ✅ Deployment events
- ✅ Configuration changes
- ✅ Service availability
- ✅ Performance metrics

**Alerts:**
- **Critical:** Service down
- **High:** High error rate (>5%)
- **Medium:** Resource usage spike (>80%)
- **Low:** Configuration change

**Log Retention:** 30 days

---

## 🚨 **ALERTING CONFIGURATION**

### **Alert Severity Levels**

**Critical (P0):**
- Immediate response required
- Service impact
- Security breach
- **Response Time:** <15 minutes
- **Notification:** On-call engineer + CTO

**High (P1):**
- Urgent response required
- Potential security issue
- **Response Time:** <1 hour
- **Notification:** Security team + Manager

**Medium (P2):**
- Response required
- Security concern
- **Response Time:** <4 hours
- **Notification:** Security team

**Low (P3):**
- Informational
- Review required
- **Response Time:** <24 hours
- **Notification:** Security team (daily digest)

---

### **Alert Channels**

**Primary Channels:**
- **Email:** security@theramate.co.uk
- **Slack:** #security-alerts channel
- **PagerDuty:** Critical alerts only

**Escalation:**
- **Level 1:** Security team (all alerts)
- **Level 2:** CTO (Critical/High alerts)
- **Level 3:** Board (Critical security breaches)

---

## 📊 **MONITORING TOOLS**

### **1. Supabase Monitoring**

**Dashboard:** Supabase Dashboard → Logs

**Monitored:**
- Database queries
- Authentication events
- Edge Function logs
- API requests
- Error logs

**Configuration:**
- Log retention: 7 days (default)
- Alert thresholds: Configured in dashboard
- Export: Available via API

---

### **2. Vercel Monitoring**

**Dashboard:** Vercel Dashboard → Analytics

**Monitored:**
- Deployment events
- Function invocations
- Error rates
- Performance metrics
- Edge network events

**Configuration:**
- Real-time monitoring
- Alert thresholds: Configured in dashboard
- Webhook notifications: Available

---

### **3. Application Monitoring**

**Tools:**
- **Error Tracking:** Sentry (to be configured)
- **Performance:** Vercel Analytics
- **Logging:** Structured logging in Edge Functions

**Configuration:**
- Error tracking: All errors logged
- Performance: Core Web Vitals tracked
- Logging: JSON format, correlation IDs

---

## 📋 **LOG MANAGEMENT**

### **Log Format Standards**

**Structured Logging (JSON):**
```json
{
  "timestamp": "2025-02-15T10:30:00Z",
  "level": "error",
  "service": "send-email",
  "user_id": "user_abc123",
  "event": "email_send_failed",
  "error": {
    "code": "RATE_LIMIT",
    "message": "Rate limit exceeded"
  },
  "metadata": {
    "email_type": "booking_confirmation",
    "recipient": "user@example.com"
  },
  "correlation_id": "req_xyz789"
}
```

**Required Fields:**
- `timestamp`: ISO 8601 format
- `level`: error, warn, info, debug
- `service`: Service name
- `event`: Event type
- `correlation_id`: Request correlation ID

**Optional Fields:**
- `user_id`: User identifier (if applicable)
- `ip_address`: IP address (anonymized if PII)
- `user_agent`: User agent (sanitized)
- `metadata`: Additional context

---

### **Log Retention Schedule**

| Log Type | Retention Period | Reason |
|----------|----------------|--------|
| **Authentication Logs** | 90 days | Security monitoring |
| **Authorization Logs** | 90 days | Access control audit |
| **API Access Logs** | 30 days | Performance monitoring |
| **Database Query Logs** | 7 days | Performance (Supabase default) |
| **Admin Action Logs** | 365 days | Compliance audit |
| **Security Event Logs** | 365 days | Incident investigation |
| **Audit Logs** | 7 years | UK GDPR compliance |

---

### **Log Storage**

**Primary Storage:**
- Supabase logs: Supabase managed
- Vercel logs: Vercel managed
- Application logs: Structured JSON in Edge Functions

**Backup Storage:**
- Critical logs: Exported to S3 (monthly)
- Compliance logs: Archived for 7 years

---

## 🔐 **SECURITY EVENT DETECTION**

### **Automated Detection Rules**

**1. Brute Force Attack:**
```
IF failed_login_attempts > 10 IN 5_minutes
THEN alert_critical("Potential brute force attack")
AND lock_account()
AND notify_security_team()
```

**2. Unauthorized Access:**
```
IF authorization_failure > 5 IN 10_minutes
THEN alert_high("Multiple authorization failures")
AND log_event()
AND notify_security_team()
```

**3. Data Exfiltration:**
```
IF data_export > 10000_rows IN 1_hour
THEN alert_critical("Potential data exfiltration")
AND block_export()
AND notify_cto()
```

**4. Privilege Escalation:**
```
IF role_change_detected
THEN alert_high("Privilege escalation attempt")
AND log_event()
AND require_approval()
```

**5. Unusual Access Pattern:**
```
IF access_from_new_location
AND access_outside_business_hours
THEN alert_medium("Unusual access pattern")
AND require_mfa_challenge()
```

---

## 📈 **MONITORING DASHBOARDS**

### **Security Dashboard**

**Metrics:**
- Failed login attempts (24h)
- Authorization failures (24h)
- Active security alerts
- MFA enrollment rate
- Account lockouts (24h)

**Visualizations:**
- Login attempt trends
- Authorization failure trends
- Alert severity distribution
- Geographic access map

**Update Frequency:** Real-time

---

### **Compliance Dashboard**

**Metrics:**
- RLS policy coverage
- Access review completion
- Patch compliance rate
- Security training completion
- Incident response time

**Visualizations:**
- Compliance scorecard
- Gap analysis
- Trend analysis
- Audit readiness

**Update Frequency:** Daily

---

## 🚨 **INCIDENT RESPONSE INTEGRATION**

### **Alert to Incident Workflow**

1. **Alert Triggered:**
   - Monitoring system detects event
   - Alert sent to security team
   - Alert logged in system

2. **Initial Assessment:**
   - Security team reviews alert
   - Determines severity
   - Classifies as incident (if applicable)

3. **Incident Response:**
   - Follow incident response plan
   - Document in incident log
   - Escalate if critical

4. **Resolution:**
   - Incident resolved
   - Root cause analyzed
   - Monitoring rules updated (if needed)

---

## 📋 **COMPLIANCE REQUIREMENTS**

### **Cyber Essentials Plus:**
- ✅ Security monitoring enabled
- ✅ Alerting configured
- ✅ Incident response procedures
- ✅ Log retention policies
- ✅ Access logging

### **UK GDPR:**
- ✅ Security of processing (Article 32)
- ✅ Data breach detection (Article 33)
- ✅ Audit logging (Article 5(2))

---

## 📚 **REFERENCES**

**Official Sources:**
- **NCSC:** Cyber Essentials Plus guidance
- **NIST:** Security Monitoring Guidelines
- **ISO/IEC 27001:** Information Security Management
- **Supabase:** Monitoring and Logging documentation

---

**Last Updated:** February 2025  
**Next Review:** March 2025  
**Policy Owner:** CTO  
**Approved By:** [To be completed]
