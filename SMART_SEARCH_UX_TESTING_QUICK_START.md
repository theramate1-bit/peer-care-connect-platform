# Smart Search UX Testing - Quick Start Guide

## Get Started in 30 Minutes

This guide helps you quickly validate the Smart Search redesign with minimal setup.

---

## Prerequisites

- Access to the application (local or deployed)
- Browser (Chrome recommended)
- Note-taking tool
- 30 minutes

---

## Quick Test Scenarios (5 minutes each)

### Test 1: Acute Injury Flow ⏱️ 5 min

**Goal**: Verify acute injury flow works correctly

**Steps**:
1. Navigate to Marketplace → Smart Search tab
2. Click "I'm in pain"
3. Click "I've sustained a recent injury causing pain"
4. Answer healthcare professional question
5. Verify recommendations appear

**Check**:
- ✅ Healthcare professional question asked
- ✅ Recommendations in 3-4 messages
- ✅ Sports Therapist/Osteopath recommended
- ✅ Message explains why

**Pass/Fail**: _______

---

### Test 2: Chronic Pain Flow ⏱️ 5 min

**Goal**: Verify chronic pain flow is fast

**Steps**:
1. Navigate to Marketplace → Smart Search tab
2. Click "I'm in pain"
3. Click "I've been in pain for a period of more than 2 months"
4. Verify recommendations appear

**Check**:
- ✅ NO healthcare professional question
- ✅ Recommendations in 2-3 messages
- ✅ Appropriate practitioners recommended
- ✅ Fast flow

**Pass/Fail**: _______

---

### Test 3: Relaxation Flow ⏱️ 5 min

**Goal**: Verify relaxation fast-tracks correctly

**Steps**:
1. Navigate to Marketplace → Smart Search tab
2. Click "I want relaxation/stress relief"
3. Verify recommendations appear

**Check**:
- ✅ Recommendations in 1-2 messages
- ✅ Only Massage Therapists shown
- ✅ No unnecessary questions
- ✅ Clear relaxation message

**Pass/Fail**: _______

---

### Test 4: Urgent Detection ⏱️ 5 min

**Goal**: Verify urgent medical warning

**Steps**:
1. Navigate to Marketplace → Smart Search tab
2. Click "I'm in pain"
3. Type: "I'm losing sensation in my feet"
4. Verify urgent warning appears

**Check**:
- ✅ Urgent warning appears
- ✅ Mentions neurological issues
- ✅ Does NOT trigger for "pain 10/10"
- ✅ User can continue

**Pass/Fail**: _______

---

### Test 5: Mobile Experience ⏱️ 5 min

**Goal**: Verify mobile usability

**Steps**:
1. Open on mobile device
2. Complete one full flow (any scenario)
3. Check layout and interactions

**Check**:
- ✅ Chat fits screen
- ✅ Suggestions are tappable
- ✅ Input is accessible
- ✅ Recommendations display correctly

**Pass/Fail**: _______

---

### Test 6: Error Handling ⏱️ 5 min

**Goal**: Verify graceful error handling

**Steps**:
1. Disconnect network
2. Send message
3. Verify error message
4. Reconnect and retry

**Check**:
- ✅ Clear error message
- ✅ Option to retry
- ✅ No crashes
- ✅ Can continue after reconnect

**Pass/Fail**: _______

---

## Quick Results Template

### Test Summary

**Date**: _______  
**Tester**: _______  
**Environment**: Local / Staging / Production

### Results

| Test | Status | Time | Issues |
|------|--------|------|--------|
| Acute Flow | ✅/❌ | ___ min | _______ |
| Chronic Flow | ✅/❌ | ___ min | _______ |
| Relaxation Flow | ✅/❌ | ___ min | _______ |
| Urgent Detection | ✅/❌ | ___ min | _______ |
| Mobile | ✅/❌ | ___ min | _______ |
| Error Handling | ✅/❌ | ___ min | _______ |

### Overall Status
- **Passing**: ___ / 6
- **Failing**: ___ / 6
- **Blockers**: ___

### Critical Issues Found
1. _______
2. _______
3. _______

### Quick Wins
1. _______
2. _______
3. _______

---

## Common Issues to Watch

### Issue 1: Healthcare Professional Question Not Appearing
**Symptom**: Acute injury flow doesn't ask about healthcare professional  
**Check**: Verify `seenHealthcareProfessional === null` in context  
**Fix**: Ensure stage progression logic is correct

