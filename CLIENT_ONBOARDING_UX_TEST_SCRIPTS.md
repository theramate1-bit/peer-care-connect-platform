# Client Onboarding UX Test Scripts

**Version**: 1.0  
**Date**: January 2025  
**Purpose**: Detailed step-by-step test scripts for moderators

---

## 🎬 How to Use This Document

### For Moderators
1. Read the scenario overview
2. Follow the script step-by-step
3. Observe and note user behavior
4. Ask follow-up questions
5. Record findings in the results section

### For Observers
- Watch user behavior
- Note confusion points
- Time task completion
- Record errors and issues

---

## 📋 Scenario 1: New Client Onboarding - Simplified Flow

### Overview
**Objective**: Verify the simplified Step 2 onboarding process  
**Duration**: ~5 minutes  
**User Type**: New client (never used platform)

### Pre-Test Setup
- [ ] Clear browser cache
- [ ] Use incognito/private window
- [ ] Have test email ready
- [ ] Start screen recording (if applicable)

### Test Script

#### Step 1: Initial Access
**Moderator**: "I'd like you to sign up for a new account on this platform. Please go to the sign-up page."

**Observe**:
- [ ] Does user find sign-up easily?
- [ ] Any confusion about where to start?
- [ ] Time to locate sign-up: _____ seconds

**Expected**: User navigates to sign-up page

---

#### Step 2: Step 1 - Phone & Location
**Moderator**: "Please complete the first step. Enter your phone number and location."

**Observe**:
- [ ] Does user understand what's required?
- [ ] Any issues with location picker?
- [ ] Time to complete Step 1: _____ seconds
- [ ] Any errors or confusion?

**Expected**: User enters phone and location, proceeds to Step 2

---

#### Step 3: Step 2 - Personal Information
**Moderator**: "Now complete Step 2. What do you see here?"

**Observe**:
- [ ] **CRITICAL**: Does user see ONLY First Name and Last Name fields?
- [ ] Does user look for other fields (primaryGoal, preferredTherapyTypes)?
- [ ] Any confusion about what's required?
- [ ] Time to complete Step 2: _____ seconds
- [ ] User reaction to simplified form: _____ (note)

**Expected**: 
- ✅ Only First Name and Last Name fields visible
- ✅ No "Primary Health Goal" field
- ✅ No "Preferred Therapy Types" section
- ✅ User completes quickly

**Success Criteria**:
- ✅ Step 2 shows only 2 fields
- ✅ No removed fields visible
- ✅ User completes in < 30 seconds

---

#### Step 4: Completion Message
**Moderator**: "After completing Step 2, what happens? What do you see?"

**Observe**:
- [ ] Does completion message appear?
- [ ] Can user read all features listed?
- [ ] User reaction to message: _____ (note)
- [ ] Does user understand what they can do next?
- [ ] Time to read message: _____ seconds

**Expected**:
- ✅ Green completion box appears
- ✅ Shows "Account setup complete!"
- ✅ Lists all 4 features:
  - Start finding booking sessions
  - Track your progress
  - Ask the search for therapists
  - Browse on the marketplace

**Success Criteria**:
- ✅ Message displays correctly
- ✅ All 4 features visible
- ✅ User understands next steps

---

#### Step 5: Dashboard Navigation
**Moderator**: "Now, please proceed to your dashboard."

**Observe**:
- [ ] Does user find "Complete Setup" or similar button?
- [ ] Any errors during navigation?
- [ ] Time to reach dashboard: _____ seconds
- [ ] User's first impression of dashboard: _____ (note)

**Expected**: User successfully navigates to dashboard

---

### Follow-Up Questions

1. **Overall Experience**:
   - "How easy was it to complete the sign-up process?" (1-5 scale)
   - "What was the most confusing part?"
   - "What was the easiest part?"

2. **Step 2 Specific**:
   - "Did you expect to see more questions in Step 2?"
   - "Was Step 2 too simple, just right, or too complex?"
   - "Did you notice any missing fields you expected?"

3. **Completion Message**:
   - "Did you understand what you can do after completing sign-up?"
   - "Which feature mentioned interests you most?"
   - "Was the message clear and helpful?"

4. **Time Perception**:
   - "How long did the sign-up feel like it took?"
   - "Was it faster or slower than expected?"

---

