# Patch Management Policy
## Cyber Essentials Plus 2026 Compliance

**Date:** February 2025  
**Version:** 1.0  
**Status:** Approved  
**Review Frequency:** Quarterly  
**Next Review:** May 2025

---

## 📋 **POLICY OVERVIEW**

This policy defines the process for identifying, evaluating, testing, and applying security patches and updates to Theramate's infrastructure, applications, and dependencies to maintain Cyber Essentials Plus compliance.

**Scope:**
- Frontend dependencies (npm packages)
- Backend dependencies (Edge Functions)
- Infrastructure components (Supabase, Vercel)
- External service integrations (Stripe, Resend)
- Operating systems and runtime environments

**Responsibility:**
- **Security Team:** Vulnerability assessment and patch prioritization
- **Development Team:** Patch testing and deployment
- **DevOps Team:** Infrastructure updates
- **CTO:** Policy approval and oversight

---

## 🎯 **PATCH CLASSIFICATION**

### **Critical Vulnerabilities**
- **Definition:** Remote code execution, authentication bypass, data breach risk
- **SLA:** Patch within **7 days**
- **Process:** Emergency patch process
- **Approval:** CTO or Security Lead

**Examples:**
- Remote code execution vulnerabilities
- Authentication bypass flaws
- SQL injection vulnerabilities
- Cross-site scripting (XSS) with data exfiltration

---

### **High Vulnerabilities**
- **Definition:** Significant security impact, potential data exposure
- **SLA:** Patch within **30 days**
- **Process:** Standard patch process
- **Approval:** Security Team Lead

**Examples:**
- Privilege escalation vulnerabilities
- Information disclosure flaws
- Denial of service vulnerabilities
- Cross-site request forgery (CSRF)

---

### **Medium Vulnerabilities**
- **Definition:** Moderate security impact, limited attack surface
- **SLA:** Patch within **90 days**
- **Process:** Standard patch process
- **Approval:** Development Team Lead

**Examples:**
- Local privilege escalation
- Information leakage
- Weak cryptography
- Insecure defaults

---

### **Low Vulnerabilities**
- **Definition:** Minimal security impact, theoretical risk
- **SLA:** Patch in next release cycle
- **Process:** Standard patch process
- **Approval:** Development Team Lead

**Examples:**
- Best practice violations
- Informational findings
- Deprecated features
- Code quality issues

---

## 🔄 **PATCH MANAGEMENT PROCESS**

### **Step 1: Vulnerability Identification**

**Sources:**
- Automated dependency scanning (Dependabot, npm audit)
- Security advisories (GitHub Security, npm security)
- Vendor notifications (Supabase, Vercel, Stripe)
- Penetration testing results
- Bug bounty reports

**Frequency:**
- **Automated:** Daily (via Dependabot)
- **Manual Review:** Weekly
- **Advisory Monitoring:** Continuous

**Tools:**
- GitHub Dependabot
- npm audit
- Trivy vulnerability scanner
- GitHub Security Advisories

---

### **Step 2: Vulnerability Assessment**

**Assessment Criteria:**
1. **CVSS Score:** Use Common Vulnerability Scoring System
2. **Exploitability:** Is exploit code available?
3. **Impact:** What data/systems are at risk?
4. **Affected Components:** Which parts of the system are vulnerable?
5. **Workarounds:** Are temporary mitigations available?

**Documentation:**
- Vulnerability ID (CVE, GHSA, etc.)
- Affected package/component
- CVSS score and vector
- Exploitability assessment
- Business impact assessment
- Recommended action

---

### **Step 3: Patch Prioritization**

**Priority Matrix:**

| Severity | Exploit Available | Business Impact | Priority | SLA |
|----------|-------------------|-----------------|----------|-----|
| Critical | Yes | High | P0 | 24 hours |
| Critical | No | High | P1 | 7 days |
| High | Yes | High | P1 | 7 days |
| High | No | Medium | P2 | 30 days |
| Medium | Yes | Medium | P2 | 30 days |
| Medium | No | Low | P3 | 90 days |
| Low | Any | Any | P4 | Next release |

---

### **Step 4: Patch Testing**

**Testing Requirements:**

1. **Unit Tests:**
   - All existing tests must pass
   - New tests for patched functionality
   - Coverage maintained or improved

2. **Integration Tests:**
   - API endpoints tested
   - Database operations verified
   - External service integrations validated

3. **Security Tests:**
   - Vulnerability verification (patch works)
   - Regression testing (no new vulnerabilities)
   - Penetration testing (for critical patches)

4. **Performance Tests:**
   - No performance degradation
   - Load testing (if applicable)
   - Resource usage monitoring

**Testing Environment:**
- Staging environment (mirrors production)
- Test database (isolated from production)
- Test external service accounts

**Approval:**
- Development Team Lead: Technical approval
- Security Team: Security approval
- QA Team: Quality approval

---

### **Step 5: Patch Deployment**

**Deployment Process:**

1. **Pre-Deployment:**
   - [ ] All tests passing
   - [ ] Security approval obtained
   - [ ] Rollback plan prepared
   - [ ] Deployment window scheduled
   - [ ] Stakeholders notified

2. **Deployment:**
   - [ ] Deploy to staging
   - [ ] Verify functionality
   - [ ] Deploy to production
   - [ ] Monitor for issues
   - [ ] Verify patch applied

