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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender origin if sender tab is present
  if (sender.tab?.url && !isAllowedOrigin(sender.tab.url)) {
    sendResponse({ ok: false, error: "Unauthorized sender origin." });
    return false;
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