### Results Template

```
Scenario 1: New Client Onboarding
Tester: [Name]
Date: [Date]
Duration: [Time]

Step 1 (Phone & Location):
- Time: _____ seconds
- Issues: [Notes]
- Status: ✅ Pass / ❌ Fail

Step 2 (Personal Information):
- Time: _____ seconds
- Fields visible: [List]
- Removed fields visible: Yes / No
- Issues: [Notes]
- Status: ✅ Pass / ❌ Fail

Step 3 (Completion Message):
- Message visible: Yes / No
- Features listed: [Count]
- Issues: [Notes]
- Status: ✅ Pass / ❌ Fail

Overall:
- Total time: _____ seconds
- User satisfaction: _____ / 5
- Critical issues: [List]
- Status: ✅ Pass / ❌ Fail / ⚠️ Partial
```

---

## 📋 Scenario 2: Completion Message Verification

### Overview
**Objective**: Verify new completion message displays correctly  
**Duration**: ~2 minutes  
**User Type**: New client

### Test Script

#### Step 1: Complete Onboarding
**Moderator**: "Please complete the onboarding process. Go through Steps 1 and 2."

**Observe**:
- [ ] User completes both steps
- [ ] No errors occur

---

#### Step 2: Review Completion Message
**Moderator**: "After completing Step 2, please read the completion message out loud."

**Observe**:
- [ ] Does message appear?
- [ ] Can user read it clearly?
- [ ] User's reading speed: _____ (note if slow/fast)

**Expected**: Message appears with all features

---

#### Step 3: Verify Features List
**Moderator**: "Can you tell me what features are mentioned in the message?"

**Observe**:
- [ ] User lists features correctly
- [ ] Any features missed?
- [ ] User understanding of each feature: _____ (note)

**Expected**: User identifies all 4 features:
1. Start finding booking sessions
2. Track your progress
3. Ask the search for therapists
4. Browse on the marketplace

---

#### Step 4: Visual Check
**Moderator**: "Please describe what you see visually."

**Observe**:
- [ ] Message styling (green box, checkmark, etc.)
- [ ] Text readability
- [ ] Visual hierarchy
- [ ] Any visual issues?

**Expected**:
- ✅ Green background box
- ✅ CheckCircle icon
- ✅ Clear typography
- ✅ Good contrast

---

### Follow-Up Questions

1. "Was the completion message clear and helpful?"
2. "Did you understand what you can do next?"
3. "Was the message visually appealing?"
4. "Would you change anything about the message?"

---

### Results Template

```
Scenario 2: Completion Message Verification
Tester: [Name]
Date: [Date]

Message Display:
- Visible: Yes / No
- Timing: Immediate / Delayed
- Status: ✅ Pass / ❌ Fail

Features List:
- Feature 1 visible: Yes / No
- Feature 2 visible: Yes / No
- Feature 3 visible: Yes / No
- Feature 4 visible: Yes / No
- All features visible: Yes / No
- Status: ✅ Pass / ❌ Fail

Visual Design:
- Styling correct: Yes / No
- Readable: Yes / No
- Good contrast: Yes / No
- Status: ✅ Pass / ❌ Fail

Overall: ✅ Pass / ❌ Fail / ⚠️ Partial
```

---

## 📋 Scenario 3: Booking Flow - Hourly Rate Removal

### Overview
**Objective**: Verify hourly rate is not displayed in booking flows  
**Duration**: ~3 minutes  
**User Type**: Client (authenticated or guest)

### Pre-Test Setup
- [ ] Have test practitioner with packages set up
- [ ] Ensure practitioner has NO hourly rate displayed
- [ ] Clear any cached data

### Test Script

#### Step 1: Navigate to Marketplace
**Moderator**: "Please go to the marketplace and find a practitioner."

**Observe**:
- [ ] User navigates to marketplace
- [ ] Can see practitioner cards

---

#### Step 2: View Practitioner Card
**Moderator**: "Look at this practitioner card. What information do you see about pricing?"

**Observe**:
- [ ] **CRITICAL**: Does card show hourly rate?
- [ ] What pricing information is displayed?
- [ ] User's reaction: _____ (note)
- [ ] Any confusion about pricing?

**Expected**:
- ✅ Card shows session count (not hourly rate)
- ✅ No "£X per hour" text
- ✅ No hourly rate mentioned

