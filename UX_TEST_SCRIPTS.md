# UX Test Scripts: Patient Management & History Transfer

## Moderator Instructions

### Pre-Test Setup
1. Ensure test environment is ready
2. Prepare test accounts and data
3. Set up screen recording
4. Prepare note-taking template
5. Brief participant on process

### During Testing
- Use think-aloud protocol
- Ask clarifying questions
- Avoid leading participants
- Note body language and hesitations
- Record time for each task

### Post-Test
- Conduct debrief interview
- Ask about overall experience
- Gather suggestions for improvement
- Thank participant

---

## Test Script 1: Client Views Session Notes

### Introduction
"Today we're testing how clients view their treatment notes. I'll ask you to complete some tasks, and I'd like you to think aloud as you work. There are no right or wrong answers - we're testing the system, not you."

### Task 1: Navigate to Notes
**Instruction**: "Please log in as a client and find where you can view your treatment notes."

**What to Observe**:
- Can they find the Notes section easily?
- What navigation path do they take?
- Any confusion or hesitation?

**Success Criteria**:
- User navigates to Notes page within 30 seconds
- No more than 2 clicks to reach Notes

### Task 2: View SOAP Note
**Instruction**: "Please find and open a SOAP note from one of your sessions."

**What to Observe**:
- Can they identify SOAP notes?
- Do they understand the structure?
- Can they read all sections clearly?

**Success Criteria**:
- User successfully opens a SOAP note
- All sections (Subjective, Objective, Assessment, Plan) are visible
- User can read the content

### Task 3: Understand Note Structure
**Instruction**: "Can you explain what information is in each section of this SOAP note?"

**What to Observe**:
- Do they understand SOAP structure?
- Can they differentiate between sections?
- Any confusion about content?

**Success Criteria**:
- User can identify at least 3 of 4 sections
- User understands the purpose of each section

### Follow-up Questions
1. "How easy was it to find your notes?"
2. "Is the information presented clearly?"
3. "What would make this better?"
4. "Would you use this feature regularly?"

---

## Test Script 2: Practitioner Creates Exercise Program

### Introduction
"We're testing how practitioners create exercise programs for clients. Please think aloud as you work through these tasks."

### Task 1: Access Exercise Program Creator
**Instruction**: "Please navigate to the Progress tab for a client and find where you create exercise programs."

**What to Observe**:
- Can they find the Exercise Program section?
- Do they understand the accordion structure?
- Any confusion about location?

**Success Criteria**:
- User finds Exercise Program accordion within 45 seconds
- User can expand the accordion

### Task 2: Create Program
**Instruction**: "Please create a new exercise program. Add at least 2 exercises with sets and reps."

**What to Observe**:
- Do they notice duration field is missing?
- Can they add exercises easily?
- Do they understand Sets/Reps fields?
- Any confusion about instructions field?

**Success Criteria**:
- User creates program successfully
- User adds exercises with Sets and Reps
- No attempt to find duration field
- User understands instructions are manual

### Task 3: Deliver Program
**Instruction**: "Now please create and deliver this program to the client."

**What to Observe**:
- Do they see the success message?
- Does the form reset?
- Is the UI feedback clear?
- Any confusion about what happened?

**Success Criteria**:
- Success message appears
- Form resets to initial state
- User understands program was delivered
- UI clearly shows completion

### Follow-up Questions
1. "Was the process straightforward?"
2. "Did you notice anything missing that you expected?"
3. "How clear was the feedback after creating the program?"
4. "What would improve this experience?"

---

## Test Script 3: Practitioner Transfers Full Patient Record

### Introduction
"We're testing how practitioners transfer patient records to other practitioners. This includes exercise programs and all related patient data."

### Task 1: Initiate Transfer
**Instruction**: "Please find an exercise program and start the transfer process."

**What to Observe**:
- Can they find the transfer option?
- Do they understand what transfer means?
- Any hesitation or confusion?

**Success Criteria**:
- User finds transfer option within 30 seconds
- Transfer dialog opens

### Task 2: Select Transfer Options
**Instruction**: "Please transfer this program to another practitioner, and include the full patient record."

**What to Observe**:
- Do they see the "Include Full Patient Record" checkbox?
- Do they understand what it means?
- Do they check the box?
- Can they read the transfer summary?

**Success Criteria**:
- User finds and checks the checkbox
- User understands what will be transferred
- Transfer summary is readable

### Task 3: Complete Transfer
**Instruction**: "Please complete the transfer and verify what was transferred."

**What to Observe**:
- Is the success message clear?
- Do they understand what was transferred?
- Any confusion about the process?

