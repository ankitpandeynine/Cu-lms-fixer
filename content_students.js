/**
 * Content script for students.cuchd.in.
 *
 * Suppresses:
 * - Forced announcement popups on the home page (e.g. #divForcePopUp, #div_libpopup, .divMessagePopUp).
 * - Compulsory Teaching & Learning feedback survey dialogs and blocking backdrops.
 *
 * Preserves:
 * - Internal user-triggered modals (e.g. Virtual ID Card, profile, timetable, document view).
 * - Sidebars and drawers (e.g. #div_celebrations, .sidenav, #mySidenav).
 * - Portal floating bot / widgets (#maindiv, #UpdateProgress1).
 */

const STUDENTS_DEFAULT_SETTINGS = {
  hideStudentsOverlay: true,
  hideLandingSlideshow: true,
};

const REQUIRED_FEEDBACK_PHRASES = [
  "teaching & learning process",
  "teaching and learning process",
];
const FEEDBACK_IDENTIFIERS = ["filling out the feedback", "dear student"];

const FORCED_OVERLAY_IDS = ["divforcepopup", "div_libpopup"];

let studentSettings = { ...STUDENTS_DEFAULT_SETTINGS };
let savedBodyLock = null;

// Track modals explicitly opened by user interaction
const userOpenedModalIds = new Set();

window.addEventListener(
  "click",
  (event) => {
    const trigger = event.target.closest(
      '[data-toggle="modal"], [data-target], a[href*="#"], button[onclick*="modal" i], [data-toggle="sidenav"]',
    );
    if (trigger) {
      const targetAttr =
        trigger.getAttribute("data-target") ||
        trigger.getAttribute("href") ||
        "";
      if (targetAttr.startsWith("#")) {
        const id = targetAttr.slice(1);
        userOpenedModalIds.add(id.toLowerCase());
        // Keep active for 15 seconds to allow user interaction
        setTimeout(() => userOpenedModalIds.delete(id.toLowerCase()), 15000);
      }
    }
  },
  true,
);

function normalizedText(element) {
  return (element.textContent || "").replace(/\s+/g, " ").toLowerCase();
}

function isSidebarOrWidget(element) {
  return Boolean(
    element.closest(
      ".sidenav, .sidebar, #div_celebrations, #mySidenav, .floating-bot, #maindiv, #UpdateProgress1",
    ),
  );
}

function isUserOpenedModal(modal) {
  if (!modal || !modal.id) return false;
  return userOpenedModalIds.has(modal.id.toLowerCase());
}

function isRequiredFeedback(element) {
  const text = normalizedText(element);
  return (
    REQUIRED_FEEDBACK_PHRASES.some((phrase) => text.includes(phrase)) &&
    FEEDBACK_IDENTIFIERS.some((phrase) => text.includes(phrase))
  );
}

function isForcedHomeOverlay(modal) {
  if (!modal) return false;
  if (isSidebarOrWidget(modal)) return false;
  if (isUserOpenedModal(modal)) return false;

  const id = (modal.id || "").toLowerCase();

  // 1. Exact or pattern match for known forced popup IDs
  if (FORCED_OVERLAY_IDS.some((targetId) => id.includes(targetId))) {
    return true;
  }

  // 2. Elements containing known forced message containers
  if (
    modal.querySelector(
      "#divForcePopUp_content, .divMessagePopUp, [id*='RPopup'], [id*='divMessageDescription']",
    )
  ) {
    return true;
  }

  // 3. Compulsory survey / feedback dialog
  if (isRequiredFeedback(modal)) {
    return true;
  }

  // 4. Forced announcements appearing automatically on StudentHome.aspx
  const isHomePage =
    location.pathname.toLowerCase().includes("studenthome") ||
    location.pathname === "/" ||
    location.pathname === "";

  if (isHomePage) {
    const titleText = normalizedText(
      modal.querySelector(".modal-title, .modal-header, h4, h5") || modal,
    );
    if (
      titleText.includes("important information") ||
      titleText.includes("important notice") ||
      titleText.includes("announcement")
    ) {
      return true;
    }
  }

  return false;
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function hasVisibleNormalDialog() {
  return [...document.querySelectorAll(".modal, [role='dialog']")].some((dialog) => {
    return (
      !dialog.hasAttribute("data-cu-overlay-hidden") &&
      !dialog.hasAttribute("data-cu-feedback-hidden") &&
      !isForcedHomeOverlay(dialog) &&
      isVisible(dialog)
    );
  });
}

function releaseBodyLock() {
  // Never unlock if a legitimate user-requested modal is active
  if (hasVisibleNormalDialog()) return;

  if (!savedBodyLock) {
    savedBodyLock = {
      classWasPresent: document.body.classList.contains("modal-open"),
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };
  }

  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
}

function clearOverlayResidue() {
  if (
    !document.querySelector(
      "[data-cu-overlay-hidden], [data-cu-feedback-hidden]",
    )
  )
    return;
  if (hasVisibleNormalDialog()) return;

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.setAttribute("data-cu-overlay-hidden", "true");
    backdrop.style.setProperty("display", "none", "important");
  });
  releaseBodyLock();
}

