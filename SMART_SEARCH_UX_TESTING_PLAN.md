# Smart Search UX Testing Plan

## Overview

This document outlines the comprehensive UX testing plan for the redesigned Smart Search system. The new flow focuses on understanding pain/injury context through structured questions, providing recommendations without asking users what they want.

## Testing Objectives

### Primary Objectives
1. **Verify simplified question flow** - Users reach recommendations in 2-3 messages max
2. **Validate pain type selection** - Acute vs Chronic branching works correctly
3. **Test urgent medical detection** - Neural symptoms trigger appropriate warnings
4. **Confirm practitioner recommendations** - Correct practitioner types recommended based on context
5. **Validate message consistency** - All answers are symptom-focused, not service-focused

### Secondary Objectives
1. **Mobile responsiveness** - Chat interface works on all devices
2. **Accessibility** - Screen reader compatibility, keyboard navigation
3. **Error handling** - Graceful handling of edge cases
4. **Performance** - Fast response times, smooth interactions

## Test Scenarios

### Scenario 1: Acute Injury Flow (Recent Injury)
**User Type**: New client with recent sports injury  
**Goal**: Verify acute injury flow with healthcare professional check

**Flow**:
1. User selects "I'm in pain"
2. User selects "I've sustained a recent injury causing pain"
3. User answers healthcare professional question
4. System recommends appropriate practitioners

**Success Criteria**:
- ✅ Reaches recommendations in 3-4 messages
- ✅ Asks healthcare professional question for acute injuries
- ✅ Recommends Sports Therapist/Osteopath for acute injuries
- ✅ Message explains why practitioner type is recommended

---

### Scenario 2: Chronic Pain Flow (Long-term)
**User Type**: Client with ongoing back pain  
**Goal**: Verify chronic pain flow skips healthcare professional check

**Flow**:
1. User selects "I'm in pain"
2. User selects "I've been in pain for a period of more than 2 months"
3. System provides recommendations

**Success Criteria**:
- ✅ Reaches recommendations in 2-3 messages
- ✅ Does NOT ask healthcare professional question
- ✅ Recommends appropriate practitioners based on severity
- ✅ Message explains chronic pain context

---

### Scenario 3: Relaxation/Stress Relief Flow
**User Type**: Client seeking stress relief  
**Goal**: Verify relaxation flow fast-tracks to massage therapist

**Flow**:
1. User selects "I want relaxation/stress relief"
2. System provides massage therapist recommendations

**Success Criteria**:
- ✅ Reaches recommendations in 1-2 messages
- ✅ Only recommends Massage Therapists
- ✅ Message explains relaxation benefits
- ✅ No unnecessary questions asked

---

### Scenario 4: Urgent Medical Attention Detection
**User Type**: Client with neural symptoms  
**Goal**: Verify urgent medical warning appears for serious symptoms

**Flow**:
1. User selects "I'm in pain"
2. User mentions "losing sensation in feet" or similar neural symptom
3. System shows urgent medical attention warning

**Success Criteria**:
- ✅ Detects neural symptoms correctly
- ✅ Shows urgent medical attention warning
- ✅ Does NOT trigger for high pain scores alone
- ✅ Provides options to continue or seek medical attention

---

### Scenario 5: Gradual Onset (No Specific Mechanism)
**User Type**: Desk worker with gradual back pain  
**Goal**: Verify gradual onset detection recommends massage for low severity

**Flow**:
1. User selects "I'm in pain"
2. User selects chronic pain option
3. User mentions "desk work" or "workload increase" in conversation
4. System recommends massage therapist (if low severity)

**Success Criteria**:
- ✅ Detects gradual onset patterns
- ✅ Recommends massage for gradual onset + low severity
- ✅ Recommends assessment (Sports Therapist/Osteopath) for higher severity
- ✅ Message explains reasoning

---

### Scenario 6: Specific Injury Mechanism
**User Type**: Client with clear injury event  
**Goal**: Verify specific mechanisms trigger assessment recommendations

**Flow**:
1. User selects "I'm in pain"
2. User selects acute injury
3. User mentions specific mechanism (e.g., "fell", "twisted", "heard a pop")
4. System recommends Sports Therapist/Osteopath

**Success Criteria**:
- ✅ Detects specific injury mechanisms
- ✅ Always recommends assessment for specific mechanisms
- ✅ Does NOT recommend massage for specific acute injuries
- ✅ Message explains need for assessment

---