**Success Criteria**:
- Transfer completes successfully
- Success message shows transferred items
- User understands what happened

### Follow-up Questions
1. "Was it clear what would be transferred?"
2. "Did the summary help you understand?"
3. "How confident are you that all data transferred?"
4. "What would make this clearer?"

---

## Test Script 4: New Practitioner Requests Patient History

### Introduction
"We're testing how new practitioners request access to patient history from previous practitioners."

### Task 1: Find Request Option
**Instruction**: "You're a new therapist taking over a patient. Please find where you can request their treatment history."

**What to Observe**:
- Can they find the "Request Patient History" button?
- Is it in an expected location?
- Any confusion about what it does?

**Success Criteria**:
- User finds button within 45 seconds
- Button location makes sense
- User understands its purpose

### Task 2: Create Request
**Instruction**: "Please request the patient history from a previous practitioner."

**What to Observe**:
- Can they select a previous practitioner?
- Do they understand the transfer summary?
- Do they add request notes?
- Any confusion about the process?

**Success Criteria**:
- User selects a practitioner
- User reviews transfer summary
- User submits request successfully
- Request appears in their list

### Task 3: Check Request Status
**Instruction**: "Please check the status of your request."

**What to Observe**:
- Can they find their requests?
- Is the status clear?
- Can they understand pending vs. approved/denied?

**Success Criteria**:
- User finds request in "My Requests"
- Status is clearly displayed
- User understands what status means

### Follow-up Questions
1. "Was it easy to find how to request history?"
2. "Did you understand what you were requesting?"
3. "Is the status tracking clear?"
4. "What would make this process better?"

---

## Test Script 5: Previous Practitioner Approves Request

### Introduction
"We're testing how previous practitioners receive and approve history requests."

### Task 1: Find Incoming Requests
**Instruction**: "You're a previous practitioner. Please find requests for patient history."

**What to Observe**:
- Can they find incoming requests?
- Is the location intuitive?
- Do they understand what requests are for?

**Success Criteria**:
- User finds "History Requests" tab
- Incoming requests are visible
- User understands what they're seeing

### Task 2: Review Request
**Instruction**: "Please review a pending request and see what would be transferred."

**What to Observe**:
- Can they open the request?
- Do they understand the transfer summary?
- Can they read request notes?
- Any concerns about what's being shared?

**Success Criteria**:
- User opens request details
- Transfer summary is clear
- User understands what will be transferred

### Task 3: Approve Request
**Instruction**: "Please approve this request and add any notes you think are relevant."

**What to Observe**:
- Do they understand approval means?
- Can they add response notes?
- Is the approval process clear?
- Do they see confirmation?

**Success Criteria**:
- User approves request
- Response notes can be added
- Success message appears
- User understands data was transferred

### Follow-up Questions
1. "Was it clear what you were approving?"
2. "Did the transfer summary help you decide?"
3. "How confident are you in the approval process?"
4. "What information would help you make this decision?"

---

## Scoring Rubric

### Task Completion
- **4 - Excellent**: Completed without assistance, no errors
- **3 - Good**: Completed with minor hesitation, self-corrected
- **2 - Fair**: Completed with assistance or multiple attempts
- **1 - Poor**: Could not complete, significant confusion
- **0 - Failed**: Task abandoned

### Usability
- **4 - Excellent**: Intuitive, no confusion
- **3 - Good**: Mostly clear, minor confusion
- **2 - Fair**: Some confusion, needs improvement
- **1 - Poor**: Significant confusion
- **0 - Failed**: Completely unclear

### Error Recovery
- **4 - Excellent**: Errors are clear, easy to recover
- **3 - Good**: Errors are mostly clear
- **2 - Fair**: Some error messages unclear
- **1 - Poor**: Errors are confusing
- **0 - Failed**: No error recovery possible

### Overall Satisfaction
- **4 - Excellent**: Would definitely use
- **3 - Good**: Would use with minor improvements
- **2 - Fair**: Would use but needs work
- **1 - Poor**: Unlikely to use
- **0 - Failed**: Would not use

---

## Debrief Template

### Post-Test Interview
1. **Overall Experience**: "How would you describe your overall experience?"
2. **Ease of Use**: "How easy or difficult was it to complete these tasks?"
3. **Most Confusing**: "What was the most confusing part?"
4. **Most Helpful**: "What was the most helpful or clear part?"
5. **Missing Features**: "What features or information were you expecting to see?"
6. **Improvements**: "What would you change or improve?"
7. **Likelihood to Use**: "How likely are you to use these features regularly?"

### Notes Section
- Key pain points observed
- Positive feedback
- Suggestions for improvement
- Priority issues to address
- Screenshots/videos of issues
