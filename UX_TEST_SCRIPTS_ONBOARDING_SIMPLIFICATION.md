# UX Test Scripts: Onboarding Simplification

**Date**: January 2025  
**Version**: 1.0  
**For**: UX Test Moderators

---

## 📋 How to Use This Document

This document provides step-by-step scripts for moderating UX testing sessions. Each scenario includes:
- **Setup Instructions**: What to prepare before the test
- **Moderator Script**: What to say to participants
- **Task Instructions**: What to ask participants to do
- **Observation Points**: What to watch for
- **Success Criteria**: How to measure success
- **Follow-up Questions**: What to ask after

---

## 🎯 Pre-Test Setup

### Environment Setup
1. Ensure test environment is running and accessible
2. Create test practitioner accounts (see `UX_TEST_DATA_SETUP_ONBOARDING_SIMPLIFICATION.md`)
3. Clear browser cache and cookies
4. Prepare screen recording software
5. Set up note-taking template

### Participant Briefing
- Explain the purpose of the test
- Clarify that we're testing the system, not them
- Ask for think-aloud feedback
- Obtain consent for recording
- Estimate session duration (30-45 minutes)

---

## 📝 Test Script 1: New Practitioner Onboarding

### Setup
- **Test Account**: New practitioner (no existing data)
- **Browser**: Chrome (latest)
- **Device**: Desktop (1920x1080)
- **Time Estimate**: 10 minutes

### Moderator Script
> "Thank you for participating. Today we're testing a new simplified onboarding process for healthcare practitioners. I'll ask you to complete the sign-up process as if you were a new sports therapist joining the platform. Please think aloud as you go through the process - share what you're thinking, what you're looking for, and any questions or concerns you have."

### Task Instructions
> "Your task is to sign up as a new sports therapist and complete the onboarding process. Start from the sign-up page and go through each step. Take your time and don't rush."

### Step-by-Step Observations

#### Step 1: Basic Information
**What to Watch For**:
- [ ] Does user notice the simplified form?
- [ ] Any confusion about missing fields (bio, professional details)?
- [ ] Time taken to complete Step 1
- [ ] Validation errors and clarity
- [ ] User satisfaction with speed

**Success Indicators**:
- ✅ Completes Step 1 in < 2 minutes
- ✅ No confusion about missing fields
- ✅ Expresses satisfaction with speed
- ✅ No errors or validation issues

**Potential Issues**:
- User expects bio field
- User looks for professional details step
- Validation errors unclear
- Form feels incomplete

---

#### Step 2: Stripe Connect
**What to Watch For**:
- [ ] Understanding of Stripe Connect requirement
- [ ] Ease of Stripe setup process
- [ ] Any confusion or errors
- [ ] Time taken

**Success Indicators**:
- ✅ Completes Stripe setup successfully
- ✅ Understands why it's required
- ✅ No major blockers

---

#### Step 3: Subscription
**What to Watch For**:
- [ ] Understanding of subscription options
- [ ] Selection process clarity
- [ ] Payment flow (if applicable)
- [ ] Completion confirmation

**Success Indicators**:
- ✅ Selects subscription successfully
- ✅ Understands options
- ✅ Onboarding completes

---

### Post-Task Questions
1. "How long did that feel compared to other sign-up processes you've done?"
2. "Was there anything you expected to see but didn't?"
3. "How confident are you that you completed everything correctly?"
4. "What was the easiest part? What was the most confusing?"
5. "On a scale of 1-5, how satisfied are you with this onboarding process?"

### Success Criteria
- **Time**: < 5 minutes total
- **Completion**: 100% success rate
- **Satisfaction**: > 4.0/5.0
- **Confusion**: < 2 major confusion points

---

## 📝 Test Script 2: Profile Completion Widget

### Setup
- **Test Account**: Practitioner with incomplete profile
- **Browser**: Chrome
- **Device**: Desktop
- **Time Estimate**: 8 minutes

### Moderator Script
> "Now that you've completed onboarding, let's look at your dashboard. I want you to explore the profile completion widget and see what information is still needed."

### Task Instructions
> "Look at the profile completion widget on your dashboard. Review what's missing and try to complete at least one item from the checklist."

### Step-by-Step Observations

#### Widget Discovery
**What to Watch For**:
- [ ] Does user notice the widget immediately?
- [ ] Understanding of progress percentage
- [ ] Clarity of checklist items
- [ ] User reaction to incomplete status

**Success Indicators**:
- ✅ Widget noticed within 10 seconds
- ✅ Progress percentage understood
- ✅ Checklist items are clear
- ✅ User understands what's needed

