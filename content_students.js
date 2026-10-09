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
  enableAutoLogin: false,
  autoLoginUid: "",
  autoLoginPassword: "",
};

const REQUIRED_FEEDBACK_PHRASES = [
  "teaching & learning process",
  "teaching and learning process",
];
const FEEDBACK_IDENTIFIERS = ["filling out the feedback", "dear student"];

const FORCED_OVERLAY_IDS = ["divforcepopup", "div_libpopup"];

let studentSettings = { ...STUDENTS_DEFAULT_SETTINGS };
let savedBodyLock = null;
let autoLoginProcessedStep1 = false;

function handleStudentAutoLogin() {
  if (!studentSettings.enableAutoLogin || !studentSettings.autoLoginUid) return;

  const isLoginPage = location.pathname.toLowerCase().includes("login") || location.pathname === "/" || location.pathname.toLowerCase().includes("default");
  if (!isLoginPage && !document.querySelector("input[type='password']")) return;

  // Step 1: User ID input field
  const uidInput = document.querySelector(
    "input[placeholder*='User' i], input[id*='User' i], input[name*='User' i], input[id*='txtUser' i]"
  );

  if (uidInput && !autoLoginProcessedStep1) {
    if (uidInput.value !== studentSettings.autoLoginUid) {
      uidInput.value = studentSettings.autoLoginUid;
      uidInput.dispatchEvent(new Event("input", { bubbles: true }));
      uidInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Find NEXT button
    const nextBtn =
      document.querySelector("input[value*='NEXT' i], button[id*='btnNext' i], input[id*='btnNext' i]") ||
      [...document.querySelectorAll("button, input[type='submit'], input[type='button'], .btn")].find(
        (el) => (el.value || el.textContent || "").trim().toUpperCase() === "NEXT"
      );

    if (nextBtn) {
      autoLoginProcessedStep1 = true;
      setTimeout(() => {
        try {
          nextBtn.click();
        } catch {}
      }, 150);
    }
    return;
  }

  // Step 2: Password input field
  const passInput = document.querySelector(
    "input[type='password'], input[placeholder*='Password' i], input[id*='txtPassword' i]"
  );

  if (passInput && studentSettings.autoLoginPassword) {
    if (passInput.value !== studentSettings.autoLoginPassword) {
      passInput.value = studentSettings.autoLoginPassword;
      passInput.dispatchEvent(new Event("input", { bubbles: true }));
      passInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Focus CAPTCHA field automatically for fast manual entry
    const captchaInput = document.querySelector(
      "#txtcaptcha, input[placeholder*='captcha' i], input[id*='txtCaptcha' i], input[name*='txtCaptcha' i], input[id*='captcha' i]"
    );
    if (captchaInput && document.activeElement !== captchaInput) {
      captchaInput.focus();
    }

    // Solve CAPTCHA using local Tesseract.js
    const captchaImage = document.querySelector(".__captcha_value img, img[src*='captcha' i], img[id*='captcha' i], img[alt*='captcha' i]");
    
    if (!captchaImage) {
      console.log("CU LMS Fixer: CAPTCHA image element not found on this page.");
    } else {
      console.log("CU LMS Fixer: Found CAPTCHA image, starting OCR...", captchaImage);
      
      // Prevent infinite loop if OCR fails and page doesn't fully reload
      if (window._lastSolvedCaptchaSrc === captchaImage.src) {
        console.log("CU LMS Fixer: This CAPTCHA failed previously. Clicking reload...");
        const reloadBtn = document.querySelector("#lnkupCaptcha, .__captcha_reload");
        if (reloadBtn) {
          reloadBtn.click();
        }
        return;
      }
      window._lastSolvedCaptchaSrc = captchaImage.src;

      if (!window.Tesseract) {
        console.error("Tesseract.js is not loaded.");
        return;
      }

      // Pre-process image to remove grid lines and improve OCR accuracy
      const preprocessImage = (imgEl) => {
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.naturalWidth || imgEl.width || 120;
        canvas.height = imgEl.naturalHeight || imgEl.height || 40;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Apply luminance threshold to remove the light colored grid lines
          // The text is very dark, the grid is light.
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // If pixel is darker than the threshold, make it pure black. Otherwise, pure white.
            if (luminance < 120) {
              data[i] = 0;     // R
              data[i+1] = 0;   // G
              data[i+2] = 0;   // B
            } else {
              data[i] = 255;   // R
              data[i+1] = 255; // G
              data[i+2] = 255; // B
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          return canvas.toDataURL("image/png");
        } catch (e) {
          console.error("Canvas CORS issue:", e);
          return imgEl.src; // Fallback to original if canvas gets tainted
        }
      };

      // We need to wait for the image to be fully loaded before drawing it to canvas
      const processCaptcha = () => {
        const processedImageSrc = preprocessImage(captchaImage);
        
        Tesseract.recognize(
          processedImageSrc,
          'eng',
          { logger: m => console.log(m) }
        ).then(({ data: { text } }) => {
          // Clean up output text (remove spaces, newlines, etc)
          const cleanedText = text.replace(/[^A-Za-z0-9]/g, '');
          console.log("Solved CAPTCHA:", cleanedText);
          
          captchaInput.value = cleanedText;
          captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
          captchaInput.dispatchEvent(new Event("change", { bubbles: true }));
          
          // Auto submit the form
          const loginBtn = document.querySelector("#btnLogin, input[type='submit'][value*='LOGIN' i], button[id*='Login' i]");
          if (loginBtn) {
            console.log("CU LMS Fixer: Auto-submitting form...");
            setTimeout(() => {
              loginBtn.click();
            }, 300); // Small delay to let React/Angular/ASP.NET state catch up
          } else if (captchaInput.form) {
            captchaInput.form.submit();
          }
          
        }).catch(error => {
          console.error('Error solving CAPTCHA with Tesseract:', error);
        });
      };

      if (captchaImage.complete) {
        processCaptcha();
      } else {
        captchaImage.onload = processCaptcha;
      }
    }
  }
}

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

  if (studentSettings.enableAutoLogin) handleStudentAutoLogin();
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
  if (changes.enableAutoLogin) {
    studentSettings.enableAutoLogin = changes.enableAutoLogin.newValue;
    changed = true;
  }
  if (changes.autoLoginUid) {
    studentSettings.autoLoginUid = changes.autoLoginUid.newValue;
    changed = true;
  }
  if (changes.autoLoginPassword) {
    studentSettings.autoLoginPassword = changes.autoLoginPassword.newValue;
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
  if (studentSettings.enableAutoLogin) handleStudentAutoLogin();
}).observe(document.documentElement, { childList: true, subtree: true });

// Check on delayed ASP.NET WebForms / jQuery timers
[50, 150, 300, 600, 1200, 2500, 5000].forEach((delay) => {
  window.setTimeout(() => {
    if (studentSettings.hideStudentsOverlay) hideHomeOverlays();
    if (studentSettings.hideLandingSlideshow) hideSlideshowElements();
    if (studentSettings.enableAutoLogin) handleStudentAutoLogin();
  }, delay);
});
