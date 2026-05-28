# 🏥 Theramate Daily Testing Checklist

## 📅 **Daily Testing Routine (5-10 minutes)**

### **🚀 Quick Start Commands**

```bash
# Run all daily tests
.\daily-test-runner-simple.ps1

# Or run individual tests
node test-scripts/daily-health-check.js
node test-scripts/daily-user-journey-test.js
```

---

## **1️⃣ Automated Health Checks** ✅

### **Database Connection**

- [ ] Supabase connection successful
- [ ] Core tables accessible (users, therapist_profiles, categories)
- [ ] No connection timeouts

### **Edge Functions**

- [ ] All Edge Functions responding
- [ ] Environment variables accessible
- [ ] No 500 errors

### **Authentication Service**

- [ ] Supabase Auth service accessible
- [ ] OAuth providers responding
- [ ] Session management working

---

## **2️⃣ User Journey Tests** ✅

### **Public Marketplace**

- [ ] Marketplace loads without authentication
- [ ] Therapist profiles display correctly
- [ ] Search and filtering work
- [ ] Categories are populated

### **Therapist Profiles**

- [ ] Individual profiles load
- [ ] All profile data displays
- [ ] Navigation between profiles works
- [ ] Call-to-action buttons functional

### **Data Integrity**

- [ ] No orphaned therapist profiles
- [ ] User data consistency
- [ ] Required fields populated
- [ ] No broken relationships

---

## **3️⃣ Manual Visual Checks** 👀

### **Homepage**

- [ ] Hero section displays correctly
- [ ] "Browse Marketplace" button visible
- [ ] Navigation menu functional
- [ ] Mascot logo displays properly

### **Public Pages**

- [ ] Marketplace page loads
- [ ] Therapist cards display
- [ ] Profile pages accessible
- [ ] Responsive design on mobile

### **Authentication Pages**

- [ ] Login page accessible
- [ ] Register page accessible
- [ ] OAuth buttons visible
- [ ] Form validation working

---

## **4️⃣ Performance Checks** ⚡

### **Load Times**

- [ ] Homepage loads in <3 seconds
- [ ] Marketplace loads in <5 seconds
- [ ] Profile pages load in <3 seconds
- [ ] No infinite loading states

### **Error Handling**

- [ ] 404 pages display correctly
- [ ] Error messages are user-friendly
- [ ] No console errors in browser
- [ ] Graceful fallbacks for missing data

---

## **5️⃣ Cross-Browser Testing** 🌐

### **Browser Compatibility**

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### **Mobile Responsiveness**

- [ ] Mobile navigation works
- [ ] Touch interactions functional
- [ ] Text readable on small screens
- [ ] Buttons appropriately sized

---

## **🚨 Critical Issues to Watch For**

### **Immediate Blockers (Fix Same Day)**

- ❌ Database connection failures
- ❌ Edge Function 500 errors
- ❌ Authentication service down
- ❌ Public marketplace inaccessible

### **High Priority (Fix Within 24 Hours)**

- ⚠️ Slow page load times (>10 seconds)
- ⚠️ Broken navigation links
- ⚠️ Missing critical data
- ⚠️ OAuth sign-up failures

### **Medium Priority (Fix Within 48 Hours)**

- 🔶 Minor UI inconsistencies
- 🔶 Non-critical feature bugs
- 🔶 Performance optimizations
- 🔶 Browser compatibility issues

---

## **📊 Daily Test Results Template**

```
Date: [DATE]
Tester: [NAME]
Environment: Development/Staging/Production

✅ PASSED TESTS:
- [List passed tests]

❌ FAILED TESTS:
- [List failed tests with error details]

⚠️ WARNINGS:
- [List any warnings or minor issues]

🔧 ACTIONS TAKEN:
- [List fixes implemented]

📈 OVERALL STATUS:
- Health Check: PASS/FAIL
- User Journey: PASS/FAIL
- Manual Checks: PASS/FAIL
- Performance: PASS/FAIL

🎯 NEXT STEPS:
- [List next actions needed]
```

---

## **🔄 Weekly Deep Testing**

### **Every Monday**

- [ ] Full user registration flow
- [ ] OAuth sign-up process
- [ ] Database backup verification
- [ ] Performance benchmarking

### **Every Friday**

- [ ] Security audit check
- [ ] Error log review
- [ ] User feedback review
- [ ] Next week planning

---

## **🚀 Pro Tips**

1. **Set up automated alerts** for critical failures
2. **Use browser dev tools** to check console errors
3. **Test on actual devices** not just browser dev tools
4. **Keep a testing journal** to track patterns
5. **Share results with the team** daily
6. **Celebrate when all tests pass** 🎉

---

## **📞 Emergency Contacts**

- **Database Issues**: Check Supabase Dashboard
- **Edge Function Issues**: Check Supabase Functions logs
- **Authentication Issues**: Check Supabase Auth settings
- **Frontend Issues**: Check browser console and network tab

---

_Remember: Daily testing prevents weekly disasters! 🛡️_
