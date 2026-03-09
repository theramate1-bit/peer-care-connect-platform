# 📝 UX Test Scripts - Onboarding Simplification & Profile Completion

**Version**: 1.0  
**For**: Moderators conducting UX testing sessions  
**Duration**: 45-60 minutes per session

---

## 🎯 Pre-Test Setup

### Before Session Starts
1. ✅ Ensure test data is set up (see `UX_TEST_DATA_SETUP.md`)
2. ✅ Prepare screen recording software
3. ✅ Have note-taking template ready
4. ✅ Test all scenarios yourself first
5. ✅ Prepare follow-up questions

### Welcome Script
> "Thank you for participating in our UX testing session. Today we're testing a simplified onboarding process and profile completion workflow. There are no right or wrong answers - we want to see how you naturally interact with the system. Please think aloud as you go through the tasks. This session will take about 45-60 minutes. Do you have any questions before we begin?"

---

## 📋 Test Script 1: New Practitioner Onboarding

### Task Overview
**Goal**: Complete the onboarding process as a new practitioner  
**Time Limit**: 5 minutes  
**Success Criteria**: Completes all 3 steps and lands on dashboard

### Moderator Instructions

**Introduction**:
> "Imagine you're a sports therapist who wants to join our platform. You've just created an account and need to complete your onboarding. Please go through the process as you would naturally. Remember to think aloud."

**Step-by-Step Observations**:

1. **Step 1: Basic Information**
   - ✅ Does user notice bio field is missing?
   - ✅ Does user fill in all required fields?
   - ✅ Does user understand location picker?
   - ⏱️ Time to complete Step 1: _____ seconds

2. **Step 2: Stripe Connect**
   - ✅ Does user understand what Stripe Connect is?
   - ✅ Does user complete the setup?
   - ✅ Any confusion or hesitation?
   - ⏱️ Time to complete Step 2: _____ seconds

3. **Step 3: Subscription**
   - ✅ Does user select a plan?
   - ✅ Does user complete payment?
   - ✅ Any questions about plans?
   - ⏱️ Time to complete Step 3: _____ seconds

**Post-Task Questions**:
1. "How did that feel? Was it faster or slower than you expected?"
2. "Did you notice anything missing that you expected to see?"
3. "What would you do next?"

**Scoring**:
- ✅ **Pass**: Completes in < 2 minutes, no major confusion
- ⚠️ **Partial**: Completes but with confusion or > 2 minutes
- ❌ **Fail**: Cannot complete or abandons

---

## 📋 Test Script 2: Profile Completion Widget Discovery

### Task Overview
**Goal**: Notice and interact with the profile completion widget  
**Time Limit**: 3 minutes  
**Success Criteria**: Notices widget, understands what's missing, clicks "Fix"

### Moderator Instructions

**Introduction**:
> "You've just completed onboarding. Look at your dashboard. What do you see? What would you do next?"

**Step-by-Step Observations**:

1. **Initial Discovery**
   - ✅ Does user notice the widget?
   - ✅ How long until they notice? (if at all)
   - ✅ What do they think it means?

2. **Widget Understanding**
   - ✅ Does user understand the progress percentage?
   - ✅ Does user read the checklist items?
   - ✅ Does user understand what's incomplete?

3. **Action Taking**
   - ✅ Does user click "Fix" button?
   - ✅ Does navigation work correctly?
   - ✅ Does user know where they're going?

**Post-Task Questions**:
1. "What did you think that widget was for?"
2. "Was it clear what you needed to do?"
3. "Did you feel motivated to complete your profile?"

**Scoring**:
- ✅ **Pass**: Notices within 10 seconds, understands purpose, takes action
- ⚠️ **Partial**: Notices but unclear, or notices late
- ❌ **Fail**: Doesn't notice or completely misunderstands

---

## 📋 Test Script 3: Completing Profile Fields

### Task Overview
**Goal**: Add missing profile information (Bio, Experience, Qualifications)  
**Time Limit**: 10 minutes  
**Success Criteria**: Completes all required fields and sees widget update

### Moderator Instructions

**Introduction**:
> "You need to complete your profile to start offering services. Please add your professional bio, years of experience, and qualifications. Go ahead and do that now."

**Step-by-Step Observations**:

1. **Navigation to Profile**
   - ✅ Does user find profile settings?
   - ✅ Does user navigate to correct tab?
   - ✅ Any confusion about where fields are?

2. **Adding Bio**
   - ✅ Does user understand 50+ character requirement?
   - ✅ Does user write appropriate content?
   - ✅ Any validation errors?

3. **Adding Experience**
   - ✅ Does user find experience field?
   - ✅ Does user enter correct value?
   - ✅ Any confusion about format?

4. **Adding Qualifications**
   - ✅ Does user find qualification fields?
   - ✅ Does user understand what's needed?
   - ✅ Any file upload issues?

5. **Saving & Verification**
   - ✅ Does user save successfully?
   - ✅ Does widget update?
   - ✅ Does progress percentage increase?

**Post-Task Questions**:
1. "Was it easy to find all the fields you needed?"
2. "Did you understand what information was required?"
3. "How did you know you were done?"

**Scoring**:
- ✅ **Pass**: Completes all fields in < 10 minutes, widget updates
- ⚠️ **Partial**: Completes but with difficulty or widget doesn't update
- ❌ **Fail**: Cannot find fields or complete task

---

## 📋 Test Script 4: Services Gating (Incomplete Profile)

### Task Overview
**Goal**: Attempt to access services with incomplete profile  
**Time Limit**: 5 minutes  
**Success Criteria**: Understands why locked, knows how to unlock