### Issue 2: Wrong Practitioner Type Recommended
**Symptom**: Massage therapist recommended for acute injury  
**Check**: Verify pain type and injury mechanism detection  
**Fix**: Review recommendation logic in `generateRecommendationsResponse()`

### Issue 3: Urgent Warning Not Triggering
**Symptom**: Neural symptoms don't trigger warning  
**Check**: Verify `detectUrgentMedicalNeeds()` function  
**Fix**: Check regex patterns match user input

### Issue 4: Too Many Messages
**Symptom**: Takes 5+ messages to reach recommendations  
**Check**: Verify stage progression logic  
**Fix**: Ensure fast-track to recommendations after 2-3 messages

### Issue 5: Mobile Layout Issues
**Symptom**: Chat doesn't fit screen or suggestions overlap  
**Check**: CSS responsive breakpoints  
**Fix**: Adjust mobile styles in SmartSearch component

---

## Priority Fixes Guide

### If Test 1 Fails (Acute Flow)
**Priority**: P0 - Critical  
**Impact**: Core functionality broken  
**Action**: Fix immediately - blocks main user flow

### If Test 2 Fails (Chronic Flow)
**Priority**: P0 - Critical  
**Impact**: Core functionality broken  
**Action**: Fix immediately - blocks main user flow

### If Test 3 Fails (Relaxation Flow)
**Priority**: P0 - Critical  
**Impact**: Core functionality broken  
**Action**: Fix immediately - blocks main user flow

### If Test 4 Fails (Urgent Detection)
**Priority**: P1 - High  
**Impact**: Safety concern  
**Action**: Fix soon - could miss urgent cases

### If Test 5 Fails (Mobile)
**Priority**: P1 - High  
**Impact**: Mobile users can't use feature  
**Action**: Fix soon - affects mobile users

### If Test 6 Fails (Error Handling)
**Priority**: P2 - Medium  
**Impact**: Poor UX on errors  
**Action**: Fix when possible - degrades experience

---

## Next Steps After Quick Test

### If All Tests Pass ✅
1. Proceed to comprehensive testing
2. Run user testing sessions
3. Gather feedback
4. Document positive findings

### If Tests Fail ❌
1. Document all failures
2. Prioritize fixes (P0 → P1 → P2)
3. Fix critical issues first
4. Re-test after fixes
5. Continue until all pass

### If Mixed Results ⚠️
1. Document what works
2. Focus on failing tests
3. Fix high-priority issues
4. Re-test
5. Iterate

---

## Quick Validation Checklist

Before moving to comprehensive testing:

- [ ] All 6 quick tests pass
- [ ] No P0 issues found
- [ ] Mobile experience is acceptable
- [ ] Error handling works
- [ ] Recommendations are relevant
- [ ] Message flow is fast (2-4 messages)

---

## Getting Help

### If Stuck
1. Check console for errors
2. Review test scripts for expected behavior
3. Compare with working scenarios
4. Document exact steps to reproduce
5. Share with team

### Resources
- Full test plan: `SMART_SEARCH_UX_TESTING_PLAN.md`
- Detailed scripts: `SMART_SEARCH_UX_TEST_SCRIPTS.md`
- Complete checklist: `SMART_SEARCH_UX_TESTING_CHECKLIST.md`

---

## Time Estimates

- **Quick Test (6 scenarios)**: 30 minutes
- **Standard Test (all scenarios)**: 1-2 hours
- **Comprehensive Test (all + edge cases)**: 3-4 hours
- **User Testing Session**: 1 hour per participant

---

## Success Criteria

### Minimum Viable
- ✅ All 3 main flows work (acute, chronic, relaxation)
- ✅ Recommendations appear in < 4 messages
- ✅ Mobile is usable
- ✅ No crashes

### Target
- ✅ All flows work perfectly
- ✅ Recommendations in 2-3 messages
- ✅ Mobile is excellent
- ✅ Urgent detection works
- ✅ Error handling is graceful

### Excellent
- ✅ Everything works perfectly
- ✅ Fast and smooth
- ✅ Accessible
- ✅ Delightful experience
- ✅ Users love it

---

**Ready to test? Start with Test 1 and work through all 6 scenarios!**



