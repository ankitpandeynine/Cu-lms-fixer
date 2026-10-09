/**
 * Background Service Worker for CU LMS Fixer & Downloader
 * Handles native Chrome downloads and batch download queuing.
 */

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== "string") return undefined;
  return filename
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/^\.+/, "")
    .replace(/^_+/, "")
    .trim()
    .slice(0, 200);
}

function isValidHttpUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedFileUrl(fileUrl) {
  try {
    const url = new URL(fileUrl);
    // Primary: any pluginfile or resource on CU LMS, CUIMS, and subsidiary portals
    if (
      url.hostname === "lms.cuchd.in" ||
      url.hostname.endsWith(".cuchd.in") ||
      url.hostname.endsWith(".cuims.in") ||
      url.hostname.endsWith(".cuidol.in") ||
      url.hostname.endsWith(".onlinecu.in") ||
      url.hostname.endsWith(".culko.in") ||
      url.hostname.endsWith(".chandigarhuniversity.ac.in")
    ) {
      return true;
    }
    // Secondary: linked external file hosts or document viewers
    const allowedHosts = [
      "view.officeapps.live.com",
      "docs.google.com",
      "onedrive.live.com",
      "sharepoint.com",
    ];
    return allowedHosts.some((h) => url.hostname === h || url.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

function isAllowedOrigin(urlStr) {
  try {
    const u = new URL(urlStr);
    return (
      u.hostname.endsWith(".cuchd.in") ||
      u.hostname.endsWith(".cuims.in") ||
      u.hostname.endsWith(".cuidol.in") ||
      u.hostname.endsWith(".onlinecu.in") ||
      u.hostname.endsWith(".culko.in") ||
      u.hostname.endsWith(".chandigarhuniversity.ac.in")
    );
  } catch {
    return false;
  }
}

function triggerDownload(fileUrl, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: fileUrl,
        filename: sanitizeFilename(filename) || undefined,
        conflictAction: "uniquify",
        saveAs: false,
      },
      (downloadId) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
        } else {
          resolve(downloadId);
        }
      },
    );
  });
}

function isAllowedSender(sender) {
  if (!sender || !sender.tab?.url) return true; // extension internal or popup
  const url = sender.tab.url;
  if (url.startsWith("chrome-extension://")) return true;
  return isAllowedOrigin(url);
}

// ============================================================================
// GITHUB AUTO-UPDATE DETECTOR & SCHEDULER
// ============================================================================
const GITHUB_REPO_PATH = "ankitpandeynine/Cu-lms-fixer";
const GITHUB_BRANCH_NAME = "main";

async function checkForGitHubUpdate() {
  try {
    const localStored = await chrome.storage.local.get(["installedCommit"]);
    let localCommit = localStored.installedCommit;

    if (!localCommit) {
      try {
        const vRes = await fetch(chrome.runtime.getURL("version.json"));
        const vJson = await vRes.json();
        if (vJson.commit) localCommit = vJson.commit;
      } catch (e) {}
    }

    const manifest = chrome.runtime.getManifest();
    const currentVer = manifest.version;

    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO_PATH}/commits/${GITHUB_BRANCH_NAME}`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        cache: "no-store",
      }
    );

    if (!resp.ok) {
      console.warn("[CU-LMS BG] GitHub commit check returned HTTP", resp.status);
      return { error: `HTTP ${resp.status}`, updateAvailable: false };
    }

    const data = await resp.json();
    const remoteSha = data.sha || "";
    const remoteMsg = data.commit?.message?.split("\n")[0] || "";
    const remoteDate = data.commit?.author?.date || "";

    // Check remote manifest version
    let remoteVersion = currentVer;
    try {
      const mResp = await fetch(
        `https://raw.githubusercontent.com/${GITHUB_REPO_PATH}/${GITHUB_BRANCH_NAME}/manifest.json`,
        { cache: "no-store" }
      );
      if (mResp.ok) {
        const mData = await mResp.json();
        if (mData.version) remoteVersion = mData.version;
      }
    } catch (e) {}

    // Initialize local commit on first run if missing
    if (!localCommit && remoteSha) {
      localCommit = remoteSha.slice(0, 7);
      await chrome.storage.local.set({ installedCommit: localCommit });
    }

    const isUpdateAvailable = Boolean(
      remoteSha &&
      localCommit &&
      !remoteSha.startsWith(localCommit.slice(0, 7))
    );

    await chrome.storage.local.set({
      updateAvailable: isUpdateAvailable,
      remoteCommit: remoteSha,
      remoteCommitMsg: remoteMsg,
      remoteCommitDate: remoteDate,
      remoteVersion: remoteVersion,
      lastUpdateCheckTime: Date.now(),
    });

    if (isUpdateAvailable) {
      chrome.action.setBadgeText({ text: "NEW" });
      chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
      console.log(
        `[CU-LMS BG] Update available: ${remoteSha.slice(0, 7)} - "${remoteMsg}"`
      );
    } else {
      chrome.action.setBadgeText({ text: "" });
    }

    return {
      updateAvailable: isUpdateAvailable,
      localCommit: localCommit ? localCommit.slice(0, 7) : "",
      remoteCommit: remoteSha ? remoteSha.slice(0, 7) : "",
      remoteCommitMsg: remoteMsg,
      remoteVersion,
      currentVersion: currentVer,
    };
  } catch (err) {
    console.error("[CU-LMS BG] Update check failed:", err);
    return { error: err.message, updateAvailable: false };
  }
}

// Schedule update checks every 30 minutes and run on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("check_extension_updates", { periodInMinutes: 30 });
  checkForGitHubUpdate();
});

chrome.runtime.onStartup.addListener(() => {
  checkForGitHubUpdate();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "check_extension_updates") {
    checkForGitHubUpdate();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender origin if sender tab is present
  if (!isAllowedSender(sender)) {
    sendResponse({ ok: false, error: "Unauthorized sender origin." });
    return false;
  }

  if (message?.type === "CHECK_FOR_UPDATES") {
    (async () => {
      const info = await checkForGitHubUpdate();
      sendResponse(info);
    })();
    return true;
  }

  if (message?.type === "RELOAD_EXTENSION") {
    chrome.runtime.reload();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "download-file") {
    const { fileUrl, filename } = message;

    if (!fileUrl || !isValidHttpUrl(fileUrl) || !isAllowedFileUrl(fileUrl)) {
      sendResponse({
        ok: false,
        error: "The LMS did not provide a valid downloadable file link.",
      });
      return false;
    }

    (async () => {
      try {
        const downloadId = await triggerDownload(fileUrl, filename);
        sendResponse({ ok: true, downloadId });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || "Failed to start download." });
      }
    })();

    return true; // Keep channel open for async response
  }

  if (message?.type === "batch-download-files") {
    const files = Array.isArray(message.files) ? message.files : [];
    if (files.length === 0) {
      sendResponse({ ok: false, error: "No files to download." });
      return false;
    }

    (async () => {
      const results = [];
      for (const item of files) {
        if (!item.fileUrl || !isAllowedFileUrl(item.fileUrl)) continue;
        try {
          const downloadId = await triggerDownload(item.fileUrl, item.filename);
          results.push({ ok: true, fileUrl: item.fileUrl, downloadId });
        } catch (err) {
          results.push({ ok: false, fileUrl: item.fileUrl, error: err.message });
        }
        // Polite delay between downloads to prevent throttling
        await new Promise((r) => setTimeout(r, 600));
      }
      sendResponse({ ok: true, total: files.length, downloaded: results.filter((r) => r.ok).length });
    })();

    return true;
  }

  return false;
});
