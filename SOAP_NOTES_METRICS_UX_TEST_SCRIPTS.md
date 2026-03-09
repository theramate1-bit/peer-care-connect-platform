# SOAP Notes & Metrics Removal UX Test Scripts

**Date**: January 2025  
**Version**: 1.0  
**For**: UX Testing Moderators

---

## 📋 Pre-Test Setup

### Before Each Session
1. ✅ Verify test environment is ready
2. ✅ Confirm test accounts are set up
3. ✅ Check mobile devices are charged
4. ✅ Prepare screen recording software
5. ✅ Have note-taking materials ready
6. ✅ Review test scenario objectives

### Introduction Script
> "Thank you for participating in today's usability test. We're testing some improvements to our SOAP notes and progress tracking features. Your feedback will help us make the platform better for all practitioners.
> 
> This is not a test of you - we're testing the system. Please think aloud as you work through the tasks. If something is confusing or doesn't work as expected, that's valuable feedback.
> 
> The session will take about 30-45 minutes. Do you have any questions before we begin?"

---

## 🎬 Test Script 1: SOAP Notes Objective Prompts

### Objective
Verify practitioners notice and understand VAS pain score and ROM measurement prompts in SOAP Notes Objective section.

### Pre-Task Questions
1. How often do you create SOAP notes? (Daily/Weekly/Monthly)
2. What objective measurements do you typically include? (Open-ended)
3. Are you familiar with VAS (Visual Analog Scale) for pain? (Yes/No)
4. How do you currently document range of motion? (Open-ended)

### Task Instructions
> "I'd like you to create a SOAP note for a client session. Please navigate to a client session and open the SOAP notes editor. When you get to the Objective section, I'd like you to read the placeholder text and tell me what you think it's asking you to include."

### What to Observe
- [ ] Does the practitioner notice the placeholder text?
- [ ] Do they read it completely?
- [ ] Do they understand what VAS means?
- [ ] Do they understand what ROM measurements should include?
- [ ] Do they find the prompts helpful or confusing?
- [ ] Do they actually include VAS and ROM in their entry?

### Follow-Up Questions
1. What did you think of the placeholder text? Was it clear?
2. Did it prompt you to include pain scores and ROM measurements?
3. Was there anything confusing about the instructions?
4. Would you change anything about the prompts?

### Success Criteria
- ✅ Practitioner notices placeholder text
- ✅ Understands VAS (0-10) reference
- ✅ Understands ROM measurement format
- ✅ Includes at least one VAS score or ROM measurement
- ✅ No major confusion or frustration

### Scoring
- **Task Completion**: Yes/No (Did they include VAS or ROM?)
- **Clarity Rating**: 1-5 (How clear were the prompts?)
- **Helpfulness Rating**: 1-5 (Did prompts help them document better?)

---

## 🎬 Test Script 2: Goal Creation Without Metrics

### Objective
Verify practitioners can create goals without the Metrics section and understand the new workflow.

### Pre-Task Questions
1. Have you used the progress tracking features before? (Yes/No)
2. Did you previously use the Metrics section? (Yes/No)
3. What types of goals do you typically set for clients? (Open-ended)

### Task Instructions
> "I'd like you to create a goal for a client. Please navigate to the client's progress tracking page and create a new goal. I want you to create a goal for reducing pain from 7/10 to 4/10."

### What to Observe
- [ ] Do they look for a Metrics tab?
- [ ] Do they notice it's missing?
- [ ] How do they react to only seeing Goals?
- [ ] Can they create the goal successfully?
- [ ] Do they understand the goal creation form?
- [ ] Any confusion about linking to metrics?

### Follow-Up Questions
1. Did you notice the Metrics section is no longer available?
2. How did you feel about that?
3. Was creating a goal straightforward?
4. Do you think goals can replace what you used metrics for?
5. Is there anything you miss about the Metrics section?

### Success Criteria
- ✅ Practitioner can create goal without confusion
- ✅ No significant frustration about missing Metrics
- ✅ Goal creation form is intuitive
- ✅ Goal is saved successfully
- ✅ Practitioner understands goal covers pain tracking

