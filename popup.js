const DEFAULT_SETTINGS = {
  enableUnblockCopyPaste: true,
  enableDownloadButton: true,
  enableCopyButton: true,
  enableSectionDownloadAll: true,
  enableQuizSolver: true,
  enableAutoProceed: false,
  enableAutoLogin: false,
  autoLoginUid: "",
  autoLoginPassword: "",
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
  tabBtnLogin: document.getElementById("tabBtnLogin"),
  tabContentHome: document.getElementById("tabContentHome"),
  tabContentAi: document.getElementById("tabContentAi"),
  tabContentLogin: document.getElementById("tabContentLogin"),

  enableUnblockCopyPaste: document.getElementById("enableUnblockCopyPaste"),
  enableDownloadButton: document.getElementById("enableDownloadButton"),
  enableCopyButton: document.getElementById("enableCopyButton"),
  enableSectionDownloadAll: document.getElementById("enableSectionDownloadAll"),
  enableQuizSolver: document.getElementById("enableQuizSolver"),
  enableAutoProceed: document.getElementById("enableAutoProceed"),
  enableAutoLogin: document.getElementById("enableAutoLogin"),
  autoLoginUidInput: document.getElementById("autoLoginUidInput"),
  autoLoginPasswordInput: document.getElementById("autoLoginPasswordInput"),
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

  // Update elements
  updateBanner: document.getElementById("updateBanner"),
  updateVersionBadge: document.getElementById("updateVersionBadge"),
  updateCommitMsg: document.getElementById("updateCommitMsg"),
  btnOneClickUpdate: document.getElementById("btnOneClickUpdate"),
  checkUpdatesBtn: document.getElementById("checkUpdatesBtn"),
  checkUpdatesIcon: document.getElementById("checkUpdatesIcon"),
  checkUpdatesText: document.getElementById("checkUpdatesText"),
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
  if (elements.enableAutoLogin) {
    elements.enableAutoLogin.checked = Boolean(settings.enableAutoLogin);
  }
  if (elements.autoLoginUidInput) {
    elements.autoLoginUidInput.value = settings.autoLoginUid || "";
  }
  if (elements.autoLoginPasswordInput) {
    elements.autoLoginPasswordInput.value = settings.autoLoginPassword || "";
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
    enableAutoLogin: elements.enableAutoLogin ? elements.enableAutoLogin.checked : false,
    autoLoginUid: elements.autoLoginUidInput ? elements.autoLoginUidInput.value.trim() : "",
    autoLoginPassword: elements.autoLoginPasswordInput ? elements.autoLoginPasswordInput.value.trim() : "",
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
  const tabs = [
    { btn: elements.tabBtnHome, content: elements.tabContentHome },
    { btn: elements.tabBtnAi, content: elements.tabContentAi },
    { btn: elements.tabBtnLogin, content: elements.tabContentLogin }
  ];

  tabs.forEach(tab => {
    if (tab.btn && tab.content) {
      tab.btn.addEventListener("click", () => {
        tabs.forEach(t => {
          if (t.btn && t.content) {
            t.btn.classList.remove("active");
            t.btn.setAttribute("aria-selected", "false");
            t.content.style.display = "none";
          }
        });
        tab.btn.classList.add("active");
        tab.btn.setAttribute("aria-selected", "true");
        tab.content.style.display = "flex";
      });
    }
  });

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
  if (elements.enableAutoLogin) {
    elements.enableAutoLogin.addEventListener("change", saveSettings);
  }

  // Input listeners
  const inputElements = [
    elements.autoLoginUidInput, elements.autoLoginPasswordInput,
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

  // 1-Click Update Button Click -> Opens updater.html?auto=1
  if (elements.btnOneClickUpdate) {
    elements.btnOneClickUpdate.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("updater.html?auto=1") });
      window.close();
    });
  }

  // Manual Check Updates in Footer
  if (elements.checkUpdatesBtn) {
    elements.checkUpdatesBtn.addEventListener("click", () => {
      if (elements.checkUpdatesBtn.classList.contains("checking")) return;
      elements.checkUpdatesBtn.classList.add("checking");
      if (elements.checkUpdatesText) elements.checkUpdatesText.textContent = "Checking...";

      chrome.runtime.sendMessage({ type: "CHECK_FOR_UPDATES" }, (response) => {
        chrome.storage.local.get(
          ["updateAvailable", "remoteCommit", "remoteCommitMsg", "remoteVersion", "installedCommit"],
          (data) => {
            refreshUpdateUI(data);
            elements.checkUpdatesBtn.classList.remove("checking");
            if (elements.checkUpdatesText) {
              if (response?.updateAvailable) {
                elements.checkUpdatesText.textContent = "New Update!";
                elements.checkUpdatesBtn.style.color = "#38bdf8";
              } else {
                elements.checkUpdatesText.textContent = "Latest ✓";
                elements.checkUpdatesBtn.style.color = "#34d399";
              }
              setTimeout(() => {
                elements.checkUpdatesText.textContent = "Updates";
                elements.checkUpdatesBtn.style.color = "";
              }, 3000);
            }
          }
        );
      });
    });
  }
}

function refreshUpdateUI(storageData) {
  if (!elements.updateBanner || !storageData) return;
  const isAvailable = Boolean(storageData.updateAvailable);
  const remoteSha = storageData.remoteCommit || "";
  const localSha = storageData.installedCommit || "";
  const remoteVer = storageData.remoteVersion || "";
  const msg = storageData.remoteCommitMsg || "New enhancements and fixes released on GitHub";

  // Only display if update is available and remote commit is different from installed
  if (isAvailable && (!localSha || !remoteSha.startsWith(localSha.slice(0, 7)))) {
    elements.updateBanner.style.display = "block";
    if (elements.updateVersionBadge) {
      elements.updateVersionBadge.textContent = remoteVer
        ? `v${remoteVer}`
        : (remoteSha ? remoteSha.slice(0, 7) : "NEW");
    }
    if (elements.updateCommitMsg) {
      elements.updateCommitMsg.textContent = msg;
    }
  } else {
    elements.updateBanner.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  initListeners();

  // Load update state from local storage
  chrome.storage.local.get(
    ["updateAvailable", "remoteCommit", "remoteCommitMsg", "remoteVersion", "installedCommit"],
    (res) => {
      refreshUpdateUI(res);
    }
  );

  // Listen for background update changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.updateAvailable || changes.remoteCommit || changes.installedCommit)) {
      chrome.storage.local.get(
        ["updateAvailable", "remoteCommit", "remoteCommitMsg", "remoteVersion", "installedCommit"],
        (res) => {
          refreshUpdateUI(res);
        }
      );
    }
  });

  // Query background for latest update check in background
  chrome.runtime.sendMessage({ type: "CHECK_FOR_UPDATES" }, (res) => {
    if (res) refreshUpdateUI(res);
  });
});