function dismissModal(modal) {
  if (!modal || modal.hasAttribute("data-cu-overlay-hidden")) return;

  // 1. Mark as hidden
  modal.setAttribute("data-cu-overlay-hidden", "true");
  modal.setAttribute("data-cu-feedback-hidden", "true");

  // 2. Click the close button if present so the page's JS state closes cleanly
  const closeBtn = modal.querySelector(
    '.close, [data-dismiss="modal"], button[aria-label="Close"], button.close, [title="Close"]',
  );
  if (closeBtn) {
    try {
      closeBtn.click();
    } catch {}
  }

  // 3. Fallback inline style overrides to ensure complete removal
  modal.style.setProperty("display", "none", "important");
  modal.style.setProperty("visibility", "hidden", "important");
  modal.style.setProperty("opacity", "0", "important");
  modal.style.setProperty("pointer-events", "none", "important");
}

function hideHomeOverlays() {
  if (!studentSettings.hideStudentsOverlay) return;

  // Query all modal dialogs and containers on the page
  const candidateModals = [
    ...document.querySelectorAll(
      ".modal, [role='dialog'], #divForcePopUp, #div_libpopup",
    ),
  ];

  candidateModals.forEach((element) => {
    const modal = element.closest(".modal, [role='dialog']") || element;
    if (isForcedHomeOverlay(modal)) {
      dismissModal(modal);
    }
  });

  clearOverlayResidue();
}

function restoreOverlays() {
  document
    .querySelectorAll("[data-cu-overlay-hidden], [data-cu-feedback-hidden]")
    .forEach((element) => {
      element.style.removeProperty("display");
      element.style.removeProperty("visibility");
      element.style.removeProperty("opacity");
      element.style.removeProperty("pointer-events");
      element.removeAttribute("data-cu-overlay-hidden");
      element.removeAttribute("data-cu-feedback-hidden");
    });

  if (savedBodyLock && !hasVisibleNormalDialog()) {
    if (savedBodyLock.classWasPresent) document.body.classList.add("modal-open");
    document.body.style.overflow = savedBodyLock.overflow;
    document.body.style.paddingRight = savedBodyLock.paddingRight;
  }
  savedBodyLock = null;
}

let landingSkipAttempted = false;

function showSkipNotice() {
  if (document.querySelector(".cu-landing-skip-notice")) return;
  const notice = document.createElement("div");
  notice.className = "cu-landing-skip-notice";
  notice.textContent = "Skipping slideshow & proceeding to Home…";
  (document.body || document.documentElement).appendChild(notice);
}

