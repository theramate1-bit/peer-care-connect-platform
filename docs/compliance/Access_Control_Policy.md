# Access Control Policy
## Cyber Essentials Plus 2026 Compliance

**Date:** February 2025  
**Version:** 1.0  
**Status:** Approved  
**Review Frequency:** Quarterly  
**Next Review:** May 2025

---

## 📋 **POLICY OVERVIEW**

This policy defines access control requirements for Theramate's systems, applications, and data to ensure Cyber Essentials Plus compliance and protect against unauthorized access.

**Scope:**
- User authentication and authorization
- Database access controls
- API and Edge Function access
- Developer and administrative access
- Third-party service access

**Principles:**
- **Least Privilege:** Users granted minimum access necessary
- **Need-to-Know:** Access based on business need
- **Separation of Duties:** Critical functions require multiple approvals
- **Defense in Depth:** Multiple layers of access control

---

## 🔐 **AUTHENTICATION REQUIREMENTS**

### **User Authentication**

**Requirements:**
- ✅ Strong password policy (12+ characters, complexity)
- ✅ Multi-factor authentication (MFA) available but optional
- ✅ Account lockout after failed attempts (5 attempts)
- ✅ Session management (1 hour timeout)
- ✅ Email verification for new accounts

**Password Policy:**
- **Minimum Length:** 12 characters
- **Complexity:** Uppercase, lowercase, numbers, special characters
- **History:** Cannot reuse last 5 passwords
- **Expiration:** 90 days (admin), 180 days (users)
- **Common Passwords:** Blocked (10,000 most common)

**MFA Requirements:**
- **All Accounts:** Optional (available but not required)
- **Methods:** TOTP (Time-based One-Time Password), SMS, Email (if enabled)
- **Note:** MFA is available for users who want additional security but is not mandatory

**Account Lockout:**
- **Failed Attempts:** 5 attempts
- **Lockout Duration:** 30 minutes
- **Progressive Lockout:** 1 hour after 3 lockouts, 24 hours after 5 lockouts

---

### **Developer Access**

**Requirements:**
- ✅ Individual accounts (no shared credentials)
- ✅ Strong password policy enforced
- ✅ Access reviews quarterly
- ✅ Least privilege principle
- ✅ Access logging enabled

**Access Levels:**

1. **Read-Only Developer:**
   - View code repositories
   - Read documentation
   - View logs (non-sensitive)
   - No production access

2. **Developer:**
   - Read-Only Developer permissions
   - Create/update code
   - Deploy to staging
   - Access staging databases
   - No production access

3. **Senior Developer:**
   - Developer permissions
   - Deploy to production (with approval)
   - Access production logs
   - Database read access (production)
   - No database write access

4. **Lead Developer:**
   - Senior Developer permissions
   - Database write access (with approval)
   - Configuration changes
   - Security settings
   - Full production access

**Onboarding Process:**
1. HR creates user account
2. Security team assigns access level
3. Developer completes security training
4. MFA configured
5. Access granted
6. Access documented

**Offboarding Process:**
1. HR notifies security team
2. Access revoked immediately
3. Credentials disabled
4. Access logs reviewed
5. Documentation updated

---

### **Administrative Access**

**Requirements:**
- ✅ Strong password policy enforced
- ✅ Justification required
- ✅ Time-limited access
- ✅ Approval required
- ✅ Activity logging

**Admin Access Types:**

1. **Database Admin:**
   - Database read/write access
   - Schema changes
   - User management
   - Backup/restore

2. **Infrastructure Admin:**
   - Supabase project settings
   - Vercel deployment settings
   - Environment variables
   - Service configuration

3. **Security Admin:**
   - Authentication settings
   - Access control policies
   - Security monitoring
   - Incident response

**Approval Process:**
1. Request submitted with justification
2. Manager approval
3. Security team review
4. CTO approval (for high-level access)
5. Access granted
6. Access reviewed monthly

---

## 🔒 **AUTHORIZATION REQUIREMENTS**

### **Database Access Control**

**Row Level Security (RLS):**
- ✅ Enabled on all tables with user data
- ✅ Policies reviewed quarterly
- ✅ Policies tested regularly
- ✅ Audit logs maintained

**Access Levels:**

1. **Public (Anon Key):**
   - Limited read access
   - No write access
   - No sensitive data
   - Rate limited

2. **Authenticated Users:**
   - Own data access
   - Related data access (bookings, messages)
   - No admin data access
   - RLS enforced

3. **Service Role:**
   - Full database access
   - Used by Edge Functions only
   - Never exposed to client
   - Audit logged

**RLS Policy Requirements:**
- Users can only access their own data
- Practitioners can access their practice data
- Admins can access all data (with logging)
- Guests have limited access (guest bookings only)

---

### **API Access Control**

**Edge Functions:**
- ✅ JWT verification required (except webhooks)
- ✅ Role-based authorization
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling without data leakage

