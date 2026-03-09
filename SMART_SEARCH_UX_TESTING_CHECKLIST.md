# Smart Search UX Testing Checklist

## Quick Reference Checklist

Use this checklist during testing sessions to ensure comprehensive coverage.

---

## ✅ Core Functionality Checklist

### Initial Message
- [ ] Message says: "I want to understand your pain..."
- [ ] 3 options displayed: "I'm in pain", "I'm currently injured", "I want relaxation/stress relief"
- [ ] Options are clickable/tappable
- [ ] Message appears immediately on load

### Pain Type Selection (If "I'm in pain" selected)
- [ ] Question: "Select which applies to you?"
- [ ] Options: "I've sustained a recent injury causing pain", "I've been in pain for a period of more than 2 months"
- [ ] Options are clear and understandable
- [ ] Selection works correctly

### Acute Injury Flow
- [ ] Healthcare professional question appears
- [ ] Question text includes: "Have you been seen by a healthcare professional..."
- [ ] Options: "Yes, I have been seen", "No, I haven't been seen yet"
- [ ] Recommendations appear after answer
- [ ] Sports Therapist or Osteopath recommended
- [ ] Message explains why practitioner type is recommended

### Chronic Injury Flow
- [ ] NO healthcare professional question
- [ ] Recommendations appear directly
- [ ] Appropriate practitioners recommended
- [ ] Message mentions chronic pain context

### Relaxation Flow
- [ ] Recommendations appear in 1-2 messages
- [ ] Only Massage Therapists recommended
- [ ] Message explains relaxation benefits
- [ ] No unnecessary questions

### Urgent Medical Detection
- [ ] Detects neural symptoms (losing sensation, numbness)
- [ ] Shows urgent medical attention warning
- [ ] Warning message is clear and appropriate
- [ ] Does NOT trigger for high pain scores alone
- [ ] User can continue or seek medical attention

### Recommendations Display
- [ ] Practitioner cards display correctly
- [ ] Match scores shown
- [ ] Reasons for recommendation visible
- [ ] Book buttons work
- [ ] Practitioner information complete

---

## ✅ Message Flow Checklist

### Message Count
- [ ] Acute flow: 3-4 messages to recommendations
- [ ] Chronic flow: 2-3 messages to recommendations
- [ ] Relaxation flow: 1-2 messages to recommendations
- [ ] No unnecessary questions

### Message Consistency
- [ ] All messages are symptom-focused
- [ ] No service-specific questions (e.g., "What service do you want?")
- [ ] Questions build on previous answers
- [ ] Context is maintained throughout

### Response Speed
- [ ] Messages process within 1 second
- [ ] Recommendations appear within 2 seconds
- [ ] No noticeable lag
- [ ] Smooth typing indicators

---

## ✅ Mobile Responsiveness Checklist

### Layout
- [ ] Chat interface fits screen width
- [ ] Messages wrap correctly
- [ ] Suggestions display in rows/columns appropriately
- [ ] Input field is accessible
- [ ] No horizontal scrolling

### Touch Interactions
- [ ] Suggestions are easily tappable (min 44x44px)
- [ ] Buttons are large enough
- [ ] No accidental taps
- [ ] Keyboard doesn't cover input
- [ ] Scrolling is smooth

### Readability
- [ ] Text is readable (min 16px)
- [ ] Contrast is sufficient
- [ ] Spacing is comfortable
- [ ] Recommendations are readable

---

## ✅ Accessibility Checklist

### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Can activate suggestions with Enter/Space
- [ ] Can type in input field
- [ ] Can send message with Enter
- [ ] Tab order is logical

### Screen Reader
- [ ] Messages are announced
- [ ] Suggestions are announced with roles
- [ ] Recommendations are announced
- [ ] Practitioner cards are navigable
- [ ] Buttons have proper labels
- [ ] Status messages announced

### ARIA & Semantics
- [ ] Proper ARIA labels on buttons
- [ ] Role attributes correct
- [ ] Live regions for dynamic content
- [ ] Heading structure logical
- [ ] Form labels associated

### Visual Accessibility
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Text is resizable (up to 200%)
- [ ] No color-only indicators
- [ ] Focus indicators are visible

---

## ✅ Error Handling Checklist

### Network Errors
- [ ] Clear error message on network failure
- [ ] Option to retry
- [ ] No data loss
- [ ] Can continue after reconnection
- [ ] Error doesn't break flow

### Invalid Input
- [ ] Empty messages handled
- [ ] Very long messages handled
- [ ] Special characters handled
- [ ] Clear feedback provided
- [ ] No crashes

### Edge Cases
- [ ] Rapid message sending handled
- [ ] Browser back/forward works
- [ ] Page refresh maintains state (if applicable)
- [ ] Multiple tabs handled
- [ ] Session timeout handled

