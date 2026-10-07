# CU LMS Fixer & Downloader 🚀

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Target](https://img.shields.io/badge/Target-lms.cuchd.in-red.svg)](https://lms.cuchd.in)
[![GitHub Repo](https://img.shields.io/badge/GitHub-ankitpandeynine%2FCu--lms--fixer-blue.svg)](https://github.com/ankitpandeynine/Cu-lms-fixer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A powerful, lightweight Chrome extension designed for students and educators using **Chandigarh University LMS** (`https://lms.cuchd.in`), **CUIMS / Student Portals** (`https://students.cuchd.in`, `https://uims.cuchd.in`, `https://cuims.in`), and all CU subsidiaries. It guarantees full copy-paste freedom across all portals, streamlines course navigation, adds one-click PDF and PPT downloads, enables instant rich reading material copying, adds section-level batch downloads, and gives you total control over intrusive popups.

---

## ✨ Features

### 1. 🔓 Universal Copy & Paste Everywhere (Anti-Block Bypass)
- **Stops websites from blocking copy and paste**: Neutralizes aggressive anti-copy, anti-paste, and anti-selection scripts across all CU portals and subsidiaries (`*.cuchd.in`, `*.cuims.in`, `*.cuidol.in`, `*.onlinecu.in`, `*.culko.in`).
- **Full Text Selection**: Overrides CSS `user-select: none` across the entire document so you can select any text anywhere.
- **Unblocks All Shortcuts**: Guarantees working `Ctrl+C` (Copy), `Ctrl+V` (Paste), `Ctrl+X` (Cut), and `Ctrl+A` (Select All) without page script interception.
- **Unblocks Native Right-Click**: Restores the browser context menu even if pages attach `oncontextmenu="return false"`.
- **Works in Inputs & Textareas**: Allows pasting text directly into input fields, test answer areas, assignment submissions, and login forms.
- **Blocks Annoying Alerts**: Suppresses intrusive alert popups like "Right click disabled" or "Copying not allowed".
- **Frame & Subsidiary Support**: Runs in all nested iframes (`all_frames: true`) at `document_start` in both the page's MAIN world and extension ISOLATED world.

### 2. 📥 Universal PDF & PPT One-Click Downloads
- Adds a clean red **Download** button directly under each file resource card (`/mod/resource/view.php`).
- Seamlessly resolves all file formats: **PDF documents**, **PowerPoint presentations (`.ppt` & `.pptx`)**, Word files (`.docx`), and archives (`.zip`).
- Handles all Moodle display modes:
  - Embedded PDF `<object>` and `<embed>` elements.
  - Office Web Viewer and PDF.js `<iframe>` containers.
  - Moodle fallback links in `.resourceworkaround`.
  - Direct HTTP redirect responses with binary payloads.
- Downloads files directly with their original attachment filenames via Chrome's native download manager.

### 3. ⚡ Direct Page Action Bar
- When directly opening any resource page (e.g., `https://lms.cuchd.in/mod/resource/view.php?id=3393971`), the extension injects a sleek top action bar.
- Offers **[Download File]** and **[Copy Page Text]** buttons right at the top of the material, so you never need to return to the course directory just to download.

### 4. 📋 Rich One-Click Reading Material Copier
- Adds **Copy content** buttons to Moodle Page and Book activities (`/mod/page/view.php` and `/mod/book/view.php`).
- Dual-writes to clipboard:
  - **Rich HTML**: Preserves bolding, headings, tables, and lists when pasting into Google Docs, MS Word, or Notion.
  - **Clean Markdown**: Formatted plain text for text editors and code notebooks.
- Instant 0ms cached copying for previously fetched items.

### 5. 📦 Section Batch Download
- Adds a **Download All** button in topic and section headers containing multiple files.
- Downloads all presentations and documents in that section sequentially with polite throttling to avoid browser congestion, complete with real-time progress indicators.

### 6. 🚫 Smart AI / SOP Popup Controller
- **Only disable auto SOP popup** *(Default)*: Suppresses the intrusive **CU-LMS AI Tools — All Guides** popup (`#ai-lib-panel`) from popping up automatically on page load, while keeping the floating button accessible when you want it.
- **Hide and disable SOP popup (permanently)**: Completely suppresses the dialog and hides the floating button entirely.
- Zero interference with Moodle's native notifications and message drawers.

### 7. 🎓 Student Portal Survey Overlay Removal
- Automatically clears the blocking feedback overlay on `students.cuchd.in` and `uims.cuchd.in` and restores window scrolling so you can access attendance and marks immediately.

### 8. 🖼️ "Today's Highlight" Slideshow Hiding & Auto-Skip
- Automatically hides the promotional banner slideshow on `students.cuchd.in/LandingPage.aspx` and student portal pages.
- Instantly auto-clicks **"Go to Home Page"** on the landing page so you reach your student dashboard without waiting or manual clicks.

### 9. ⚙️ Interactive GUI Settings Popup
- Toggle any feature on or off via the Chrome toolbar popup.
- Preferences are saved in `chrome.storage.sync` and applied live in real-time across all open tabs.

---

## 🛠️ Installation Guide

### Prerequisites
- Google Chrome, Brave, Microsoft Edge, Arc, or any Chromium-based browser.

### Steps to Install Locally

1. **Clone or Download this repository**:
   ```bash
   git clone https://github.com/ankitpandeynine/Cu-lms-fixer.git
   ```

2. **Open Extensions page in your browser**:
   - In Chrome / Brave: go to `chrome://extensions`
   - In Edge: go to `edge://extensions`

3. **Enable Developer Mode**:
   - Toggle on **Developer mode** in the top-right corner.

4. **Load the Extension**:
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `cuchd-lms-downloads` folder (the folder containing `manifest.json`).

5. **Pin and Use**:
   - Click the puzzle icon 🧩 in your browser toolbar and pin **CU LMS Fixer**.
   - Navigate to [CU LMS](https://lms.cuchd.in) and enjoy an enhanced experience!

---

## ⚙️ Extension Settings & Configuration

| Option | Description | Default |
| :--- | :--- | :--- |
| **Unblock Copy & Paste everywhere** | Prevents CUIMS & LMS from blocking copy, paste, text selection & right-click | `Enabled` |
| **Enable download button** | Adds direct 1-click download buttons on file resources | `Enabled` |
| **Enable copy button** | Adds 1-click text copy buttons to reading material pages | `Enabled` |
| **Enable batch download** | Adds "Download All" button to section headers with multi-file topics | `Enabled` |
| **Hide and disable SOP popup (permanently)** | Completely blocks the popup & hides the SOP button | `Disabled` |
| **Only disable auto SOP popup** | Suppresses auto-popup on load, allows opening via button | `Enabled` |
| **Hide feedback overlay** | Removes blocking survey popup on students.cuchd.in | `Enabled` |
| **Hide slideshow & skip landing page** | Hides "Today's Highlight" slideshow and auto-proceeds to Home | `Enabled` |

---

## 🔒 Privacy & Security

- **100% Client-Side**: All script executions occur locally within your browser.
- **Zero Telemetry**: No user data, passwords, session tokens, or analytics are ever collected, tracked, or transmitted.
- **Official Session Passthrough**: Downloads and page copies reuse your existing authenticated browser cookies via native Chrome APIs.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

<div align="center">
  <sub>Made with ❤️ for Chandigarh University students</sub>
</div>
