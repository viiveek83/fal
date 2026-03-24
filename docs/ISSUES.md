# FAL — Known Issues & Fixes Tracker

Running document for bugs and improvements identified during testing. Add new issues as they're found.

---

## Open Issues

### ISSUE-001 — Admin must be a player in their own league
**Status:** Open
**Found:** 2026-03-24
**Area:** League Creation / Admin

**Description:**
When creating a league as an admin, the admin is not automatically added as a player/team member. The admin should be required to be part of the league they create — either by auto-enrolling them, or by blocking league creation unless the admin also registers a team.

**Expected behaviour:** Admin creates a league and is automatically enrolled as a participant, or is prompted to register their team before the league goes live.
**Actual behaviour:** Admin can create a league without being a player in it.

---

### ISSUE-002 — Cannot create a second league after creating the first
**Status:** Open
**Found:** 2026-03-24
**Area:** League Creation / Admin

**Description:**
After successfully creating one league, attempting to create a second league fails. It is unclear whether this is a UI bug (form not resetting), a backend constraint (one league per admin), or a session/state issue.

**Expected behaviour:** An admin should be able to create multiple leagues.
**Actual behaviour:** Second league creation is blocked or fails silently.

---

## Resolved Issues

_None yet._

---

## How to Use This Document

- Add new issues under **Open Issues** with the next `ISSUE-XXX` number
- Include: status, date found, area, description, expected vs actual behaviour
- Move to **Resolved Issues** when fixed, with fix date and commit reference