**Success Criteria**:
- ✅ No hourly rate visible on card
- ✅ User understands pricing is package-based

---

#### Step 3: Open Booking Flow
**Moderator**: "Click to book with this practitioner. What do you see about pricing?"

**Observe**:
- [ ] Does booking flow show hourly rate?
- [ ] What pricing information is displayed?
- [ ] User's understanding of pricing: _____ (note)

**Expected**:
- ✅ Only package prices shown
- ✅ No hourly rate mentioned
- ✅ Clear package pricing

---

#### Step 4: Review Service Selection
**Moderator**: "Look at the services available. How are they priced?"

**Observe**:
- [ ] Services show package prices?
- [ ] Any mention of hourly rates?
- [ ] User's understanding: _____ (note)

**Expected**:
- ✅ Services show fixed package prices
- ✅ Duration shown (e.g., "60 minutes")
- ✅ Price shown (e.g., "£50")
- ✅ No hourly rate calculation

---

### Follow-Up Questions

1. "How did you understand the pricing?"
2. "Did you see any hourly rates mentioned?"
3. "Was the pricing clear to you?"
4. "Would you prefer to see hourly rates or package prices?"

---

### Results Template

```
Scenario 3: Booking Flow - Hourly Rate Removal
Tester: [Name]
Date: [Date]

Practitioner Card:
- Hourly rate visible: Yes / No
- Session count visible: Yes / No
- Status: ✅ Pass / ❌ Fail

Booking Flow:
- Hourly rate visible: Yes / No
- Package prices visible: Yes / No
- Status: ✅ Pass / ❌ Fail

Service Selection:
- Hourly rate mentioned: Yes / No
- Package pricing clear: Yes / No
- Status: ✅ Pass / ❌ Fail

Overall: ✅ Pass / ❌ Fail / ⚠️ Partial
```

---

## 📋 Scenario 4: Cancellation Policy Display

### Overview
**Objective**: Verify cancellation policy displays correctly without duplicates  
**Duration**: ~2 minutes  
**User Type**: Client (authenticated or guest)

### Test Script

#### Step 1: Open Booking Flow
**Moderator**: "Please start booking with a practitioner and go to the payment/review step."

**Observe**:
- [ ] User navigates to booking flow
- [ ] Reaches payment/review step

---

#### Step 2: Locate Cancellation Policy
**Moderator**: "Can you find the cancellation policy? Where is it located?"

**Observe**:
- [ ] User finds policy easily
- [ ] Policy location: _____ (note)
- [ ] Time to locate: _____ seconds

**Expected**: Policy visible in payment/review step

---

#### Step 3: Read Cancellation Policy
**Moderator**: "Please read the cancellation policy out loud."

**Observe**:
- [ ] **CRITICAL**: Any duplicate text?
- [ ] Are time periods clear?
- [ ] Are days/hours properly formatted?
- [ ] User's reading: _____ (note if confused)

**Expected**:
- ✅ No duplicate "2+ days" text
- ✅ Time periods clearly formatted
- ✅ Consistent units (all days or all hours)
- ✅ Easy to read and understand

**Success Criteria**:
- ✅ No duplicate text
- ✅ Proper day/hour conversion
- ✅ Clear formatting

---

#### Step 4: Verify Policy Logic
**Moderator**: "Can you explain what the cancellation policy means?"

**Observe**:
- [ ] User understands policy
- [ ] Can explain time periods
- [ ] Any confusion: _____ (note)

**Expected**: User can explain policy clearly

---

### Follow-Up Questions

1. "Was the cancellation policy easy to understand?"
2. "Did you notice any duplicate or confusing text?"
3. "Was the formatting clear?"

---

### Results Template

```
Scenario 4: Cancellation Policy Display
Tester: [Name]
Date: [Date]

Policy Location:
- Found easily: Yes / No
- Location: [Note]
- Status: ✅ Pass / ❌ Fail

Policy Content:
- Duplicate text: Yes / No
- Clear formatting: Yes / No
- Proper units: Yes / No
- Status: ✅ Pass / ❌ Fail

User Understanding:
- Understood policy: Yes / No
- Could explain: Yes / No
- Status: ✅ Pass / ❌ Fail

Overall: ✅ Pass / ❌ Fail / ⚠️ Partial
```