function autoSkipLandingPage() {
  if (landingSkipAttempted || !studentSettings.hideLandingSlideshow) return;
  const isLanding = location.pathname.toLowerCase().includes("landingpage");
  if (!isLanding) return;

  const findButton = () => {
    const candidates = document.querySelectorAll(
      "a, button, input[type='button'], input[type='submit'], [role='button'], .btn"
    );
    for (const el of candidates) {
      const txt = (el.textContent || el.value || "").trim().toLowerCase();
      if (txt.includes("go to home") || txt.includes("home page") || txt === "home") {
        return el;
      }
    }
    return document.querySelector("a[href*='StudentHome'], a[href*='Home.aspx']");
  };

  const btn = findButton();
  if (btn) {
    landingSkipAttempted = true;
    showSkipNotice();
    try {
      btn.click();
    } catch {}

    // Fallback direct redirection if button click doesn't trigger navigation
    setTimeout(() => {
      if (location.pathname.toLowerCase().includes("landingpage")) {
        location.href = "StudentHome.aspx";
      }
    }, 450);
  }
}

function hideSlideshowElements() {
  if (!studentSettings.hideLandingSlideshow) return;

  const isLanding = location.pathname.toLowerCase().includes("landingpage");
  if (isLanding) {
    document.documentElement.setAttribute("data-cu-is-landing-page", "true");
  }

  const selectors = [
    ".carousel",
    "#myCarousel",
    "#carousel-example-generic",
    "[id*='carousel' i]",
    "[class*='carousel' i]",
    "[id*='slider' i]",
    "[class*='slider' i]",
    "[id*='Highlight' i]",
    "[id*='highlight' i]",
    "[class*='Highlight' i]",
    "[class*='highlight' i]",
    ".carousel-indicators",
    ".carousel-inner"
  ];

  document.querySelectorAll(selectors.join(", ")).forEach((el) => {
    // Avoid hiding the 'Go to Home Page' button if it is located inside or adjacent
    const txt = (el.textContent || "").trim().toLowerCase();
    if (txt.includes("go to home") && !el.classList.contains("carousel") && !el.classList.contains("carousel-inner")) {
      return;
    }
    el.setAttribute("data-cu-slideshow-hidden", "true");
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("opacity", "0", "important");
  });

  if (isLanding) {
    autoSkipLandingPage();
  }
}

function restoreSlideshowElements() {
  document.querySelectorAll("[data-cu-slideshow-hidden='true']").forEach((el) => {
    el.removeAttribute("data-cu-slideshow-hidden");
    el.style.removeProperty("display");
    el.style.removeProperty("visibility");
    el.style.removeProperty("opacity");
  });
}

function applyStudentSettings() {
  document.documentElement.toggleAttribute(
    "data-cu-hide-students-overlay",
    studentSettings.hideStudentsOverlay,
  );
  document.documentElement.toggleAttribute(
    "data-cu-hide-landing-slideshow",
    studentSettings.hideLandingSlideshow,
  );

  if (studentSettings.hideStudentsOverlay) hideHomeOverlays();
  else restoreOverlays();

  if (studentSettings.hideLandingSlideshow) hideSlideshowElements();
  else restoreSlideshowElements();
}

async function loadStudentSettings() {
  try {
    const stored = await chrome.storage.sync.get(STUDENTS_DEFAULT_SETTINGS);
    studentSettings = { ...STUDENTS_DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.error("CU LMS Fixer: could not load student portal settings:", error);
  }
  applyStudentSettings();
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "sync") return;
  let changed = false;
  if (changes.hideStudentsOverlay) {
    studentSettings.hideStudentsOverlay = changes.hideStudentsOverlay.newValue;
    changed = true;
  }
  if (changes.hideLandingSlideshow) {
    studentSettings.hideLandingSlideshow = changes.hideLandingSlideshow.newValue;
    changed = true;
  }
  if (changed) {
    applyStudentSettings();
  }
});

loadStudentSettings();

new MutationObserver(() => {
  if (studentSettings.hideStudentsOverlay) hideHomeOverlays();
  if (studentSettings.hideLandingSlideshow) hideSlideshowElements();
}).observe(document.documentElement, { childList: true, subtree: true });

// Check on delayed ASP.NET WebForms / jQuery timers
[50, 150, 300, 600, 1200, 2500, 5000].forEach((delay) => {
  window.setTimeout(() => {
    if (studentSettings.hideStudentsOverlay) hideHomeOverlays();
    if (studentSettings.hideLandingSlideshow) hideSlideshowElements();
  }, delay);
});
