const DEFAULT_SETTINGS = {
  enableUnblockCopyPaste: true,
  enableDownloadButton: true,
  enableCopyButton: true,
  enableSectionDownloadAll: true,
  enableQuizSolver: true,
  enableAutoProceed: false,
  quizProvider: "gemini",
  geminiModel: "gemini-2.5-flash",
  geminiApiKey: "",
  grokModel: "grok-beta",
  grokApiKey: "",
  nvidiaModel: "meta/llama-3.1-70b-instruct",
  nvidiaApiKey: "",
  openrouterModel: "meta-llama/llama-3.3-70b-instruct:free",
  openrouterApiKey: "",
  hideSopPermanently: false,
  disableAutoSopPopup: true,
  hideStudentsOverlay: true,
  hideLandingSlideshow: true,
};

const elements = {
  tabBtnHome: document.getElementById("tabBtnHome"),
  tabBtnAi: document.getElementById("tabBtnAi"),
  tabContentHome: document.getElementById("tabContentHome"),
  tabContentAi: document.getElementById("tabContentAi"),

  enableUnblockCopyPaste: document.getElementById("enableUnblockCopyPaste"),
  enableDownloadButton: document.getElementById("enableDownloadButton"),
  enableCopyButton: document.getElementById("enableCopyButton"),
  enableSectionDownloadAll: document.getElementById("enableSectionDownloadAll"),
  enableQuizSolver: document.getElementById("enableQuizSolver"),
  enableAutoProceed: document.getElementById("enableAutoProceed"),
  quizProviderSelect: document.getElementById("quizProviderSelect"),

  // Provider blocks
  providerBlockGemini: document.getElementById("providerBlockGemini"),
  providerBlockGrok: document.getElementById("providerBlockGrok"),
  providerBlockNvidia: document.getElementById("providerBlockNvidia"),
  providerBlockOpenrouter: document.getElementById("providerBlockOpenrouter"),

  // Models & Keys
  geminiModelSelect: document.getElementById("geminiModelSelect"),
  geminiApiKeyInput: document.getElementById("geminiApiKeyInput"),
  grokModelSelect: document.getElementById("grokModelSelect"),
  grokApiKeyInput: document.getElementById("grokApiKeyInput"),
  nvidiaModelSelect: document.getElementById("nvidiaModelSelect"),
  nvidiaApiKeyInput: document.getElementById("nvidiaApiKeyInput"),
  openrouterModelSelect: document.getElementById("openrouterModelSelect"),
  openrouterApiKeyInput: document.getElementById("openrouterApiKeyInput"),

  hideSopPermanently: document.getElementById("hideSopPermanently"),
  disableAutoSopPopup: document.getElementById("disableAutoSopPopup"),
  hideStudentsOverlay: document.getElementById("hideStudentsOverlay"),
  hideLandingSlideshow: document.getElementById("hideLandingSlideshow"),
  saveStatus: document.getElementById("saveStatus"),
  footerCredit: document.getElementById("footerCredit"),
  githubLink: document.getElementById("githubLink"),
};

let saveTimeout = null;

function showSaved() {
  if (!elements.saveStatus || !elements.footerCredit) return;
  elements.footerCredit.classList.add("hidden");
  elements.saveStatus.classList.add("visible");
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    elements.saveStatus.classList.remove("visible");
    elements.footerCredit.classList.remove("hidden");
  }, 1400);
}