---

## 📋 Scenario 5: Mobile Onboarding Experience

### Overview
**Objective**: Verify onboarding works seamlessly on mobile devices  
**Duration**: ~5 minutes  
**User Type**: New client (mobile user)

### Pre-Test Setup
- [ ] Test on actual mobile device (not browser dev tools)
- [ ] Clear cache
- [ ] Use mobile network (not WiFi if possible)

### Test Script

#### Step 1: Access Onboarding on Mobile
**Moderator**: "Please open the sign-up page on your mobile device."

**Observe**:
- [ ] Page loads correctly
- [ ] Layout is responsive
- [ ] No horizontal scrolling needed
- [ ] Text is readable

---

#### Step 2: Complete Step 1 on Mobile
**Moderator**: "Complete Step 1 on your mobile device."

**Observe**:
- [ ] Phone input works on mobile
- [ ] Location picker works on mobile
- [ ] Keyboard appears correctly
- [ ] Touch targets appropriately sized
- [ ] Time to complete: _____ seconds

**Expected**: Step 1 completable on mobile

---

#### Step 3: Complete Step 2 on Mobile
**Moderator**: "Now complete Step 2."

**Observe**:
- [ ] **CRITICAL**: Only First Name and Last Name visible?
- [ ] Fields accessible on mobile
- [ ] Keyboard works correctly
- [ ] Touch targets appropriate
- [ ] Time to complete: _____ seconds

**Expected**:
- ✅ Only 2 fields visible
- ✅ Easy to complete on mobile
- ✅ No usability issues

---

#### Step 4: Review Completion Message on Mobile
**Moderator**: "Read the completion message on your mobile screen."

**Observe**:
- [ ] Message readable on small screen
- [ ] All features visible
- [ ] No scrolling needed
- [ ] Text size appropriate

**Expected**: Message fully readable on mobile

---

### Follow-Up Questions

1. "How was the experience on mobile?"
2. "Were the forms easy to fill out?"
3. "Was anything too small or hard to tap?"
4. "Would you complete this on mobile again?"

---

### Results Template

```
Scenario 5: Mobile Onboarding Experience
Tester: [Name]
Date: [Date]
Device: [Device/OS]

Step 1 (Mobile):
- Usable: Yes / No
- Time: _____ seconds
- Issues: [Notes]
- Status: ✅ Pass / ❌ Fail

Step 2 (Mobile):
- Only 2 fields: Yes / No
- Usable: Yes / No
- Time: _____ seconds
- Issues: [Notes]
- Status: ✅ Pass / ❌ Fail

Completion Message (Mobile):
- Readable: Yes / No
- All features visible: Yes / No
- Issues: [Notes]
- Status: ✅ Pass / ❌ Fail

Overall Mobile Experience:
- Rating: _____ / 5
- Status: ✅ Pass / ❌ Fail / ⚠️ Partial
```

---

## 📊 Scoring Rubric

### Task Completion
- **Complete**: User completes task without help
- **Partial**: User completes with minor help
- **Failed**: User cannot complete or needs significant help

### Time to Complete
- **Excellent**: < 30 seconds
- **Good**: 30-60 seconds
- **Acceptable**: 60-120 seconds
- **Poor**: > 120 seconds

### Error Rate
- **Excellent**: 0 errors
- **Good**: 1-2 minor errors
- **Acceptable**: 3-4 errors
- **Poor**: 5+ errors or critical errors

### User Satisfaction
- **Excellent**: 5/5
- **Good**: 4/5
- **Acceptable**: 3/5
- **Poor**: < 3/5

---

## 📝 Debrief Template

### After Each Test Session

**User Feedback Summary**:
- What worked well: _____
- What was confusing: _____
- What would you change: _____
- Overall rating: _____ / 5

**Critical Issues Found**:
1. [Issue]
2. [Issue]

**Recommendations**:
1. [Recommendation]
2. [Recommendation]

**Next Steps**:
- [ ] Fix critical issues
- [ ] Re-test after fixes
- [ ] Update documentation

---

**Next Steps**: 
1. Review scripts before testing
2. Set up test environment (see `CLIENT_ONBOARDING_UX_TEST_DATA_SETUP.md`)
3. Conduct test sessions
4. Record findings
5. Prioritize fixes based on results