---

#### Widget Interaction
**What to Watch For**:
- [ ] "Fix" button visibility (especially on mobile)
- [ ] Navigation accuracy when clicking "Fix"
- [ ] User understanding of requirements
- [ ] Real-time updates after completion

**Success Indicators**:
- ✅ "Fix" buttons are visible and clickable
- ✅ Navigation goes to correct section
- ✅ User can complete items
- ✅ Widget updates immediately

---

### Post-Task Questions
1. "Was the widget easy to find?"
2. "Did you understand what was required?"
3. "Were the 'Fix' buttons easy to use?"
4. "Did the widget update when you completed an item?"
5. "How helpful was this widget in guiding you?"

### Success Criteria
- **Discovery**: < 10 seconds to notice
- **Understanding**: > 90% understand requirements
- **Navigation**: 100% accurate
- **Updates**: Real-time (< 1 second)

---

## 📝 Test Script 3: Services Gating

### Setup
- **Test Account**: Practitioner with incomplete profile
- **Browser**: Chrome
- **Device**: Desktop
- **Time Estimate**: 5 minutes

### Moderator Script
> "Now I'd like you to try to create a service or package. Navigate to the Services & Pricing page and see what happens."

### Task Instructions
> "Try to access the Services & Pricing page and create a new service package."

### Step-by-Step Observations

#### Gating Discovery
**What to Watch For**:
- [ ] User reaction to lock message
- [ ] Understanding of why access is blocked
- [ ] Clarity of requirements
- [ ] Willingness to complete profile

**Success Indicators**:
- ✅ Lock message is clear
- ✅ User understands requirements
- ✅ No frustration or confusion
- ✅ User willing to complete profile

---

#### Navigation to Profile
**What to Watch For**:
- [ ] "Go to Profile Settings" button works
- [ ] Navigation to correct section
- [ ] User can find required fields
- [ ] User completes requirements

**Success Indicators**:
- ✅ Button navigates correctly
- ✅ User finds required fields
- ✅ User completes requirements
- ✅ Services unlock after completion

---

### Post-Task Questions
1. "How did you feel when you saw the lock message?"
2. "Was it clear what you needed to do?"
3. "Did you find the required fields easily?"
4. "How long did it take to complete the requirements?"
5. "Do you think this gating is helpful or frustrating?"

### Success Criteria
- **Understanding**: > 90% understand why blocked
- **Navigation**: 100% successful
- **Completion**: > 80% complete requirements
- **Satisfaction**: > 3.5/5.0 (gating is acceptable)

---

## 📝 Test Script 4: Profile Completion Flow

### Setup
- **Test Account**: Practitioner with incomplete profile
- **Browser**: Chrome
- **Device**: Desktop
- **Time Estimate**: 15 minutes

### Moderator Script
> "Now let's complete your profile. I want you to fill in all the professional information that was moved from onboarding to the profile section."

### Task Instructions
> "Navigate to your Profile page and complete all the professional information fields. Take your time and fill in realistic data."

### Step-by-Step Observations

#### Field Discovery
**What to Watch For**:
- [ ] Can user find Professional tab?
- [ ] Are all moved fields present?
- [ ] Field organization makes sense
- [ ] User understands field purposes

**Success Indicators**:
- ✅ Professional tab found easily
- ✅ All fields are present
- ✅ Organization is logical
- ✅ Fields are clear

---

#### Data Entry
**What to Watch For**:
- [ ] Ease of filling forms
- [ ] Validation errors and clarity
- [ ] Save process works
- [ ] Data persists correctly

**Success Indicators**:
- ✅ Forms are easy to fill
- ✅ Validation is clear
- ✅ Save works without errors
- ✅ Data persists

---

#### Widget Updates
**What to Watch For**:
- [ ] Widget updates after each save
- [ ] Progress percentage increases
- [ ] Completed items marked correctly
- [ ] Real-time sync works

**Success Indicators**:
- ✅ Widget updates immediately
- ✅ Progress increases correctly
- ✅ Items marked as complete
- ✅ No refresh needed

---

### Post-Task Questions
1. "Were all the fields you expected to see present?"
2. "Was the organization logical?"
3. "Did the save process work smoothly?"
4. "Did the widget update as you completed items?"
5. "How satisfied are you with this profile setup?"

### Success Criteria
- **Field Discovery**: 100% find all fields
- **Data Entry**: < 10 minutes to complete
- **Save Success**: 100% success rate
- **Widget Updates**: Real-time (< 1 second)