**API Endpoints:**

1. **Public Endpoints:**
   - Marketplace search (read-only)
   - Public practitioner profiles
   - No authentication required
   - Rate limited

2. **Authenticated Endpoints:**
   - User profile management
   - Booking management
   - Messaging
   - JWT required
   - RLS enforced

3. **Admin Endpoints:**
   - User management
   - System configuration
   - Analytics
   - Admin role required
   - Audit logged

---

### **Storage Access Control**

**Supabase Storage:**
- ✅ Bucket policies configured
- ✅ No public buckets (except public assets)
- ✅ Signed URLs for private content
- ✅ Access logging enabled

**Bucket Policies:**

1. **Public Buckets:**
   - Public assets only (images, documents)
   - No sensitive data
   - Read-only for public
   - Write requires authentication

2. **Private Buckets:**
   - User uploads
   - Sensitive documents
   - Signed URLs required
   - Owner-only access

---

## 📋 **ACCESS REVIEW PROCESS**

### **Quarterly Access Reviews**

**Review Scope:**
- All user accounts
- All developer accounts
- All admin accounts
- All API keys
- All service accounts

**Review Process:**
1. Generate access report
2. Review with managers
3. Identify unused access
4. Revoke unnecessary access
5. Document review results
6. Update access matrix

**Review Criteria:**
- Is access still needed?
- Is access level appropriate?
- Has user changed roles?
- Is access being used?
- Are there security concerns?

**Review Documentation:**
- Access review date
- Reviewer name
- Accounts reviewed
- Access changes made
- Justification for changes
- Next review date

---

### **Access Matrix**

**User Roles and Access:**

| Role | Database Read | Database Write | API Access | Admin Access | MFA Status |
|------|--------------|---------------|------------|--------------|------------|
| **Client** | Own data | Own data | Limited | No | Optional |
| **Practitioner** | Practice data | Practice data | Full | No | Optional |
| **Admin** | All data | All data | Full | Yes | Optional |
| **Developer** | Staging only | Staging only | Staging | No | Optional |
| **Service Role** | All data | All data | Full | Yes | N/A |

---

## 🚨 **ACCESS CONTROL MONITORING**

### **Access Logging**

**Logged Events:**
- Authentication attempts (success/failure)
- Authorization failures
- Privilege escalations
- Admin actions
- Database access (sensitive tables)
- API access (admin endpoints)
- Configuration changes

**Log Retention:**
- **Authentication Logs:** 90 days
- **Authorization Logs:** 90 days
- **Admin Action Logs:** 365 days
- **Security Event Logs:** 365 days
- **Audit Logs:** 7 years (compliance)

**Log Review:**
- **Daily:** Automated alert review
- **Weekly:** Access pattern analysis
- **Monthly:** Comprehensive log review
- **Quarterly:** Access review process

---

### **Security Monitoring**

**Alerts:**
- Failed authentication attempts (>5 in 5 minutes)
- Unauthorized access attempts
- Privilege escalation attempts
- Unusual access patterns
- Admin actions outside business hours
- Multiple failed MFA attempts

**Response:**
- **Automated:** Account lockout
- **Manual:** Security team investigation
- **Escalation:** CTO notification for critical events

---

## 🔄 **ACCESS CONTROL PROCEDURES**

### **Granting Access**

1. **Request Submitted:**
   - Access request form
   - Business justification
   - Manager approval
   - Security team review

2. **Access Granted:**
   - Account created/updated
   - Access level assigned
   - MFA configured
   - Access documented
   - User notified

3. **Access Verified:**
   - User confirms access
   - Access tested
   - Documentation updated
   - Access logged

---

### **Revoking Access**

1. **Access Revocation Trigger:**
   - User termination
   - Role change
   - Security incident
   - Access review finding
   - Manager request

2. **Access Revoked:**
   - Account disabled immediately
   - Credentials invalidated
   - Sessions terminated
   - Access removed
   - User notified

3. **Verification:**
   - Access confirmed revoked
   - Logs reviewed
   - Documentation updated
   - Security team notified

---

## 📊 **COMPLIANCE REQUIREMENTS**

### **Cyber Essentials Plus:**
- ✅ Strong password policy
- ✅ Access reviews conducted
- ✅ Least privilege principle
- ✅ Access logging enabled
- ✅ MFA available (optional)

### **UK GDPR:**
- ✅ Access controls (Article 32)
- ✅ Access logging (Article 5(2))
- ✅ Data breach prevention (Article 33)

---

## 📚 **REFERENCES**

**Official Sources:**
- **NCSC:** Cyber Essentials Plus guidance
- **NIST:** Access Control Guidelines
- **OWASP:** Authentication Cheat Sheet
- **Supabase:** Row Level Security documentation

---

**Last Updated:** February 2025  
**Next Review:** May 2025  
**Policy Owner:** CTO  
**Approved By:** [To be completed]
