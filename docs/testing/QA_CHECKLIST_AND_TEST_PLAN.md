# QA Checklist & Automated Testing Plan

This document is the single source for **manual QA** and **CI alignment**. It covers: profile management, practitioner dashboard, diary/client labeling, booking flow, messaging, email system (Resend/Supabase), body maps, notes status, goals, client profile, account preferences, guest-to-client conversion, CSP (Vercel), and marketplace visibility.

Use it for manual test runs, regression checks, and as a reference when adding or updating automated tests.

**See also:** [QA_EMAIL_GUEST_LOCATION_CHECKLIST.md](QA_EMAIL_GUEST_LOCATION_CHECKLIST.md) for detailed steps on email system, guest logic, and clinic/mobile/hybrid booking location.

---

## 1. Profile Management Testing

### Manual QA Checklist

- [ ] Profile loads correctly without console errors.
- [ ] Editing profile fields does not cause input glitches.
- [ ] `useEffect` does not reset input values while typing.
- [ ] Save button persists all profile fields correctly.
- [ ] Refreshing the page retains saved data.
- [ ] Profile updates sync with **Supabase in real time**.
- [ ] Marketplace profile reflects updates instantly.
- [ ] Liability insured field:
  - [ ] Can be toggled.
  - [ ] Saves successfully.
  - [ ] Persists after refresh.
  - [ ] Displays correctly on public profile.

### Automated Tests (Playwright / Cypress)

- Test profile edit flow.
- Assert field values persist after refresh.
- Validate Supabase response after save.

Example:

```javascript
test("profile edits persist", async ({ page }) => {
  await page.goto("/profile");
  await page.fill('[name="phone"]', "07123456789");
  await page.click('button:has-text("Save")');
  await page.reload();
  await expect(page.locator('[name="phone"]')).toHaveValue("07123456789");
});
```

---

## 2. Practitioner Dashboard Testing

### Manual QA

- [ ] Recent Activity appears near the top.
- [ ] Dashboard redirects load at the top of the page.
- [ ] No forced scroll to bottom.
- [ ] Notification cards appear correctly.
- [ ] Notification cards include **dismiss (X) button**.
- [ ] Clicking X removes notification.

### Automated Tests

```javascript
test("dashboard loads at top", async ({ page }) => {
  await page.goto("/dashboard");
  const scrollPosition = await page.evaluate(() => window.scrollY);
  expect(scrollPosition).toBe(0);
});
```

---

## 3. Practitioner Diary / Client Logic

### Manual QA

- [ ] Guest bookings appear as **Guest**.
- [ ] Registered users appear as **Client**.
- [ ] No guest labeled incorrectly as client.
- [ ] Client entries link to profiles.
- [ ] Guest entries do not link to client records.

### Automated Tests

- Guest booking → diary shows Guest.
- Registered booking → diary shows Client.

---

## 4. Booking System Testing

### Manual QA

**Attempt booking but wait >5 minutes**

Expected:

- Booking expires.
- Does NOT appear as confirmed.
- Does NOT create client record.

Check:

- [ ] Expired bookings removed.
- [ ] No false entries in practitioner clients.
- [ ] No confirmed bookings created.

### Automated Tests

- Booking timeout test: simulate booking but do not confirm; assert `status != confirmed`.

---

## 5. Messaging System (Guest + Practitioner)

### Manual QA

#### Practitioner → Guest

- [ ] Message appears in messaging UI.
- [ ] Email notification sent to guest.
- [ ] Email contains correct content.

#### Guest → Practitioner

- [ ] Message appears in practitioner inbox.
- [ ] Notification triggered.

### Automated Tests

- Mock email sending: `sendMessage(practitioner, guest)` → assert `emailSent === true`.

---

## 6. Email System (Resend + Supabase)

### Manual QA

**Booking confirmation email**

- [ ] Sent to guest.
- [ ] Contains location.
- [ ] Location includes clickable maps link.
- [ ] "View booking details" link works.
- [ ] Guest does NOT need login.

**Payment confirmation**

- [ ] Not sent.

**Message emails**

- [ ] Trigger when practitioner messages guest.

### Automated Tests

- Integration test with Resend API (or mock).
- Test triggers: `booking_confirmed`, `message_sent`.
- Check logs.

---

## 7. Body Map Testing

### Manual QA

- [ ] Body map shows **X markers instead of numbers**.
- [ ] Markers appear correctly when clicking.
- [ ] Multiple markers display correctly.
- [ ] Markers visible on saved forms.

**Practitioner view**

- [ ] Front and back maps display **side-by-side**.
- [ ] Markings visible.
- [ ] Read-only mode works.

### Automated Tests

- Visual regression: screenshot body map, compare baseline.

