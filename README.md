# CU LMS Fixer & AI Quiz Solver 🚀

<div align="center">

[![Visitors](https://komarev.com/ghpvc/?username=ankitpandeynine-cu-lms-fixer&color=blueviolet&style=flat-square&label=VISITORS)](https://github.com/ankitpandeynine/Cu-lms-fixer)
[![GitHub Downloads](https://img.shields.io/github/downloads/ankitpandeynine/Cu-lms-fixer/total?color=blue&style=flat-square&logo=github&label=DOWNLOADS)](https://github.com/ankitpandeynine/Cu-lms-fixer/releases)
[![Stars](https://img.shields.io/github/stars/ankitpandeynine/Cu-lms-fixer?style=flat-square&color=gold)](https://github.com/ankitpandeynine/Cu-lms-fixer/stargazers)
[![Forks](https://img.shields.io/github/forks/ankitpandeynine/Cu-lms-fixer?style=flat-square&color=teal)](https://github.com/ankitpandeynine/Cu-lms-fixer/network/members)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Target](https://img.shields.io/badge/Target-lms.cuchd.in-red.svg?style=flat-square)](https://lms.cuchd.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**The ultimate productivity powerhouse and study assistant for Chandigarh University students & educators.**

</div>

---

## 📌 Overview

**CU LMS Fixer & AI Quiz Solver** is a modern, lightweight Chrome extension engineered to eliminate workflow friction on Chandigarh University platforms (`lms.cuchd.in`, `students.cuchd.in`, `uims.cuchd.in`, `cuims.in`, and all CU subsidiaries). 

It combines **cutting-edge AI Quiz Solving** with **unrestricted copy-paste freedom**, **instant PDF/PPT downloads**, and **intrusive popup removal**, featuring an ultra-sleek **iOS 27 glassmorphism interface** with automatic system dark/light theme switching.

---

## 🌟 Top 4 Features

### 1. ⚡ AI Quiz Auto-Solver & Auto-Proceed (Multi-LLM Engine)
- **Instant Intelligent Answers**: Analyzes LMS quiz questions in real time using your choice of top-tier AI models (**Google Gemini**, **xAI Grok**, **NVIDIA NIM**, **OpenRouter**, or **Local LM Studio/Ollama**).
- **Auto-Fill & Selection**: Automatically marks the verified radio button for multiple-choice questions or populates clean answers into short-text inputs.
- **Hands-Free Auto-Proceed**: In auto mode, it solves each question, navigates forward via "Next page" (strictly preventing accidental backward navigation), completes the attempt summary, and confirms final submission automatically.

### 2. 🔓 Universal Copy & Paste Anti-Block Bypass
- **Total Text Freedom**: Completely neutralizes aggressive anti-copy, anti-paste, and anti-selection event blockers across all CU portals and nested iframes.
- **Unrestricted Context Menu**: Restores native right-click capabilities and overrides `user-select: none` stylesheets document-wide.
- **Restores Keyboard Shortcuts**: Guarantees unrestricted `Ctrl+C`, `Ctrl+V`, `Ctrl+X`, and `Ctrl+A` in answer areas, code blocks, and forms without interference.

### 3. 📥 1-Click PDF, PPT & Course Material Downloads
- **Direct File Downloads**: Places clean 1-click **Download** buttons directly on course cards for PDF notes, PowerPoint slides (`.ppt` & `.pptx`), Word documents (`.docx`), and `.zip` archives.
- **Topic Section Batch Downloader**: One-click **Download All** button to sequentially download every lecture presentation in an entire syllabus module.
- **Rich Material Copier**: Dual-copies Moodle reading pages to clipboard in formatted HTML (ready for Google Docs/Notion) and clean Markdown.

### 4. 🚫 Intrusive Portal Overlay & SOP Blocker
- **Auto-Skips Forced Surveys**: Automatically clears mandatory survey and feedback overlays on `students.cuchd.in` and restores page scrolling instantly.
- **Bypasses Landing Page Delays**: Automatically hides promotional slideshow banners and auto-clicks "Go to Home Page" to take you directly to your attendance and dashboard.
- **SOP / AI Library Popup Suppression**: Silences intrusive popup dialogs on the LMS while preserving manual access whenever needed.

---

## 🛠️ Installation & Setup

### Part 1: Install the Chrome Extension

1. **Clone or Download the Repository**:
   ```bash
   git clone https://github.com/ankitpandeynine/Cu-lms-fixer.git
   ```
   *(Alternatively, click **Code > Download ZIP** and extract the folder).*

2. **Open Extensions in your Chromium Browser**:
   - In **Google Chrome / Brave**: Navigate to `chrome://extensions`
   - In **Microsoft Edge**: Navigate to `edge://extensions`
   - In **Arc**: Open Settings > Extensions

3. **Enable Developer Mode**:
   - Turn on the **Developer mode** toggle in the top-right corner.

4. **Load the Extension**:
   - Click **Load unpacked** in the top-left.
   - Select the `cuchd-lms-downloads` directory containing `manifest.json`.

5. **Pin and Enjoy**:
   - Click the extensions puzzle icon (🧩) and pin **CU LMS Fixer**.

---

### Part 2: Start the AI Solver Backend (For Quiz Solving)

The AI Quiz Solver communicates with a fast, secure local Python server that manages API connections with automatic fallback and zero rate-limit freezes.

1. **Navigate to the Backend Directory**:
   ```bash
   cd script-project/JarvisAI
   ```

2. **Install Dependencies**:
   ```bash
   pip install google-genai httpx flask flask-cors
   ```

3. **Start the Quiz Solver Server**:
   ```bash
   python quiz_solver_server.py
   ```
   > The server will start locally at `http://127.0.0.1:8765`. 
   > The extension automatically checks server health and connects instantaneously.

---

## 🤖 AI API Key Guide

The extension supports 5 AI provider backends. You can enter your API keys directly in the extension's **AI Engines** tab (or in the floating on-screen widget).

| AI Engine | Best Model | How to Get Free API Key | Latency |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `gemini-2.5-flash` / `gemini-3.5-flash-lite` | [Google AI Studio](https://aistudio.google.com/app/apikey) | ⚡ Ultra Fast (~300ms) |
| **xAI Grok** | `grok-beta` | [xAI Developer Console](https://console.x.ai/) | 🚀 High Reasoning |
| **NVIDIA NIM** | `meta/llama-3.3-70b-instruct` | [NVIDIA API Catalog](https://build.nvidia.com/) (1,000 Free Credits) | 🧠 High Accuracy |
| **OpenRouter** | `google/gemini-2.5-flash` / `meta-llama/llama-3.3-70b-instruct:free` | [OpenRouter Keys](https://openrouter.ai/keys) | 🌐 Flexible Routing |
| **Local LM Studio / Ollama** | Any local model | None needed (Local endpoint `http://127.0.0.1:1234/v1`) | 🔒 100% Offline |

### Step-by-Step API Setup:
1. **Google Gemini (Recommended & Free)**:
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Click **Create API key** and copy your key.
   - Open the extension popup, click the **AI Engines** tab, select **Google Gemini**, paste your key, and pick `gemini-2.5-flash`.
2. **NVIDIA NIM (Free 1,000 API Credits)**:
   - Sign up at [build.nvidia.com](https://build.nvidia.com/).
   - Generate your API key in the top right.
   - In the extension popup, select **NVIDIA NIM** and paste your `nvapi-...` key.
3. **xAI Grok**:
   - Obtain a key from [console.x.ai](https://console.x.ai/).
   - In the extension, choose **xAI Grok** and select `grok-beta`.
4. **OpenRouter**:
   - Generate a key from [openrouter.ai/keys](https://openrouter.ai/keys).
   - Choose any model or free community model.

---

## 📱 Extension UI & Settings

The extension features an **iOS 27 glassmorphism control center** with adaptive dark/light theme switching:

### Tab 1: Home (Quick Controls)
- **AI Quiz Solver UI**: Toggles the on-page floating quiz widget on Moodle quiz pages.
- **Auto Solve & Auto Submit**: Enables hands-free forward progression through tests.
- **Unblock Copy & Paste everywhere**: System-wide protection against clipboard blockers.
- **Direct Material Downloads**: 1-click download buttons on documents and PPTs.
- **Section Batch Download**: Batch downloading for entire syllabus topics.
- **Portal Enhancements**: Survey bypass, landing page skip, and SOP dialog silencer.

### Tab 2: AI Engines (Configuration)
- **Provider Selector**: Switch seamlessly between Gemini, Grok, NVIDIA, OpenRouter, and Local LM Studio.
- **Dynamic Model Selector**: Automatically updates available models based on chosen provider.
- **Key Storage**: Securely stored in your browser's private local storage.

---

## ⚠️ Disclaimer

> [!IMPORTANT]
> **Strictly for Educational and Research Purposes Only.**
> This project has been developed as an open-source technical exploration into web accessibility, browser extension architecture, DOM automation, and LLM API integrations. 
> 
> - Users are solely responsible for adhering to their institution's academic integrity policies, codes of conduct, and terms of service.
> - The developers and contributors do not promote, endorse, or assume responsibility for academic dishonesty, unauthorized testing assistance, or misuse of this software.
> - Please use this tool responsibly as a study companion and productivity aid.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full details.

---

## ☕ Support & Author

<div align="center">

Made with ❤️ by **[Ankit Pandey](https://github.com/ankitpandeynine)**

[![GitHub](https://img.shields.io/badge/GitHub-ankitpandeynine-181717?style=for-the-badge&logo=github)](https://github.com/ankitpandeynine)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/ankitpandeynine)

*If this tool saved you time or made your student life easier, consider starring the repo or buying me a coffee!* ⭐

</div>