function updateActiveProviderBlock(provider) {
  const p = (provider || "gemini").toLowerCase();
  if (elements.providerBlockGemini) elements.providerBlockGemini.style.display = p === "gemini" ? "block" : "none";
  if (elements.providerBlockGrok) elements.providerBlockGrok.style.display = p === "grok" ? "block" : "none";
  if (elements.providerBlockNvidia) elements.providerBlockNvidia.style.display = p === "nvidia" ? "block" : "none";
  if (elements.providerBlockOpenrouter) elements.providerBlockOpenrouter.style.display = p === "openrouter" ? "block" : "none";
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  if (elements.enableUnblockCopyPaste) {
    elements.enableUnblockCopyPaste.checked = Boolean(settings.enableUnblockCopyPaste);
  }
  elements.enableDownloadButton.checked = Boolean(settings.enableDownloadButton);
  elements.enableCopyButton.checked = Boolean(settings.enableCopyButton);
  if (elements.enableSectionDownloadAll) {
    elements.enableSectionDownloadAll.checked = Boolean(settings.enableSectionDownloadAll);
  }
  if (elements.enableQuizSolver) {
    elements.enableQuizSolver.checked = Boolean(settings.enableQuizSolver);
  }
  if (elements.enableAutoProceed) {
    elements.enableAutoProceed.checked = Boolean(settings.enableAutoProceed);
  }
  if (elements.quizProviderSelect) {
    elements.quizProviderSelect.value = settings.quizProvider || "gemini";
    updateActiveProviderBlock(settings.quizProvider);
  }

  // Model & Key values
  if (elements.geminiModelSelect) elements.geminiModelSelect.value = settings.geminiModel || "gemini-2.5-flash";
  if (elements.geminiApiKeyInput) elements.geminiApiKeyInput.value = settings.geminiApiKey || "";
  if (elements.grokModelSelect) elements.grokModelSelect.value = settings.grokModel || "grok-beta";
  if (elements.grokApiKeyInput) elements.grokApiKeyInput.value = settings.grokApiKey || "";
  if (elements.nvidiaModelSelect) elements.nvidiaModelSelect.value = settings.nvidiaModel || "meta/llama-3.1-70b-instruct";
  if (elements.nvidiaApiKeyInput) elements.nvidiaApiKeyInput.value = settings.nvidiaApiKey || "";
  if (elements.openrouterModelSelect) elements.openrouterModelSelect.value = settings.openrouterModel || "meta-llama/llama-3.3-70b-instruct:free";
  if (elements.openrouterApiKeyInput) elements.openrouterApiKeyInput.value = settings.openrouterApiKey || "";

  elements.hideSopPermanently.checked = Boolean(settings.hideSopPermanently);
  elements.disableAutoSopPopup.checked = Boolean(settings.disableAutoSopPopup);
  elements.hideStudentsOverlay.checked = Boolean(settings.hideStudentsOverlay);
  if (elements.hideLandingSlideshow) {
    elements.hideLandingSlideshow.checked = Boolean(settings.hideLandingSlideshow);
  }
}

async function saveSettings() {
  const settings = {
    enableUnblockCopyPaste: elements.enableUnblockCopyPaste ? elements.enableUnblockCopyPaste.checked : true,
    enableDownloadButton: elements.enableDownloadButton.checked,
    enableCopyButton: elements.enableCopyButton.checked,
    enableSectionDownloadAll: elements.enableSectionDownloadAll ? elements.enableSectionDownloadAll.checked : true,
    enableQuizSolver: elements.enableQuizSolver ? elements.enableQuizSolver.checked : true,
    enableAutoProceed: elements.enableAutoProceed ? elements.enableAutoProceed.checked : false,
    quizProvider: elements.quizProviderSelect ? elements.quizProviderSelect.value : "gemini",

    geminiModel: elements.geminiModelSelect ? elements.geminiModelSelect.value : "gemini-2.5-flash",
    geminiApiKey: elements.geminiApiKeyInput ? elements.geminiApiKeyInput.value.trim() : "",
    grokModel: elements.grokModelSelect ? elements.grokModelSelect.value : "grok-beta",
    grokApiKey: elements.grokApiKeyInput ? elements.grokApiKeyInput.value.trim() : "",
    nvidiaModel: elements.nvidiaModelSelect ? elements.nvidiaModelSelect.value : "meta/llama-3.1-70b-instruct",
    nvidiaApiKey: elements.nvidiaApiKeyInput ? elements.nvidiaApiKeyInput.value.trim() : "",
    openrouterModel: elements.openrouterModelSelect ? elements.openrouterModelSelect.value : "meta-llama/llama-3.3-70b-instruct:free",
    openrouterApiKey: elements.openrouterApiKeyInput ? elements.openrouterApiKeyInput.value.trim() : "",

    hideSopPermanently: elements.hideSopPermanently.checked,
    disableAutoSopPopup: elements.disableAutoSopPopup.checked,
    hideStudentsOverlay: elements.hideStudentsOverlay.checked,
    hideLandingSlideshow: elements.hideLandingSlideshow ? elements.hideLandingSlideshow.checked : true,
  };

  await chrome.storage.sync.set(settings);
  showSaved();
}