---

## 8. Notes System Testing

### Manual QA

Notes statuses:

| Action           | Expected Status |
| ---------------- | --------------- |
| No notes created | Not Started     |
| Save note        | In Progress     |
| Click Complete   | Completed       |

Check:

- [ ] Save does NOT mark as completed.
- [ ] Status persists after refresh.

### Automated Tests

- `createNote()` → `save()` → expect `status === "In Progress"`.

---

## 9. Goals System

### Manual QA

- [ ] Goals popup does NOT contain Target Value.
- [ ] Goals can still be created.
- [ ] Goals save successfully.
- [ ] Layout not broken.

---

## 10. Professional Body Field

### Manual QA

- [ ] Dropdown contains "Other".
- [ ] Selecting "Other" shows text input.
- [ ] Text input required.
- [ ] Saved value appears on profile.

---

## 11. Client Profile Area

### Manual QA

**Client profile tab**

- [ ] Profile tab visible.
- [ ] Personal details editable.
- [ ] Preferences editable.

**Account preferences**

Check toggles:

| Setting  | Email | Message |
| -------- | ----- | ------- |
| Updates  | ✓     | ✓       |
| Bookings | ✓     | ✓       |
| Messages | ✓     | ✓       |

Ensure:

- [ ] Preferences saved in Supabase.
- [ ] Notification system respects them.

---

## 12. Supabase Guest → Client Conversion

### Manual QA

Scenario:

1. Guest books appointment.
2. Later creates account using same email.

Check:

- [ ] No Supabase error.
- [ ] Account created.
- [ ] Booking linked to account.
- [ ] No duplicate records.

---

## 13. CSP Security Testing (Vercel)

### Manual QA

Check site with CSP enabled:

- [ ] Dropdowns open.
- [ ] Modals work.
- [ ] Popovers work.
- [ ] No console CSP errors.

Console check: "Refused to execute script because of CSP" should not appear.

---

## 14. Marketplace Visibility

### Manual QA

**Qualification uploads**

Test files:

- [ ] JPG
- [ ] PNG
- [ ] PDF
- [ ] DOCX

Check:

- [ ] Upload success.
- [ ] Visible on public profile.
- [ ] File preview works.

---

## Critical Regression Tests

Run these before every deploy:

1. Booking confirmation
2. Guest booking flow
3. Profile save
4. Messaging email triggers
5. Diary client labeling
6. Notes status system
7. Body map rendering
8. Supabase data sync
9. CSP UI functionality

---

## CI Automated Test Suite

**Recommended stack**

- Playwright
- Jest
- Supabase testing environment
- Resend email mocking

**CI pipeline**

1. Unit tests
2. API tests
3. UI tests
4. Email integration tests
5. Security tests

**Existing scripts (peer-care-connect)**

- `npm run test:unit` – Jest unit tests
- `npm run test:integration` – Jest integration tests
- `npm run test:e2e` – Playwright e2e
- `npm run test:user-journey` – Playwright user journey
- `npm run test:oauth` – Playwright OAuth flows
- `npm run test:ci` – unit + integration + e2e (CI)

The example tests in this checklist can be implemented as Playwright or Jest specs over time.

---

## Mapping to Existing Tests

| Checklist area   | Existing coverage / script             |
| ---------------- | -------------------------------------- |
| Profile          | Auth/profile e2e; OAuth flows          |
| Dashboard        | E2e / user journey                     |
| Diary / client   | Practice/client flows                  |
| Booking          | `test:user-journey`, marketplace tests |
| Messaging        | Manual / future e2e                    |
| Email            | Manual / integration (mock Resend)     |
| Body map         | Manual / future visual regression      |
| Notes            | Manual / future e2e                    |
| Goals            | Manual                                 |
| Client profile   | Manual / client e2e                    |
| Guest conversion | Manual / auth e2e                      |
| CSP              | Manual (browser console)               |
| Marketplace      | Marketplace / discovery test scripts   |

---

## Recommended Next Tests

- **Profile edit persist** (Playwright): Edit profile, save, reload; assert field values.
- **Dashboard scroll position** (Playwright): Load dashboard; assert `scrollY === 0`.
- **Diary guest vs client label** (e2e or API): Create guest vs client booking; assert label in diary.
- **Booking confirmation email trigger** (integration): Mock Resend; complete booking; assert send-email called with correct type.
- **Notes status after save** (e2e): Save note without Complete; assert status "In Progress".

---

## Recommended Automated Coverage Target

| Area           | Coverage |
| -------------- | -------- |
| Booking system | 90%      |
| Messaging      | 85%      |
| Profile        | 95%      |
| Dashboard      | 80%      |
| Emails         | 85%      |
