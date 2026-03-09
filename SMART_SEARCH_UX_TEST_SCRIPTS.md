# Smart Search UX Test Scripts

## Moderator Guide

### Pre-Test Setup
1. Ensure test environment is ready
2. Have test scenarios prepared
3. Prepare screen recording software
4. Set up note-taking template
5. Brief participant on process

### During Test
- Observe, don't guide (unless stuck)
- Ask "What are you thinking?" when appropriate
- Note confusion points
- Time key interactions
- Record all issues

### Post-Test
- Ask follow-up questions
- Get satisfaction rating
- Document findings immediately

---

## Test Script 1: Acute Injury Flow

### Setup
- Clear browser cache
- Navigate to Marketplace
- Open Smart Search tab

### Instructions to Participant
"Imagine you twisted your ankle during a soccer game yesterday. You're looking for help. Use the Smart Search to find a practitioner."

### Step-by-Step Observations

**Step 1: Initial Message**
- [ ] Does user see: "I want to understand your pain..."
- [ ] Are 3 options visible: "I'm in pain", "I'm currently injured", "I want relaxation/stress relief"
- [ ] Time to first interaction: _____ seconds
- [ ] User selects: "I'm in pain" / "I'm currently injured" / Other: _______

**Step 2: Pain Type Selection**
- [ ] Does system ask: "Select which applies to you?"
- [ ] Are options visible: "I've sustained a recent injury causing pain", "I've been in pain for a period of more than 2 months"
- [ ] User selects: "Recent injury" / "Chronic" / Other: _______
- [ ] Time to selection: _____ seconds

**Step 3: Healthcare Professional Check (Acute Only)**
- [ ] Does system ask about healthcare professional?
- [ ] Message includes: "Have you been seen by a healthcare professional..."
- [ ] User answers: Yes / No / Other: _______
- [ ] Time to answer: _____ seconds

**Step 4: Recommendations**
- [ ] Recommendations appear within 2 seconds
- [ ] Message explains why practitioner type is recommended
- [ ] Sports Therapist or Osteopath recommended (for acute)
- [ ] Practitioner cards display correctly
- [ ] User can click "Book" button
- [ ] Total messages: _____
- [ ] Total time: _____ seconds

### Success Criteria
- ✅ Reaches recommendations in 3-4 messages
- ✅ Healthcare professional question asked for acute
- ✅ Appropriate practitioners recommended
- ✅ Clear explanation provided

### Follow-Up Questions
1. "How clear were the questions?"
2. "Did the recommendations make sense?"
3. "Would you trust these recommendations?"
4. "What would you change?"

### Scoring
- **Clarity**: 1-5 (5 = very clear)
- **Helpfulness**: 1-5 (5 = very helpful)
- **Speed**: 1-5 (5 = very fast)
- **Overall**: 1-5 (5 = excellent)

---

## Test Script 2: Chronic Pain Flow

### Setup
- Clear browser cache
- Navigate to Marketplace
- Open Smart Search tab

### Instructions to Participant
"Imagine you've had back pain for 6 months from sitting at a desk all day. Use the Smart Search to find help."

### Step-by-Step Observations

**Step 1: Initial Message**
- [ ] User selects: "I'm in pain"
- [ ] Time to selection: _____ seconds

**Step 2: Pain Type Selection**
- [ ] User selects: "I've been in pain for a period of more than 2 months"
- [ ] Time to selection: _____ seconds

**Step 3: Recommendations**
- [ ] Recommendations appear quickly
- [ ] Does NOT ask healthcare professional question
- [ ] Appropriate practitioners recommended
- [ ] Message mentions chronic pain context
- [ ] Total messages: _____
- [ ] Total time: _____ seconds

### Success Criteria
- ✅ Reaches recommendations in 2-3 messages
- ✅ No healthcare professional question
- ✅ Appropriate recommendations based on severity
- ✅ Fast flow

### Follow-Up Questions
1. "Was this faster than you expected?"
2. "Did you feel the system understood your situation?"
3. "Were the recommendations relevant?"

---

## Test Script 3: Relaxation Flow

### Setup
- Clear browser cache
- Navigate to Marketplace
- Open Smart Search tab

### Instructions to Participant
"You're feeling stressed and overwhelmed. You want a massage to relax. Use the Smart Search."

### Step-by-Step Observations

**Step 1: Initial Message**
- [ ] User selects: "I want relaxation/stress relief"
- [ ] Time to selection: _____ seconds

**Step 2: Recommendations**
- [ ] Recommendations appear immediately (1-2 messages)
- [ ] Only Massage Therapists recommended
- [ ] Message explains relaxation benefits
- [ ] No unnecessary questions
- [ ] Total messages: _____
- [ ] Total time: _____ seconds

### Success Criteria
- ✅ Fast-track to recommendations (1-2 messages)
- ✅ Only massage therapists shown
- ✅ Clear relaxation message
- ✅ No extra questions

### Follow-Up Questions
1. "Was this quick enough?"
2. "Did you get what you needed?"
3. "Any questions you expected but didn't see?"

---