### Scoring
- **Task Completion**: Yes/No (Did they create the goal?)
- **Confusion Level**: 1-5 (1 = Very confused, 5 = No confusion)
- **Satisfaction Rating**: 1-5 (How satisfied with goal creation?)

---

## 🎬 Test Script 3: AI SOAP Generation with VAS/ROM

### Objective
Verify AI-generated SOAP notes include VAS pain scores and ROM measurements when available in transcript.

### Pre-Task Questions
1. Have you used AI SOAP note generation before? (Yes/No)
2. What do you think about AI-generated notes? (Open-ended)

### Task Instructions
> "I'd like you to generate SOAP notes from a session transcript. Please upload or use the provided transcript, generate the SOAP notes, and then review the Objective section. Tell me if you see pain scores and range of motion measurements included."

### What to Observe
- [ ] Does AI include VAS scores in Objective?
- [ ] Does AI include ROM measurements?
- [ ] Are measurements formatted correctly?
- [ ] Are measurements accurate based on transcript?
- [ ] Does practitioner find the AI output useful?

### Follow-Up Questions
1. Did the AI include pain scores and ROM measurements?
2. Were they accurate based on the transcript?
3. Was the formatting clear?
4. Would you use AI generation for this?

### Success Criteria
- ✅ AI extracts VAS scores when mentioned
- ✅ AI extracts ROM measurements when mentioned
- ✅ Formatting is consistent and clear
- ✅ Measurements are accurate
- ✅ Practitioner finds output useful

### Scoring
- **Extraction Accuracy**: 1-5 (How accurate were extractions?)
- **Formatting Quality**: 1-5 (How well formatted?)
- **Usefulness Rating**: 1-5 (How useful was the output?)

---

## 🎬 Test Script 4: Goal Extraction from SOAP Notes

### Objective
Verify goal extraction from SOAP notes works correctly without Metrics extraction.

### Pre-Task Questions
1. Have you extracted goals from SOAP notes before? (Yes/No)
2. What do you expect to see when extracting goals? (Open-ended)

### Task Instructions
> "I'd like you to extract goals from a SOAP note you've created. Please save a SOAP note that mentions client goals, then use the goal extraction feature. Review what was extracted and tell me about the process."

### What to Observe
- [ ] Does extraction work correctly?
- [ ] Are only goals extracted (no metrics)?
- [ ] Is the review modal clear?
- [ ] Can they select and add goals easily?
- [ ] Any confusion about missing metrics?

### Follow-Up Questions
1. Did the extraction work as expected?
2. Did you see any metrics in the extraction?
3. Was the review process clear?
4. Were the extracted goals accurate?

### Success Criteria
- ✅ Only goals are extracted (no metrics)
- ✅ Review modal shows only Goals tab
- ✅ Extraction is accurate
- ✅ Can select and add goals successfully
- ✅ No confusion about process

### Scoring
- **Extraction Accuracy**: 1-5 (How accurate were extractions?)
- **Process Clarity**: 1-5 (How clear was the process?)
- **Task Completion**: Yes/No (Did they successfully add goals?)

---

## 🎬 Test Script 5: Mobile SOAP Notes Entry

### Objective
Verify mobile experience for SOAP notes with new prompts is usable.

### Pre-Task Questions
1. Do you use the app on mobile devices? (Yes/No)
2. How often do you create SOAP notes on mobile? (Daily/Weekly/Rarely)

### Task Instructions
> "I'd like you to create a SOAP note on your mobile device. Please open the app, navigate to a client session, and create a SOAP note. Pay special attention to the Objective section - can you read the placeholder text clearly? Can you enter pain scores and ROM measurements easily?"

### What to Observe
- [ ] Is placeholder text readable on mobile?
- [ ] Is textarea large enough?
- [ ] Does keyboard cover important UI?
- [ ] Can they enter VAS and ROM data easily?
- [ ] Any horizontal scrolling issues?
- [ ] Is the experience smooth?

### Follow-Up Questions
1. Was the placeholder text easy to read?
2. Was it easy to enter the data?
3. Did the keyboard cause any issues?
4. Would you use this on mobile regularly?