---

## ✅ Performance Checklist

### Load Times
- [ ] Initial load < 2 seconds
- [ ] First message processes < 1 second
- [ ] Recommendations appear < 2 seconds
- [ ] No blocking operations

### Smoothness
- [ ] No lag when typing
- [ ] Smooth animations
- [ ] No jank or stuttering
- [ ] 60fps interactions

### Resource Usage
- [ ] No memory leaks
- [ ] Efficient API calls
- [ ] Minimal re-renders
- [ ] Optimized bundle size

---

## ✅ Content & Copy Checklist

### Clarity
- [ ] Questions are clear and unambiguous
- [ ] Options are understandable
- [ ] Recommendations explain reasoning
- [ ] No jargon or technical terms
- [ ] Tone is empathetic and helpful

### Consistency
- [ ] Message style is consistent
- [ ] Terminology is consistent
- [ ] Formatting is consistent
- [ ] Brand voice maintained

### Completeness
- [ ] All necessary information provided
- [ ] No missing context
- [ ] Recommendations are complete
- [ ] Practitioner info is complete

---

## ✅ Practitioner Recommendations Checklist

### Recommendation Logic
- [ ] Acute injury → Sports Therapist/Osteopath
- [ ] Chronic pain (low severity) → Massage Therapist
- [ ] Chronic pain (higher severity) → Sports Therapist/Osteopath
- [ ] Gradual onset (no mechanism) → Massage Therapist (if low severity)
- [ ] Specific mechanism → Sports Therapist/Osteopath
- [ ] Relaxation → Massage Therapist only

### Recommendation Messages
- [ ] Explains why practitioner type is recommended
- [ ] Includes practitioner qualifications
- [ ] Mentions when practitioner type is suitable
- [ ] Clear and helpful

### Practitioner Cards
- [ ] Name displayed
- [ ] Role/type displayed
- [ ] Match score shown
- [ ] Reasons listed
- [ ] Location shown
- [ ] Experience shown
- [ ] Rating shown (if available)
- [ ] Book button works

---

## ✅ User Experience Checklist

### First Impression
- [ ] Welcoming and helpful tone
- [ ] Clear purpose
- [ ] Easy to start
- [ ] Professional appearance

### Flow
- [ ] Logical progression
- [ ] No dead ends
- [ ] Can skip/continue easily
- [ ] Options are clear

### Satisfaction
- [ ] Users understand questions
- [ ] Recommendations feel relevant
- [ ] Users trust recommendations
- [ ] Users would use again

---

## ✅ Browser Compatibility Checklist

### Chrome
- [ ] All features work
- [ ] No console errors
- [ ] Performance is good

### Firefox
- [ ] All features work
- [ ] No console errors
- [ ] Performance is good

### Safari
- [ ] All features work
- [ ] No console errors
- [ ] Performance is good

### Edge
- [ ] All features work
- [ ] No console errors
- [ ] Performance is good

---

## Testing Session Checklist

### Before Session
- [ ] Test environment ready
- [ ] Test data prepared
- [ ] Recording software set up
- [ ] Note-taking template ready
- [ ] Participant briefed

### During Session
- [ ] Observe without guiding
- [ ] Note all issues
- [ ] Time interactions
- [ ] Ask follow-up questions
- [ ] Record everything

### After Session
- [ ] Document findings
- [ ] Prioritize issues
- [ ] Create action items
- [ ] Share results
- [ ] Plan fixes

---

## Priority Levels

### P0 - Critical (Fix Immediately)
- Blocks core functionality
- Security issues
- Data loss
- Complete flow breakage

### P1 - High (Fix Soon)
- Major UX issues
- Confusing questions
- Wrong recommendations
- Performance problems

### P2 - Medium (Fix When Possible)
- Minor UX issues
- Content improvements
- Accessibility enhancements
- Polish items

### P3 - Low (Nice to Have)
- Enhancements
- Nice-to-have features
- Future improvements

---

## Quick Test Scenarios

### 5-Minute Quick Test
1. Test acute injury flow (3-4 messages)
2. Test relaxation flow (1-2 messages)
3. Check mobile layout
4. Test urgent detection
5. Verify recommendations

### 15-Minute Standard Test
1. All three main flows (acute, chronic, relaxation)
2. Urgent detection
3. Mobile responsiveness
4. Error handling (network error)
5. Recommendations display

### 30-Minute Comprehensive Test
1. All test scenarios
2. All devices
3. Accessibility testing
4. Performance testing
5. Edge cases

---

## Notes Section

### Issues Found
1. _______
2. _______
3. _______

### Positive Findings
1. _______
2. _______
3. _______

### Recommendations
1. _______
2. _______
3. _______



