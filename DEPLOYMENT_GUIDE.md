# 🚀 Production Deployment Guide

## Overview

This guide walks you through deploying your Peer Care Connect payment system to production, ensuring it's ready for real transactions.

## 🎯 **Pre-Deployment Checklist**

### **1. Stripe Live Mode Setup**

- [ ] **Switch to Live Mode** in Stripe Dashboard
- [ ] **Obtain Live API Keys**:
  - Publishable Key: `pk_live_...`
  - Secret Key: `sk_live_...`
- [ ] **Create Production Webhook**:
  - URL: `https://your-domain.vercel.app/api/stripe-webhook`
  - Events: `payment_intent.succeeded`, `account.updated`, etc.
  - Copy webhook secret: `whsec_...`

### **2. Environment Configuration**

- [ ] **Copy environment template**:
  ```bash
  cp env.production.example .env.production
  ```
- [ ] **Fill in live values** (see `env.production.example`):

  ```bash
  # Vercel / web — publishable key only (pk_*)
  VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
  VITE_STRIPE_CONNECT_CLIENT_ID=ca_your_connect_client_id

  # Supabase Dashboard → Edge Functions → Secrets (sk_* / whsec_* — never VITE_*)
  STRIPE_SECRET_KEY=sk_live_your_key
  STRIPE_WEBHOOK_SECRET=whsec_your_secret
  ```

### **3. Database Verification**

- [ ] **Confirm migrations applied** to production Supabase
- [ ] **Verify RLS policies** are active
- [ ] **Test database connections** from production

## 🚀 **Deployment Steps**

### **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

### **Step 2: Login to Vercel**

```bash
vercel login
```

### **Step 3: Deploy to Production**

```bash
# Build the application
npm run build

# Deploy to production
vercel --prod --confirm
```

### **Step 4: Configure Environment Variables**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings > Environment Variables
4. Add all variables from `.env.production`

### **Step 5: Deploy Edge Functions**

```bash
# Deploy Supabase Edge Functions
cd supabase/functions
supabase functions deploy stripe-payment --project-ref your-project-ref
supabase functions deploy stripe-webhook --project-ref your-project-ref
```

## 🔒 **Security Configuration**

### **1. HTTPS & SSL**

- ✅ **Automatic** with Vercel
- ✅ **SSL Certificate** automatically provisioned
- ✅ **Security Headers** configured in `vercel.json`

### **2. Environment Variables**

- ✅ **Never commit** `.env.production` to git
- ✅ **Use Vercel** environment variables
- ✅ **Rotate keys** regularly

### **3. Webhook Security**

- ✅ **Validate signatures** in webhook handler
- ✅ **Use webhook secret** from Stripe
- ✅ **Monitor webhook delivery**

## 🧪 **Post-Deployment Testing**

### **1. Payment Flow Testing**

```bash
# Test with small amounts (£1-£5)
# Verify fee calculations (3%)
# Test Connect account creation
# Verify webhook delivery
```

### **2. Error Handling**

```bash
# Test declined cards
# Test insufficient funds
# Test expired cards
# Verify error messages
```

### **3. Monitoring**

- [ ] **Stripe Dashboard**: Monitor live transactions
- [ ] **Vercel Analytics**: Track performance
- [ ] **Supabase Logs**: Monitor Edge Functions
- [ ] **Error Tracking**: Set up Sentry/LogRocket

## 📊 **Production Monitoring**

### **1. Key Metrics to Track**

- Payment success rate
- Average transaction value
- Connect account creation rate
- Webhook delivery success rate
- API response times

### **2. Alerting Setup**

- Payment failures
- Webhook delivery failures
- High error rates
- Performance degradation

### **3. Log Management**

- Centralized logging
- Log retention policies
- Search and filtering
- Automated analysis

## 🚨 **Emergency Procedures**

### **1. Rollback Plan**

```bash
# Rollback to previous deployment
vercel rollback

# Disable payments temporarily
# Update environment variables
```

### **2. Incident Response**

1. **Assess impact** of the issue
2. **Implement temporary fix** if possible
3. **Communicate** with stakeholders
4. **Investigate root cause**
5. **Implement permanent fix**
6. **Document lessons learned**

### **3. Support Contacts**

- **Stripe Support**: https://support.stripe.com
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support

## 🔄 **Ongoing Maintenance**

### **1. Regular Updates**

- [ ] **Weekly**: Review payment metrics
- [ ] **Monthly**: Security assessment
- [ ] **Quarterly**: Compliance review
- [ ] **Annually**: Penetration testing

### **2. Dependency Updates**

```bash
# Update dependencies
npm update

# Security audit
npm audit

# Update Edge Functions
supabase functions deploy --project-ref your-project-ref
```

### **3. Performance Optimization**

- Monitor Core Web Vitals
- Optimize bundle size
- Implement caching strategies
- Monitor database performance

## 📋 **Deployment Commands Reference**

### **Build & Deploy**

```bash
# Development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Deploy Edge Functions
supabase functions deploy --project-ref your-project-ref
```

### **Environment Management**

```bash
# Set environment variable
vercel env add VITE_STRIPE_PUBLISHABLE_KEY

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VITE_STRIPE_PUBLISHABLE_KEY
```

### **Monitoring & Debugging**

```bash
# View deployment logs
vercel logs

# View function logs
supabase functions logs --project-ref your-project-ref

# Check deployment status
vercel ls
```

## 🎉 **Go-Live Checklist**

### **Final Verification**

- [ ] All tests pass in production
- [ ] Payment forms work with live Stripe
- [ ] Webhooks are receiving events
- [ ] Connect accounts can be created
- [ ] Marketplace fees calculated correctly
- [ ] Error handling works properly
- [ ] Monitoring is active
- [ ] Support team is trained

### **Launch Sequence**

1. **Deploy** to production
2. **Verify** all systems operational
3. **Test** with small live transactions
4. **Monitor** closely for first 24 hours
5. **Scale** gradually based on usage
6. **Optimize** based on real-world data

---

## 📞 **Support & Resources**

- **Stripe Documentation**: https://stripe.com/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Production Checklist**: `PRODUCTION_CHECKLIST.md`
- **Test Scripts**: `test-scripts/` directory

---

**Remember**: Production deployment involves real money and real customers. Take your time, test thoroughly, and ensure everything is working correctly before going live.

**Good luck with your launch! 🚀**