### Success Criteria
- ✅ Placeholder text is readable
- ✅ Textarea is appropriately sized
- ✅ No keyboard covering issues
- ✅ Can enter data easily
- ✅ No major usability issues

### Scoring
- **Readability**: 1-5 (How readable was placeholder text?)
- **Usability**: 1-5 (How usable was the mobile experience?)
- **Task Completion**: Yes/No (Did they complete the task?)

---

## 🎬 Test Script 6: Goal Templates

### Objective
Verify goal templates work correctly when goals are linked to existing metrics.

### Pre-Task Questions
1. Have you used goal templates before? (Yes/No)
2. What do you think goal templates should do? (Open-ended)

### Task Instructions
> "I'd like you to create a goal and use a template. Please create a goal that links to an existing metric, then explore the goal templates feature. Select a template and tell me about the experience."

### What to Observe
- [ ] Do templates appear when metric is linked?
- [ ] Are templates easy to understand?
- [ ] Do templates suggest appropriate targets?
- [ ] Can they apply a template easily?
- [ ] Are templates helpful?

### Follow-Up Questions
1. Did the templates appear as expected?
2. Were the suggested targets appropriate?
3. Was applying a template easy?
4. Would you use templates regularly?

### Success Criteria
- ✅ Templates appear when metric linked
- ✅ Templates are easy to understand
- ✅ Target suggestions are appropriate
- ✅ Template application works smoothly
- ✅ Practitioner finds templates helpful

### Scoring
- **Template Visibility**: Yes/No (Did templates appear?)
- **Template Helpfulness**: 1-5 (How helpful were templates?)
- **Task Completion**: Yes/No (Did they apply a template?)

---

## 📊 Scoring Rubric

### Overall Task Success
- **5 - Excellent**: Task completed effortlessly, no confusion
- **4 - Good**: Task completed with minor confusion
- **3 - Acceptable**: Task completed with some difficulty
- **2 - Poor**: Task completed with significant difficulty
- **1 - Failed**: Task could not be completed

### Clarity Rating
- **5 - Very Clear**: Instructions were crystal clear
- **4 - Clear**: Instructions were mostly clear
- **3 - Somewhat Clear**: Instructions were somewhat clear
- **2 - Unclear**: Instructions were confusing
- **1 - Very Unclear**: Instructions were very confusing

### Satisfaction Rating
- **5 - Very Satisfied**: Very happy with the experience
- **4 - Satisfied**: Happy with the experience
- **3 - Neutral**: Neither satisfied nor dissatisfied
- **2 - Dissatisfied**: Unhappy with the experience
- **1 - Very Dissatisfied**: Very unhappy with the experience

---

## 📝 Debrief Template

### Post-Test Questions
1. Overall, how would you rate your experience? (1-5)
2. What did you like most about the changes?
3. What did you like least about the changes?
4. Was anything confusing or frustrating?
5. Do you have any suggestions for improvement?
6. Would you use these features regularly?
7. Is there anything you miss about the old Metrics section?
8. Do you think goals adequately replace metrics?

### Key Observations
- **Positive Observations**: 
- **Negative Observations**: 
- **Confusion Points**: 
- **Suggestions**: 

### Action Items
- [ ] Issue 1: 
- [ ] Issue 2: 
- [ ] Issue 3: 

---

## 🎯 Success Criteria Summary

### Must Have (Critical)
- ✅ SOAP Notes prompts are visible and clear
- ✅ Goal creation works without Metrics section
- ✅ Mobile experience is functional
- ✅ No major workflow disruption

### Should Have (High Priority)
- ✅ AI includes VAS/ROM in generated notes
- ✅ Goal extraction works correctly
- ✅ Goal templates function properly
- ✅ Historical metrics can be linked

### Nice to Have (Medium Priority)
- ✅ Prompts are helpful, not just visible
- ✅ Goal creation is intuitive
- ✅ Performance is acceptable
- ✅ Users prefer new workflow

---

**Next Steps**: Use these scripts during testing sessions, collect scores and observations, and compile results for analysis.