## Test Script 4: Urgent Medical Detection

### Setup
- Clear browser cache
- Navigate to Marketplace
- Open Smart Search tab

### Instructions to Participant
"Imagine you're experiencing numbness and losing sensation in your feet. Use the Smart Search."

### Step-by-Step Observations

**Step 1: User Describes Symptoms**
- [ ] User mentions neural symptoms (numbness, losing sensation)
- [ ] System processes message

**Step 2: Urgent Warning**
- [ ] Urgent medical attention warning appears
- [ ] Message includes: "seek urgent medical attention"
- [ ] Mentions neurological issues
- [ ] Provides options to continue or seek help
- [ ] Time to warning: _____ seconds

**Step 3: User Response**
- [ ] User can choose to continue or seek medical attention
- [ ] If continues, recommendations still provided
- [ ] Warning is clear but not blocking

### Success Criteria
- ✅ Detects neural symptoms correctly
- ✅ Shows urgent warning
- ✅ Does NOT trigger for high pain scores alone
- ✅ User can still continue if desired

### Follow-Up Questions
1. "Was the warning clear?"
2. "Did it feel appropriate?"
3. "Would you follow the advice?"

---

## Test Script 5: Mobile Experience

### Setup
- Use mobile device (phone/tablet)
- Navigate to Marketplace
- Open Smart Search tab

### Observations

**Layout & Responsiveness**
- [ ] Chat interface fits screen
- [ ] Messages are readable
- [ ] Suggestions are tappable (not too small)
- [ ] Input field is accessible
- [ ] Keyboard doesn't cover input
- [ ] Scrolling is smooth

**Interactions**
- [ ] Tapping suggestions works
- [ ] Typing is comfortable
- [ ] Send button is accessible
- [ ] Recommendations display correctly
- [ ] Book buttons are tappable

**Performance**
- [ ] No lag when typing
- [ ] Messages appear quickly
- [ ] Smooth animations
- [ ] No crashes

### Success Criteria
- ✅ Fully functional on mobile
- ✅ Comfortable to use
- ✅ No usability issues
- ✅ Performance is good

---

## Test Script 6: Accessibility Testing

### Screen Reader Testing

**Setup**
- Enable NVDA/JAWS/VoiceOver
- Navigate to Smart Search
- Use keyboard only

### Observations

**Navigation**
- [ ] Can navigate with Tab key
- [ ] Focus indicators visible
- [ ] Suggestions are keyboard accessible
- [ ] Can activate suggestions with Enter/Space
- [ ] Input field is accessible
- [ ] Send button is accessible

**Screen Reader Announcements**
- [ ] Messages are announced
- [ ] Suggestions are announced
- [ ] Recommendations are announced
- [ ] Practitioner cards are navigable
- [ ] Buttons have proper labels

**ARIA Labels**
- [ ] Proper ARIA labels on interactive elements
- [ ] Role attributes correct
- [ ] Live regions for dynamic content
- [ ] Status messages announced

### Success Criteria
- ✅ Fully keyboard navigable
- ✅ Screen reader compatible
- ✅ All content accessible
- ✅ No barriers

---

## Test Script 7: Error Handling

### Test Cases

**Network Error**
1. Disconnect network mid-conversation
2. Send message
3. Observe error handling
- [ ] Clear error message
- [ ] Option to retry
- [ ] No data loss
- [ ] Can continue after reconnection

**Invalid Input**
1. Send empty message
2. Send very long message
3. Send special characters
- [ ] Handles gracefully
- [ ] Clear feedback
- [ ] No crashes

**Rapid Messages**
1. Send multiple messages quickly
2. Observe system response
- [ ] Handles queue correctly
- [ ] No duplicate responses
- [ ] Maintains context

---

## Scoring Rubric

### Overall Score Calculation
- **Clarity**: 25%
- **Helpfulness**: 25%
- **Speed**: 20%
- **Accessibility**: 15%
- **Error Handling**: 15%

### Rating Scale
- **5**: Excellent - No issues, exceeds expectations
- **4**: Good - Minor issues, meets expectations
- **3**: Acceptable - Some issues, mostly works
- **2**: Poor - Significant issues, needs work
- **1**: Unacceptable - Major issues, broken

---

## Debrief Template

### Participant Information
- Name: _______
- Age: _______
- Tech Comfort: Low / Medium / High
- Test Date: _______

### Test Results
- Scenario: _______
- Completion: Yes / No
- Time to Complete: _____ seconds
- Messages Sent: _____
- Issues Found: _____

### Scores
- Clarity: _____ / 5
- Helpfulness: _____ / 5
- Speed: _____ / 5
- Overall: _____ / 5

### Key Findings
1. _______
2. _______
3. _______

### Recommendations
1. _______
2. _______
3. _______

---

## Notes for Moderators

- **Don't help too much** - Let users struggle a bit to find real issues
- **Ask "why"** - Understand reasoning behind actions
- **Note body language** - Frustration, confusion, delight
- **Time everything** - Speed is a key metric
- **Record everything** - Screenshots, videos, notes
- **Be neutral** - Don't influence with tone or hints



