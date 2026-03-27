# Human Test Plan: App Admin Dashboard

## Prerequisites
- Deploy to preview/staging environment
- `APP_ADMIN_EMAILS` set to `viiveek@gmail.com,shaheeldholakia@gmail.com`
- At least one match in SCHEDULED status in the database
- Access to two accounts: one app admin, one regular user

---

## 1. Access Control

### 1.1 Non-admin cannot access /app-admin
1. Log in as a regular user (not in APP_ADMIN_EMAILS)
2. Navigate to `/app-admin`
3. **Expected:** "Access denied" message with link back to home

### 1.2 Non-admin does not see Admin tab
1. Log in as a regular user
2. Check bottom navigation bar
3. **Expected:** Only 4 tabs visible (Home, Lineup, Players, League). No "Admin" tab.

### 1.3 App admin sees Admin tab
1. Log in as viiveek@gmail.com
2. Check bottom navigation bar
3. **Expected:** 5th "Admin" tab with shield icon visible

### 1.4 App admin can access /app-admin
1. Log in as viiveek@gmail.com
2. Tap "Admin" tab or navigate to `/app-admin`
3. **Expected:** Dashboard loads with "Import Scores" and "Sync Player Teams" sections

---

## 2. Import Scores

### 2.1 Match status table displays correctly
1. Navigate to `/app-admin`
2. **Expected:** Match status table shows all matches with colored status pills:
   - SCHEDULED: grey
   - COMPLETED: blue
   - SCORED: green
   - ERROR: red

### 2.2 Ready-to-score badge
1. **Expected:** Badge above Import button shows count of COMPLETED matches
2. If 0 COMPLETED: "No matches ready to score" (grey)
3. If N COMPLETED: "N matches ready to score" (blue)

### 2.3 Import — nothing to score
1. Ensure no COMPLETED matches exist
2. Click "Import Scores"
3. **Expected:** Button shows "Importing..." with spinner, then message "No matches ready to score"

### 2.4 Import — successful scoring
1. Wait for a real match to finish (or manually set a match to COMPLETED status)
2. Click "Import Scores"
3. **Expected:**
   - Button disabled with "Importing..." text (10-30 seconds)
   - Green success message: "Scored N matches"
   - Match status pills update to SCORED
   - Ready-to-score count decreases

### 2.5 Recalculate error match
1. If any match shows ERROR status
2. Click "Recalculate" link on that row
3. **Expected:** Match resets and re-scores, pill updates

### 2.6 Operational guidance
1. **Expected:** Tip text visible: "SportMonks data is usually complete 15-30 minutes after match end."

---

## 3. Sync Player Teams

### 3.1 Check for updates — no changes
1. Click "Check for Updates"
2. **Expected:** Button shows "Checking..." with spinner (5-10 seconds)
3. **Expected:** Green check: "All player teams are up to date"

### 3.2 Check for updates — changes found
1. If player trades have occurred since last sync
2. Click "Check for Updates"
3. **Expected:**
   - Changes table appears: Player | From | To | Fantasy Teams
   - Count of changes shown
   - "Apply Changes" button appears (orange)

### 3.3 Apply changes — confirmation
1. After changes are shown, click "Apply Changes"
2. **Expected:** Bottom sheet slides up with:
   - "Apply N team changes and M new players?"
   - "Fantasy rosters, lineups, and scores are NOT affected"
   - Cancel and Apply buttons

### 3.4 Apply changes — cancel
1. Click "Cancel" on confirmation sheet
2. **Expected:** Sheet dismisses, changes table still visible

### 3.5 Apply changes — confirm
1. Click "Apply" on confirmation sheet
2. **Expected:**
   - Sheet closes
   - Green success message
   - Table clears, shows "All player teams are up to date"

### 3.6 Apply changes — error
1. Disconnect network, click Apply
2. **Expected:** Red error message, table remains for retry

---

## 4. Mobile Responsiveness

### 4.1 Dashboard on mobile (393px)
1. Open `/app-admin` on iPhone or Chrome DevTools (393px width)
2. **Expected:** All content fits within viewport, no horizontal scroll
3. **Expected:** Cards, tables, buttons properly sized for mobile

### 4.2 Confirmation sheet on mobile
1. Open confirmation sheet on mobile
2. **Expected:** Sheet fills bottom of screen, text readable, buttons tappable

---

## 5. Edge Cases

### 5.1 Multiple rapid Import clicks
1. Click "Import Scores" rapidly multiple times
2. **Expected:** Button disabled after first click, only one request sent

### 5.2 Concurrent sync apply (if possible)
1. Open `/app-admin` in two tabs
2. Click "Apply Changes" in both simultaneously
3. **Expected:** One succeeds, other shows "Sync already in progress" error (409)

### 5.3 Session expiry
1. Let session expire while on admin page
2. Try any action
3. **Expected:** Redirected to login or appropriate error