3. **Post-Deployment:**
   - [ ] Monitor error rates
   - [ ] Check performance metrics
   - [ ] Verify security fix
   - [ ] Update documentation
   - [ ] Close vulnerability ticket

**Deployment Windows:**
- **Critical Patches:** Anytime (with approval)
- **High Patches:** Business hours (9 AM - 5 PM UTC)
- **Medium/Low Patches:** Scheduled maintenance windows

**Rollback Plan:**
- Automated rollback capability
- Database migration rollback scripts
- Configuration rollback procedures
- Communication plan for rollback

---

### **Step 6: Verification and Monitoring**

**Verification:**
- Vulnerability scanner confirms fix
- Security testing validates patch
- Monitoring shows no issues
- User acceptance testing (if applicable)

**Monitoring Period:**
- **Critical Patches:** 48 hours
- **High Patches:** 24 hours
- **Medium/Low Patches:** 12 hours

**Metrics:**
- Error rates
- Performance metrics
- Security event logs
- User complaints/issues

---

## 📊 **AUTOMATED PATCH MANAGEMENT**

### **Dependabot Configuration**

**Location:** `.github/dependabot.yml`

**Features:**
- Weekly dependency updates
- Security updates immediately
- Grouped updates for efficiency
- Automatic PR creation
- Review requirements

**Update Types:**
- **Security:** Always allowed, immediate
- **Minor/Patch:** Weekly schedule
- **Major:** Manual review required

---

### **CI/CD Integration**

**Security Scanning:**
- `npm audit` in CI pipeline
- Trivy vulnerability scanner
- Secret scanning (Gitleaks)
- SBOM generation

**Failure Conditions:**
- Critical vulnerabilities block deployment
- High vulnerabilities require approval
- Medium/Low vulnerabilities logged

---

## 📋 **PATCH MANAGEMENT RECORDS**

### **Required Documentation:**

1. **Vulnerability Register:**
   - Vulnerability ID
   - Discovery date
   - Assessment date
   - Patch date
   - Verification date
   - Status (open, patched, verified)

2. **Patch Log:**
   - Patch ID
   - Component/package
   - Version before/after
   - Deployment date
   - Testing results
   - Rollback (if applicable)

3. **Change Management:**
   - Change request ID
   - Approval records
   - Deployment records
   - Post-deployment review

---

## 🔍 **EXCEPTIONS AND WAIVERS**

### **When Patches May Be Deferred:**

1. **No Patch Available:**
   - Vendor has not released patch
   - Workaround implemented
   - Risk accepted with documentation

2. **Breaking Changes:**
   - Patch breaks critical functionality
   - Migration path not available
   - Alternative mitigation implemented

3. **End-of-Life Components:**
   - Component no longer supported
   - Migration plan in place
   - Risk documented and accepted

**Waiver Process:**
- Document risk assessment
- Obtain CTO approval
- Set review date
- Implement compensating controls
- Plan migration/replacement

---

## 📈 **METRICS AND REPORTING**

### **Key Metrics:**

1. **Patch Compliance Rate:**
   - Patches applied within SLA / Total patches required
   - Target: >95%

2. **Mean Time to Patch (MTTP):**
   - Average time from discovery to deployment
   - Target: <7 days for critical, <30 days for high

3. **Vulnerability Backlog:**
   - Number of unpatched vulnerabilities
   - Target: <5 critical, <10 high

4. **Patch Success Rate:**
   - Successful deployments / Total deployments
   - Target: >98%

### **Monthly Reports:**

- Vulnerability summary
- Patch compliance status
- Outstanding vulnerabilities
- Patch deployment metrics
- Risk assessment updates

---

## 🎯 **RESPONSIBILITIES**

### **Security Team:**
- Monitor vulnerability sources
- Assess vulnerability severity
- Prioritize patches
- Verify patch effectiveness
- Maintain vulnerability register

### **Development Team:**
- Test patches
- Develop patch code
- Deploy patches
- Document changes
- Maintain patch log

### **DevOps Team:**
- Infrastructure updates
- Deployment automation
- Monitoring and alerting
- Rollback procedures
- Performance monitoring

### **CTO:**
- Policy approval
- Exception approvals
- Risk acceptance
- Resource allocation
- Strategic oversight

---

## 📚 **REFERENCES**

**Official Sources:**
- **NCSC:** Cyber Essentials Plus guidance
- **CVE Database:** https://cve.mitre.org/
- **GitHub Security:** https://github.com/advisories
- **npm Security:** https://www.npmjs.com/advisories
- **Supabase Security:** https://supabase.com/docs/guides/platform/security

**Industry Standards:**
- **ISO/IEC 27001:** Information Security Management
- **NIST Cybersecurity Framework:** Patch Management
- **OWASP:** Dependency Management

---

## ✅ **COMPLIANCE REQUIREMENTS**

**Cyber Essentials Plus:**
- ✅ Regular dependency audits
- ✅ Security patches applied promptly
- ✅ Automated dependency updates
- ✅ Change management process
- ✅ Patch documentation

**UK GDPR:**
- ✅ Security of processing (Article 32)
- ✅ Data breach notification (Article 33)
- ✅ Accountability principle (Article 5(2))

---

**Last Updated:** February 2025  
**Next Review:** May 2025  
**Policy Owner:** CTO  
**Approved By:** [To be completed]
