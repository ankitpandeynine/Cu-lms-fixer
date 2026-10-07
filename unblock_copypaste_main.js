/**
 * CU LMS Fixer - Universal Copy & Paste Unblocker (Page Context / MAIN World)
 * Runs directly in the page execution context at document_start.
 *
 * Completely neutralizes:
 * 1. Event cancellation via e.preventDefault() on copy, cut, paste, contextmenu, selectstart.
 * 2. Event cancellation via e.returnValue = false.
 * 3. Property handlers: document.oncopy, document.onpaste, document.oncontextmenu, etc.
 * 4. Inline handlers returning false.
 * 5. Selection wiping via getSelection().removeAllRanges() / empty().
 * 6. Intrusive anti-copy alert() popups.
 */

(() => {
  if (window.__CU_UNBLOCK_MAIN_ACTIVE__) return;
  window.__CU_UNBLOCK_MAIN_ACTIVE__ = true;

  let isEnabled = true;

  // Listen for configuration messages from isolated content script
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "CU_SET_COPYPASTE_ENABLED") {
      isEnabled = Boolean(event.data.enabled);
    }
  });

  const UNBLOCK_EVENT_TYPES = new Set([
    "copy",
    "cut",
    "paste",
    "contextmenu",
    "selectstart",
    "dragstart",
  ]);

  // 1. Defeat Event.prototype.preventDefault for unblocked event types
  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    if (isEnabled && UNBLOCK_EVENT_TYPES.has(this.type)) {
      // Suppress cancellation so browser handles the action natively
      return;
    }
    return originalPreventDefault.apply(this, arguments);
  };

  // 2. Defeat Event.prototype.returnValue = false (used by legacy WebForms scripts)
  try {
    const origReturnValueDesc = Object.getOwnPropertyDescriptor(
      Event.prototype,
      "returnValue",
    ) || {
      get() {
        return !this.defaultPrevented;
      },
      set() {},
    };

    Object.defineProperty(Event.prototype, "returnValue", {
      get() {
        if (isEnabled && UNBLOCK_EVENT_TYPES.has(this.type)) {
          return true;
        }
        return origReturnValueDesc.get
          ? origReturnValueDesc.get.call(this)
          : true;
      },
      set(val) {
        if (isEnabled && UNBLOCK_EVENT_TYPES.has(this.type)) {
          return; // Do not allow setting to false
        }
        if (origReturnValueDesc.set) {
          origReturnValueDesc.set.call(this, val);
        }
      },
      configurable: true,
      enumerable: true,
    });
  } catch {}

  // 3. Neutralize property setters (e.g. document.oncopy = ...; document.oncontextmenu = ...)
  const PROTECTED_PROPERTIES = [
    "oncopy",
    "oncut",
    "onpaste",
    "oncontextmenu",
    "onselectstart",
    "ondragstart",
  ];

  const prototypesToProtect = [
    Document.prototype,
    HTMLElement.prototype,
    Window.prototype,
  ];

  PROTECTED_PROPERTIES.forEach((prop) => {
    prototypesToProtect.forEach((proto) => {
      try {
        Object.defineProperty(proto, prop, {
          get() {
            return null;
          },
          set() {
            // Ignore website attempts to bind anti-copy/paste property handlers
            return true;
          },
          configurable: true,
        });
      } catch {}
    });
  });

  // 4. Wrap EventTarget.prototype.addEventListener for targeted copy/paste events
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (isEnabled && typeof type === "string") {
      const lower = type.toLowerCase();
      if (UNBLOCK_EVENT_TYPES.has(lower)) {
        const wrappedListener = function (event) {
          if (typeof listener === "function") {
            try {
              const res = listener.apply(this, arguments);
              if (res === false) {
                // If handler returned false to cancel native action, ignore it
                return true;
              }
              return res;
            } catch {
              // Ignore script errors
            }
          } else if (listener && typeof listener.handleEvent === "function") {
            try {
              listener.handleEvent(event);
            } catch {}
          }
        };
        return originalAddEventListener.call(
          this,
          type,
          wrappedListener,
          options,
        );
      }
    }
    return originalAddEventListener.apply(this, arguments);
  };

  // 5. Protect selection ranges from automated scripts (e.g. selectionchange loops)
  const originalRemoveAllRanges = Selection.prototype.removeAllRanges;
  const originalEmpty = Selection.prototype.empty;

  let isUserSelecting = false;
  let lastUserSelectTime = 0;

  window.addEventListener(
    "mousedown",
    () => {
      isUserSelecting = true;
      lastUserSelectTime = Date.now();
    },
    true,
  );

  window.addEventListener(
    "mouseup",
    () => {
      lastUserSelectTime = Date.now();
      setTimeout(() => {
        isUserSelecting = false;
      }, 800);
    },
    true,
  );

  function shouldProtectSelection(sel) {
    if (!isEnabled) return false;
    const text = (sel ? sel.toString() : "") || "";
    if (!text.trim()) return false;

    // Check if called from an automated script or while user is selecting
    const stack = (new Error().stack || "").toLowerCase();
    if (
      stack.includes("selectionchange") ||
      stack.includes("setinterval") ||
      stack.includes("settimeout") ||
      stack.includes("oncopy") ||
      isUserSelecting ||
      Date.now() - lastUserSelectTime < 800
    ) {
      return true;
    }
    return false;
  }

  Selection.prototype.removeAllRanges = function () {
    if (shouldProtectSelection(this)) {
      return; // Do not clear user selection
    }
    return originalRemoveAllRanges.apply(this, arguments);
  };

  Selection.prototype.empty = function () {
    if (shouldProtectSelection(this)) {
      return;
    }
    return originalEmpty.apply(this, arguments);
  };

  // 6. Suppress annoying anti-copy / anti-right-click alert dialogs
  const originalAlert = window.alert;
  window.alert = function (message) {
    if (isEnabled && message) {
      const lower = String(message).toLowerCase();
      if (
        lower.includes("copy") ||
        lower.includes("paste") ||
        lower.includes("right click") ||
        lower.includes("right-click") ||
        lower.includes("context menu") ||
        lower.includes("not allowed") ||
        lower.includes("disabled")
      ) {
        console.warn("CU LMS Fixer: suppressed anti-copy alert:", message);
        return;
      }
    }
    return originalAlert.apply(this, arguments);
  };
})();
