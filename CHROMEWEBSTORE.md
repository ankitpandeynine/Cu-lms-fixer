# Chrome Web Store Listing — CU-LMS Fixer

> Last Updated: 2026-09-15

## Store Listing

**Extension Name**
CU-LMS Fixer

**Short Description**
Unblock copy & paste everywhere, one-click PDF/PPT downloads, section batch downloads, and popup controls across CU LMS, CUIMS, and portals.

**Detailed Description**
CU-LMS Fixer is a lightweight productivity extension built specifically for students and faculty of Chandigarh University using the CU Learning Management System (lms.cuchd.in), CUIMS / Student Portals (students.cuchd.in, uims.cuchd.in, cuims.in), and all CU subsidiaries.

Key Features:
- Universal Copy & Paste Everywhere: Stops websites from blocking copy and paste! Unlocks text selection, right-click context menu, clipboard operations, and shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A) across CUIMS, LMS, and all subsidiaries.
- One-Click File Downloads: Adds direct download buttons to course cards for all PDF documents, PowerPoint presentations (.ppt and .pptx), Word files, and course attachments. Resolves embedded viewers, objects, and redirect links automatically.
- Direct Page Action Bar: When viewing a resource or reading page directly, a top action bar lets you download the file or copy the text without returning to the course outline.
- Rich One-Click Content Copier: Instantly copies reading materials and notes to your clipboard with clean structured formatting (preserving headings, lists, and tables for easy pasting into Docs or Notion).
- Batch Section Downloads: Download all presentations and PDFs in a course topic or unit with a single click and real-time progress indicators.
- Smart SOP / AI Popup Controller: Stops the intrusive "CU-LMS AI Tools" popup from automatically opening on every page navigation while keeping the floating button available when you need it.
- Student Portal Survey Cleaner: Automatically removes the persistent feedback overlay and backdrop lock on students.cuchd.in so you can access your portal immediately.

How to Use:
1. Install the extension.
2. Log in to CU LMS (lms.cuchd.in) as normal.
3. You will see red "Download" buttons next to lecture resources, "Copy content" next to reading items, and a "Download All" option on multi-file sections.
4. Customize your preferences anytime by clicking the extension icon in your Chrome toolbar.

Privacy & Security:
CU-LMS Fixer is 100% client-side and open source. It never collects, tracks, stores, or transmits your personal data, credentials, or browsing history. All requests use your existing active browser session.

Support & Feedback:
Open source project hosted on GitHub: https://github.com/ankitpandeynine/Cu-lms-fixer

**Category**
Productivity

**Single Purpose**
Adds one-click download buttons for PDFs and PPTs, reading material text copy buttons, and popup controls on Chandigarh University LMS and student portals.

**Primary Language**
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|------------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 | 1280×800 | 🟡 Needs update | `screenshots/1-course-downloads.png` |
| Screenshot 2 | 1280×800 | 🟡 Needs update | `screenshots/2-direct-action-bar.png` |
| Screenshot 3 | 1280×800 | 🟡 Needs update | `screenshots/3-popup-settings.png` |
| Small Promo Tile | 440×280 | ⬜ Not created | `promo/promo-small.png` |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `downloads` | permissions | Initiates native file downloads with original filenames when the user clicks the "Download" or "Download All" buttons on PDF and PPT resources. |
| `clipboardWrite` | permissions | Writes cleaned reading material content to the user's system clipboard when they click the "Copy content" button. |
| `storage` | permissions | Persists the user's toggle preferences (e.g. enabling/disabling download buttons, SOP popup suppression, copy-paste unblocking) and synchronizes them across browser tabs. |
| `*://*.cuchd.in/*` | host_permissions | Injects content scripts across CU LMS, CUIMS, and portals to enable universal copy-paste, download buttons, and suppress intrusive popups. |
| `*://*.cuims.in/*` | host_permissions | Injects content scripts to unblock copy-paste and suppress forced survey dialogs on CUIMS portals. |
| `*://*.cuidol.in/*` | host_permissions | Injects content scripts on CU Distance and Online learning portals to unblock copy-paste and provide downloads. |
| `*://*.onlinecu.in/*` | host_permissions | Injects content scripts on CU Online degree portals to unblock copy-paste and provide downloads. |
| `*://*.culko.in/*` | host_permissions | Injects content scripts on CU Lucknow campus portals to unblock copy-paste and provide downloads. |
| `*://*.chandigarhuniversity.ac.in/*` | host_permissions | Injects content scripts on official university portals to ensure unblocked copy-paste and selection. |

---

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** No.

The extension operates completely on-device. No telemetry, analytics, cookies, passwords, or personal data are collected or transmitted to external servers.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Distribution
- **Visibility**: Public
- **Regions**: All regions
- **Pricing**: Free

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.7.0 | 2026-09-26 | Universal copy & paste unblocker across all CU portals, CUIMS, LMS, and subsidiaries; unblocks text selection, right-click context menu, input field pasting, and keyboard shortcuts; expanded host permissions for all CU subsidiaries. | Ready |
| 1.6.0 | 2026-09-15 | Added comprehensive PDF and PPT/PPTX file resolution, direct page action bars for resource and reading views, rich 1-click clipboard copying, and section batch downloading. | Published |
| 1.5.2 | 2026-09-05 | SOP popup controls and students.cuchd.in feedback overlay dismissal. | Published |
| 1.4.0 | 2026-08-24 | Initial release with basic download and copy buttons. | Published |