function initListeners() {
  // iOS 27 Segmented Tab Switching
  if (elements.tabBtnHome && elements.tabBtnAi) {
    elements.tabBtnHome.addEventListener("click", () => {
      elements.tabBtnHome.classList.add("active");
      elements.tabBtnAi.classList.remove("active");
      elements.tabBtnHome.setAttribute("aria-selected", "true");
      elements.tabBtnAi.setAttribute("aria-selected", "false");
      elements.tabContentHome.style.display = "flex";
      elements.tabContentAi.style.display = "none";
    });

    elements.tabBtnAi.addEventListener("click", () => {
      elements.tabBtnAi.classList.add("active");
      elements.tabBtnHome.classList.remove("active");
      elements.tabBtnAi.setAttribute("aria-selected", "true");
      elements.tabBtnHome.setAttribute("aria-selected", "false");
      elements.tabContentAi.style.display = "flex";
      elements.tabContentHome.style.display = "none";
    });
  }

  // Provider change
  if (elements.quizProviderSelect) {
    elements.quizProviderSelect.addEventListener("change", (e) => {
      updateActiveProviderBlock(e.target.value);
      saveSettings();
    });
  }

  // Ensure mutual exclusivity between permanent hide and only auto-disable
  elements.hideSopPermanently.addEventListener("change", () => {
    if (elements.hideSopPermanently.checked) {
      elements.disableAutoSopPopup.checked = false;
    }
    saveSettings();
  });

  elements.disableAutoSopPopup.addEventListener("change", () => {
    if (elements.disableAutoSopPopup.checked) {
      elements.hideSopPermanently.checked = false;
    }
    saveSettings();
  });

  if (elements.enableUnblockCopyPaste) {
    elements.enableUnblockCopyPaste.addEventListener("change", saveSettings);
  }
  elements.enableDownloadButton.addEventListener("change", saveSettings);
  elements.enableCopyButton.addEventListener("change", saveSettings);
  if (elements.enableSectionDownloadAll) {
    elements.enableSectionDownloadAll.addEventListener("change", saveSettings);
  }
  if (elements.enableQuizSolver) {
    elements.enableQuizSolver.addEventListener("change", saveSettings);
  }
  if (elements.enableAutoProceed) {
    elements.enableAutoProceed.addEventListener("change", saveSettings);
  }

  // Input listeners
  const inputElements = [
    elements.geminiModelSelect, elements.geminiApiKeyInput,
    elements.grokModelSelect, elements.grokApiKeyInput,
    elements.nvidiaModelSelect, elements.nvidiaApiKeyInput,
    elements.openrouterModelSelect, elements.openrouterApiKeyInput
  ];
  inputElements.forEach(el => {
    if (el) {
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", saveSettings);
    }
  });

  elements.hideStudentsOverlay.addEventListener("change", saveSettings);
  if (elements.hideLandingSlideshow) {
    elements.hideLandingSlideshow.addEventListener("change", saveSettings);
  }

  if (elements.githubLink) {
    elements.githubLink.addEventListener("click", (event) => {
      event.preventDefault();
      chrome.tabs.create({ url: elements.githubLink.href });
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  initListeners();
});