### Moderator Instructions

**Introduction**:
> "You want to create your first service package. Try to go to the Services & Pricing page and create a package."

**Step-by-Step Observations**:

1. **Navigation Attempt**
   - ✅ Does user navigate to Services page?
   - ✅ What do they see first?

2. **Lock Message Understanding**
   - ✅ Does user read the lock message?
   - ✅ Does user understand why it's locked?
   - ✅ Does user understand what's needed?

3. **Widget Interaction**
   - ✅ Does user see the profile widget?
   - ✅ Does user understand the checklist?
   - ✅ Does user click "Go to Profile Settings"?

4. **Unlocking Process**
   - ✅ Does user complete missing fields?
   - ✅ Does user return to Services page?
   - ✅ Does page unlock successfully?

**Post-Task Questions**:
1. "How did you feel when you saw the lock message?"
2. "Was it clear what you needed to do?"
3. "Did you find the process frustrating or helpful?"

**Scoring**:
- ✅ **Pass**: Understands lock, completes profile, unlocks successfully
- ⚠️ **Partial**: Understands but finds process confusing
- ❌ **Fail**: Doesn't understand or gives up

---

## 📋 Test Script 5: Mobile Onboarding Experience

### Task Overview
**Goal**: Complete onboarding on mobile device  
**Time Limit**: 5 minutes  
**Success Criteria**: Completes all steps without major issues

### Moderator Instructions

**Introduction**:
> "Now let's try this on a mobile device. Please complete the onboarding process on your phone."

**Step-by-Step Observations**:

1. **Form Usability**
   - ✅ Are fields easy to tap?
   - ✅ Is text readable?
   - ✅ Any horizontal scrolling?

2. **Stripe Connect on Mobile**
   - ✅ Does Stripe modal work?
   - ✅ Can user complete setup?
   - ✅ Any display issues?

3. **Profile Widget on Mobile**
   - ✅ Is widget visible?
   - ✅ Is it readable?
   - ✅ Are buttons tappable?

4. **Overall Experience**
   - ✅ Is process smooth?
   - ✅ Any frustration points?
   - ✅ Would user complete on mobile?

**Post-Task Questions**:
1. "How was the mobile experience compared to desktop?"
2. "Were there any parts that were difficult on mobile?"
3. "Would you complete this on mobile in real life?"

**Scoring**:
- ✅ **Pass**: Completes smoothly, no major issues
- ⚠️ **Partial**: Completes but with some difficulty
- ❌ **Fail**: Cannot complete or major usability issues

---

## 📋 Test Script 6: Accessibility - Screen Reader

### Task Overview
**Goal**: Navigate and complete profile using screen reader  
**Time Limit**: 15 minutes  
**Success Criteria**: Can navigate widget and complete fields with screen reader

### Moderator Instructions

**Setup**:
- Enable NVDA (Windows) or VoiceOver (macOS)
- Provide keyboard-only navigation instructions

**Introduction**:
> "We're going to test the accessibility of the profile completion widget. Please navigate using only your keyboard and screen reader."

**Step-by-Step Observations**:

1. **Widget Discovery**
   - ✅ Is widget announced by screen reader?
   - ✅ Is progress percentage read?
   - ✅ Are checklist items announced?

2. **Navigation**
   - ✅ Can user navigate through checklist?
   - ✅ Are "Fix" buttons accessible?
   - ✅ Is navigation logical?

3. **Form Interaction**
   - ✅ Can user navigate to profile fields?
   - ✅ Are labels announced correctly?
   - ✅ Can user complete forms?

**Post-Task Questions**:
1. "Was the widget information clear through the screen reader?"
2. "Could you navigate easily?"
3. "Were there any confusing parts?"

**Scoring**:
- ✅ **Pass**: Can complete all tasks with screen reader
- ⚠️ **Partial**: Can complete but with difficulty
- ❌ **Fail**: Cannot complete or major accessibility issues

---

## 📊 Scoring Rubric

### Overall Session Score
- **Excellent (5/5)**: All tasks completed smoothly, no issues
- **Good (4/5)**: Most tasks completed, minor issues
- **Fair (3/5)**: Tasks completed but with confusion
- **Poor (2/5)**: Significant issues, some tasks failed
- **Very Poor (1/5)**: Cannot complete most tasks

### Issue Severity
- **Critical**: Blocks task completion
- **High**: Significant confusion or frustration
- **Medium**: Minor confusion, workaround exists
- **Low**: Cosmetic or edge case

---

## 📝 Debrief Template

### Session Summary
- **Tester**: ___________
- **Date**: ___________
- **Duration**: ___________
- **Overall Score**: ___/5

### Tasks Completed
- [ ] Task 1: New Practitioner Onboarding
- [ ] Task 2: Profile Widget Discovery
- [ ] Task 3: Completing Profile Fields
- [ ] Task 4: Services Gating
- [ ] Task 5: Mobile Experience
- [ ] Task 6: Accessibility

### Key Findings
1. **Positive**: 
   - 
   - 

2. **Issues Found**:
   - **Critical**: 
   - **High**: 
   - **Medium**: 
   - **Low**: 

3. **Recommendations**:
   - 
   - 

### Quotes
> "User quote about experience"

### Screenshots/Videos
- Attach relevant media

---

## 🎬 Next Steps

After each session:
1. ✅ Complete debrief template
2. ✅ Categorize issues by severity
3. ✅ Share findings with team
4. ✅ Prioritize fixes
5. ✅ Schedule follow-up testing if needed

**Ready to test?** Start with Test Script 1 and work through systematically.



