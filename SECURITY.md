# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

## Credential hygiene

- Never commit `SUPABASE_SERVICE_ROLE_KEY`, Stripe `sk_*`, or webhook `whsec_*`.
- If a service role key was ever committed to git, **rotate it immediately** in [Supabase Dashboard → API](https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/api) and update CI secrets. See `SECURITY_ROTATION_NOTE.md`.
- PRs are scanned with Gitleaks (`.gitleaks.toml`).

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. **DO NOT** create a public GitHub issue

Security vulnerabilities should be reported privately to protect users until a fix is available.

### 2. Report via Email

Send an email to: **security@peercareconnect.com** (or your security contact email)

Include the following information:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### 3. Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity (see below)

### 4. Severity Levels

#### Critical

- Remote code execution
- SQL injection
- Authentication bypass
- Data breach risk

**Response:** Immediate investigation, fix within 24-48 hours

#### High

- Privilege escalation
- Sensitive data exposure
- CSRF with significant impact

**Response:** Investigation within 7 days, fix within 2 weeks

#### Medium

- Information disclosure
- Denial of service
- XSS vulnerabilities

**Response:** Investigation within 14 days, fix within 1 month

#### Low

- Minor information disclosure
- Best practice violations

**Response:** Investigation within 30 days, fix in next release

## Security Best Practices

### For Contributors

1. **Never commit secrets**
   - API keys
   - Passwords
   - Private keys
   - Database credentials

2. **Use environment variables**
   - Store secrets in `.env` files (gitignored)
   - Use `.env.example` for documentation

3. **Review dependencies**
   - Keep dependencies updated
   - Review security advisories
   - Use `npm audit` regularly

4. **Follow secure coding practices**
   - Input validation
   - Output encoding
   - Principle of least privilege
   - Secure authentication

### Security Checklist for PRs

- [ ] No secrets or credentials in code
- [ ] Input validation implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection where needed
- [ ] Authentication/authorization checks
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are up to date

## Known Security Measures

### Authentication & Authorization

- Supabase Auth with secure session management
- Row Level Security (RLS) policies
- Role-based access control (RBAC)

### Data Protection

- Encrypted connections (HTTPS/TLS)
- Secure password hashing
- Environment variable protection
- No secrets in client-side code

### Payment Security

- Stripe integration (PCI compliant)
- No card data stored locally
- Secure webhook validation

### API Security

- Rate limiting on endpoints
- Input validation and sanitization
- CORS configuration
- Secure headers

## Security Updates

Security updates are released as needed. We recommend:

- Keeping dependencies updated
- Monitoring security advisories
- Following our release notes

## Disclosure Policy

When a security vulnerability is fixed:

1. We will credit the reporter (if they wish)
2. We will publish a security advisory
3. We will update the CHANGELOG
4. We will notify affected users if necessary

## Security Contact

For security concerns:

- **Email:** security@peercareconnect.com
- **GitHub Security Advisories:** Use the "Report a vulnerability" button on the repository

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Stripe Security Guide](https://stripe.com/docs/security)

---

**Last Updated:** 2025-02-09