---

## 📝 Test Script 5: Mobile Experience

### Setup
- **Test Account**: New practitioner
- **Browser**: Mobile Safari/Chrome
- **Device**: iPhone/Android
- **Time Estimate**: 15 minutes

### Moderator Script
> "Now let's test this on a mobile device. Please use your phone to complete the onboarding and profile setup."

### Task Instructions
> "Complete the onboarding process on your mobile device, then try to complete your profile using the Profile Completion Widget."

### Step-by-Step Observations

#### Mobile Onboarding
**What to Watch For**:
- [ ] Forms work on small screens
- [ ] Touch interactions work
- [ ] Navigation is clear
- [ ] No horizontal scrolling

**Success Indicators**:
- ✅ Forms are mobile-friendly
- ✅ Touch works correctly
- ✅ Navigation is clear
- ✅ No layout issues

---

#### Mobile Widget
**What to Watch For**:
- [ ] Widget displays correctly
- [ ] "Fix" buttons are visible (not hover-only)
- [ ] Touch targets are large enough
- [ ] Text is readable

**Success Indicators**:
- ✅ Widget displays correctly
- ✅ Buttons always visible
- ✅ Touch targets adequate
- ✅ Text is readable

---

### Post-Task Questions
1. "How was the mobile experience compared to desktop?"
2. "Were the buttons easy to tap?"
3. "Was the text easy to read?"
4. "Any issues with forms on mobile?"
5. "Would you use this on mobile regularly?"

### Success Criteria
- **Mobile Usability**: > 4.0/5.0
- **Touch Targets**: All > 44x44px
- **Text Readability**: > 16px font size
- **Layout**: No horizontal scrolling

---

## 📝 Test Script 6: Error Handling

### Setup
- **Test Account**: Practitioner with incomplete profile
- **Browser**: Chrome
- **Device**: Desktop
- **Time Estimate**: 10 minutes

### Moderator Script
> "Let's test some error scenarios. I'll ask you to try some things that might cause errors, and I want to see how the system handles them."

### Task Instructions
> "Try to save your profile with invalid data (e.g., bio less than 50 characters, missing required fields)."

### Step-by-Step Observations

#### Error Messages
**What to Watch For**:
- [ ] Error messages are clear
- [ ] Error messages are helpful
- [ ] Error messages appear in right place
- [ ] User can recover from errors

**Success Indicators**:
- ✅ Error messages are clear
- ✅ Messages are helpful
- ✅ Messages appear correctly
- ✅ Recovery is easy

---

### Post-Task Questions
1. "Were the error messages clear?"
2. "Did you know how to fix the errors?"
3. "Were the error messages helpful?"
4. "How did you feel when you saw errors?"

### Success Criteria
- **Error Clarity**: > 4.0/5.0
- **Recovery**: 100% can recover
- **Helpfulness**: > 4.0/5.0

---

## 📊 Scoring Rubric

### Task Completion
- **5**: Completed without assistance
- **4**: Completed with minor hints
- **3**: Completed with moderate assistance
- **2**: Completed with significant assistance
- **1**: Could not complete
- **0**: Did not attempt

### User Satisfaction
- **5**: Extremely satisfied
- **4**: Very satisfied
- **3**: Neutral
- **2**: Dissatisfied
- **1**: Very dissatisfied

### Ease of Use
- **5**: Extremely easy
- **4**: Very easy
- **3**: Neutral
- **2**: Difficult
- **1**: Very difficult

---

## 📝 Debrief Template

### Session Summary
- **Participant**: [Name/Role]
- **Date**: [Date]
- **Duration**: [Time]
- **Tasks Completed**: [List]
- **Overall Satisfaction**: [Score]

### Key Findings
1. **Positive**:
   - [Finding 1]
   - [Finding 2]

2. **Issues**:
   - [Issue 1]
   - [Issue 2]

3. **Recommendations**:
   - [Recommendation 1]
   - [Recommendation 2]

### Quotes
- "[User quote 1]"
- "[User quote 2]"

### Next Steps
- [ ] Fix critical issues
- [ ] Test improvements
- [ ] Schedule follow-up

---

## ✅ Test Completion Checklist

- [ ] All scenarios tested
- [ ] Screen recordings saved
- [ ] Notes documented
- [ ] Scores calculated
- [ ] Debrief completed
- [ ] Findings summarized
- [ ] Recommendations documented

---

**Next Steps**: Review findings and proceed to `UX_TESTING_CHECKLIST_ONBOARDING_SIMPLIFICATION.md` for quick reference during testing.