### Scenario 7: Mobile Experience
**User Type**: Mobile user  
**Goal**: Verify chat interface works on mobile devices

**Flow**:
1. Access Smart Search on mobile device
2. Complete full conversation flow
3. Test touch interactions, scrolling, input

**Success Criteria**:
- ✅ Chat interface is responsive
- ✅ Suggestions are easily tappable
- ✅ Input field is accessible
- ✅ Messages are readable
- ✅ Recommendations display correctly

---

### Scenario 8: Accessibility Testing
**User Type**: User with assistive technology  
**Goal**: Verify screen reader and keyboard navigation

**Flow**:
1. Use screen reader (NVDA/JAWS/VoiceOver)
2. Navigate chat with keyboard only
3. Complete conversation flow

**Success Criteria**:
- ✅ Screen reader announces messages correctly
- ✅ Suggestions are keyboard accessible
- ✅ Focus indicators are visible
- ✅ ARIA labels are present
- ✅ Recommendations are accessible

---

### Scenario 9: Error Handling
**User Type**: Various edge cases  
**Goal**: Verify graceful error handling

**Test Cases**:
- Network error during processing
- Invalid input
- Empty responses
- Rapid message sending
- Browser back/forward navigation

**Success Criteria**:
- ✅ Error messages are clear and helpful
- ✅ System recovers gracefully
- ✅ No data loss on errors
- ✅ User can retry or continue

---

### Scenario 10: Performance Testing
**User Type**: All users  
**Goal**: Verify fast response times

**Metrics**:
- Initial load time
- Message processing time
- Recommendation generation time
- Smooth animations

**Success Criteria**:
- ✅ Initial load < 2 seconds
- ✅ Message processing < 1 second
- ✅ Recommendations appear < 2 seconds
- ✅ No lag or jank in UI

---

## User Personas

### Persona 1: Sarah - Acute Injury
- **Age**: 28
- **Context**: Twisted ankle during weekend soccer game
- **Tech Comfort**: High
- **Goal**: Quick assessment and treatment
- **Pain Type**: Acute, specific mechanism

### Persona 2: Mike - Chronic Pain
- **Age**: 45
- **Context**: Desk worker with 6 months of back pain
- **Tech Comfort**: Medium
- **Goal**: Relief from ongoing pain
- **Pain Type**: Chronic, gradual onset

### Persona 3: Emma - Stress Relief
- **Age**: 32
- **Context**: Overwhelmed professional needing relaxation
- **Tech Comfort**: High
- **Goal**: Stress relief massage
- **Pain Type**: Relaxation

### Persona 4: James - Neural Symptoms
- **Age**: 55
- **Context**: Losing sensation in feet
- **Tech Comfort**: Low
- **Goal**: Understand if urgent
- **Pain Type**: Potentially urgent

---

## Testing Schedule

### Phase 1: Core Functionality (Week 1)
- Scenarios 1-3: Basic flows
- Scenarios 4-6: Advanced detection
- **Duration**: 2-3 days

### Phase 2: Device & Accessibility (Week 1)
- Scenario 7: Mobile testing
- Scenario 8: Accessibility testing
- **Duration**: 1-2 days

### Phase 3: Edge Cases & Performance (Week 2)
- Scenario 9: Error handling
- Scenario 10: Performance testing
- **Duration**: 1-2 days

### Phase 4: User Testing (Week 2)
- Real user sessions
- Feedback collection
- **Duration**: 2-3 days

---

## Success Metrics

### Quantitative Metrics
- **Time to recommendations**: < 60 seconds
- **Message count**: 2-4 messages average
- **Completion rate**: > 85%
- **Error rate**: < 5%
- **Mobile completion rate**: > 80%

### Qualitative Metrics
- **Clarity**: Users understand questions
- **Helpfulness**: Recommendations feel relevant
- **Trust**: Users trust the recommendations
- **Satisfaction**: Users would use again

---

## Test Environment

### Browsers
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Devices
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667, 414x896)

### Assistive Technology
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)

---

## Reporting

### Test Results Template
- Scenario name
- Pass/Fail status
- Issues found
- Screenshots/videos
- Recommendations

### Priority Levels
- **P0**: Critical - Blocks core functionality
- **P1**: High - Major UX issue
- **P2**: Medium - Minor UX issue
- **P3**: Low - Enhancement opportunity

---

## Next Steps

1. Review this plan with stakeholders
2. Set up test environment
3. Prepare test data
4. Begin Phase 1 testing
5. Document findings
6. Prioritize fixes
7. Re-test after fixes



