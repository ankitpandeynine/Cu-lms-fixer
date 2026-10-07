/**
 * CU LMS Fixer - Universal Copy & Paste Content Script (ISOLATED World)
 * Runs at document_start across all frames on all CU portals & subsidiaries.
 *
 * Provides capture-phase protection and DOM cleaning:
 * 1. Captures and shields Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A shortcuts.
 * 2. Unblocks native right-click context menu.
 * 3. Unblocks native copy, cut, and paste events.
 * 4. Strips inline anti-copy HTML attributes via MutationObserver.
 * 5. Cleans inline user-select: none styles.
 * 6. Synchronizes settings with chrome.storage.
 */

(() => {
  const DEFAULT_COPYPASTE_SETTINGS = {
    enableUnblockCopyPaste: true,
  };

  let isEnabled = true;

  // Sync settings state to page context (unblock_copypaste_main.js) and DOM
  function updateState(enabled) {
    isEnabled = Boolean(enabled);
    document.documentElement.setAttribute(
      "data-cu-unblock-copypaste",
      isEnabled ? "true" : "false",
    );
    window.postMessage(
      { type: "CU_SET_COPYPASTE_ENABLED", enabled: isEnabled },
      "*",
    );
  }

  // Load initial settings
  if (chrome?.storage?.sync) {
    chrome.storage.sync
      .get(DEFAULT_COPYPASTE_SETTINGS)
      .then((settings) => {
        updateState(settings.enableUnblockCopyPaste);
      })
      .catch(() => {
        updateState(true);
      });

    // Listen for setting changes from popup
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "sync" && changes.enableUnblockCopyPaste) {
        updateState(changes.enableUnblockCopyPaste.newValue);
      }
    });
  } else {
    updateState(true);
  }

  // Fallback injection of MAIN world script if not already loaded by manifest
  function injectMainWorldFallback() {
    try {
      if (document.documentElement && chrome.runtime?.getURL) {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("unblock_copypaste_main.js");
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
      }
    } catch {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectMainWorldFallback, {
      once: true,
    });
  } else {
    injectMainWorldFallback();
  }

  // ==========================================
  // CAPTURE PHASE EVENT INTERCEPTION
  // ==========================================

  // 1. Keyboard shortcuts: Ctrl/Cmd + C, V, X, A, Insert
  function handleKeyShortcuts(e) {
    if (!isEnabled) return;
    const isModifier = e.ctrlKey || e.metaKey;
    if (!isModifier) return;

    const key = (e.key || "").toLowerCase();
    const keyCode = e.keyCode || e.which;

    const isCopyPasteKey =
      key === "c" ||
      keyCode === 67 ||
      key === "v" ||
      keyCode === 86 ||
      key === "x" ||
      keyCode === 88 ||
      key === "a" ||
      keyCode === 65 ||
      key === "insert" ||
      keyCode === 45;

    if (isCopyPasteKey) {
      // Stop the website's keydown listener from calling e.preventDefault()
      e.stopImmediatePropagation();
    }
  }

  window.addEventListener("keydown", handleKeyShortcuts, true);
  window.addEventListener("keypress", handleKeyShortcuts, true);
  window.addEventListener("keyup", handleKeyShortcuts, true);

  // 2. Right-click context menu
  window.addEventListener(
    "contextmenu",
    (e) => {
      if (!isEnabled) return;
      // Stop anti-right-click handlers on the page from canceling the menu
      e.stopImmediatePropagation();
    },
    true,
  );

  // 3. Selection start
  window.addEventListener(
    "selectstart",
    (e) => {
      if (!isEnabled) return;
      e.stopImmediatePropagation();
    },
    true,
  );

  // 4. Drag start
  window.addEventListener(
    "dragstart",
    (e) => {
      if (!isEnabled) return;
      e.stopImmediatePropagation();
    },
    true,
  );

  // 5. Copy event
  window.addEventListener(
    "copy",
    (e) => {
      if (!isEnabled) return;
      // Get active selection text
      const selectedText = window.getSelection()?.toString();
      if (selectedText && e.clipboardData) {
        try {
          e.clipboardData.setData("text/plain", selectedText);
        } catch {}
      }
      e.stopImmediatePropagation();
    },
    true,
  );

  // 6. Cut event
  window.addEventListener(
    "cut",
    (e) => {
      if (!isEnabled) return;
      const selectedText = window.getSelection()?.toString();
      if (selectedText && e.clipboardData) {
        try {
          e.clipboardData.setData("text/plain", selectedText);
        } catch {}
      }
      e.stopImmediatePropagation();
    },
    true,
  );

  // 7. Paste event
  window.addEventListener(
    "paste",
    (e) => {
      if (!isEnabled) return;
      // Stop website paste blockers from preventing browser default paste
      e.stopImmediatePropagation();
    },
    true,
  );

  // ==========================================
  // DOM ATTRIBUTE & INLINE STYLE CLEANER
  // ==========================================

  const BLOCKED_ATTRIBUTES = [
    "oncopy",
    "oncut",
    "onpaste",
    "oncontextmenu",
    "onselectstart",
    "ondragstart",
  ];

  function cleanNode(node) {
    if (!isEnabled || !node || node.nodeType !== Node.ELEMENT_NODE) return;

    for (const attr of BLOCKED_ATTRIBUTES) {
      if (node.hasAttribute(attr)) {
        node.removeAttribute(attr);
      }
    }

    if (node.style) {
      if (
        node.style.userSelect === "none" ||
        node.style.webkitUserSelect === "none"
      ) {
        node.style.removeProperty("user-select");
        node.style.removeProperty("-webkit-user-select");
      }
    }
  }

  function cleanSubtree(root) {
    if (!root) return;
    cleanNode(root);
    const elements = root.querySelectorAll
      ? root.querySelectorAll(
          "[oncopy], [oncut], [onpaste], [oncontextmenu], [onselectstart], [ondragstart], [style*='user-select']",
        )
      : [];
    elements.forEach(cleanNode);
  }

  // Initial clean
  cleanSubtree(document.documentElement);

  // Observe and clean newly added elements
  const observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            cleanSubtree(node);
          }
        });
      } else if (mutation.type === "attributes") {
        cleanNode(mutation.target);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: BLOCKED_ATTRIBUTES,
  });

  // Periodic safety check for dynamically loaded frames & ASP.NET updates
  [100, 300, 700, 1500, 3000].forEach((delay) => {
    setTimeout(() => cleanSubtree(document.body || document.documentElement), delay);
  });
})();
