/**
 * CU LMS Fixer & Downloader - Content Script
 * Compatible with Manifest V3.
 *
 * Supports:
 * - 1-Click download of all PDF, PPT, PPTX, and document resources.
 * - Resolves embedded PDFs/PPTs in <object>, <embed>, <iframe> (Office/PDF.js),
 *   .resourceworkaround, and redirect responses.
 * - Active page action bar when directly viewing /mod/resource/view.php or /mod/page/view.php.
 * - 1-Click rich & plain clipboard copying with in-memory caching.
 * - Batch "Download All Files" button for course sections.
 * - SOP popup suppression and student portal integration.
 */

const RESOURCE_SELECTOR = 'a[href*="/mod/resource/view.php?id="]';
const PAGE_SELECTOR = 'a[href*="/mod/page/view.php?id="]';
const BOOK_SELECTOR = 'a[href*="/mod/book/view.php?id="]';
const FOLDER_SELECTOR = 'a[href*="/mod/folder/view.php?id="]';

const BUTTON_CLASS = "cu-lms-download-button";
const COPY_BUTTON_CLASS = "cu-lms-copy-button";
const BATCH_BTN_CLASS = "cu-lms-batch-download-btn";
const ACTION_BAR_CLASS = "cu-lms-page-action-bar";

const DEFAULT_SETTINGS = {
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
};

let currentSettings = { ...DEFAULT_SETTINGS };
let userOpenedAiPopup = false;
let quizSolverWidgetEl = null;
let isAutoSolvingQuiz = false;

// In-memory caches to prevent redundant network fetches
const fileCache = new Map();
const textCache = new Map();

// SVG Icons for buttons
const ICON_DOWNLOAD = `<svg class="cu-btn-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
const ICON_COPY = `<svg class="cu-btn-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 2H9a3 3 0 01-3-2z"/></svg>`;
const ICON_CHECK = `<svg class="cu-btn-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`;

const FILE_EXT_REGEX = /\.(pdf|pptx?|docx?|xlsx?|txt|zip|rar|csv)(?:[?#].*)?$/i;

function safeFilename(filename, fallback = "download") {
  if (!filename || typeof filename !== "string") return fallback;
  const clean = filename
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/^\.+/, "")
    .replace(/^_+/, "")
    .trim();
  return clean.slice(0, 180) || fallback;
}

function parseContentDisposition(disposition) {
  if (!disposition) return null;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {}
  }
  const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
  if (match) return match[1].trim();
  return null;
}

function inferExtensionFromContentType(contentType) {
  if (!contentType) return "";
  const type = contentType.toLowerCase();
  if (type.includes("pdf")) return "pdf";
  if (type.includes("presentationml") || type.includes("powerpoint")) return "pptx";
  if (type.includes("wordprocessingml") || type.includes("msword")) return "docx";
  if (type.includes("spreadsheetml") || type.includes("excel")) return "xlsx";
  if (type.includes("zip")) return "zip";
  if (type.includes("text/plain")) return "txt";
  return "";
}

function getExtensionFromUrl(urlStr) {
  try {
    const pathname = new URL(urlStr, location.origin).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : "";
  } catch {
    return "";
  }
}

function filenameFromUrl(fileUrl, fallbackTitle = "", extHint = "") {
  try {
    const pathname = new URL(fileUrl, location.origin).pathname;
    const raw = pathname.split("/").pop() || "";
    let decoded = decodeURIComponent(raw).trim();
    if (!decoded || decoded === "view.php" || decoded === "pluginfile.php" || decoded === "content") {
      const ext = extHint || getExtensionFromUrl(fileUrl) || "pdf";
      return safeFilename(`${fallbackTitle || "document"}.${ext}`);
    }
    return safeFilename(decoded);
  } catch {
    const ext = extHint || "pdf";
    return safeFilename(`${fallbackTitle || "document"}.${ext}`);
  }
}

/**
 * Extracts a downloadable file link and name from a parsed DOM Document.
 */
function extractFileFromDoc(doc, baseUrl, fallbackTitle = "") {
  // 1. Embedded <object id="resourceobject" data="..."> (Moodle standard PDF)
  const obj = doc.querySelector('object#resourceobject[data], object[data*="/pluginfile.php/"], object[data]');
  if (obj) {
    const rawData = obj.getAttribute("data");
    if (rawData) {
      const fileUrl = new URL(rawData, baseUrl).href;
      const filename = filenameFromUrl(fileUrl, fallbackTitle, "pdf");
      return { fileUrl, filename };
    }
  }

  // 2. Embedded <embed src="...">
  const emb = doc.querySelector('embed[src*="/pluginfile.php/"], embed[src]');
  if (emb) {
    const rawSrc = emb.getAttribute("src");
    if (rawSrc) {
      const fileUrl = new URL(rawSrc, baseUrl).href;
      const filename = filenameFromUrl(fileUrl, fallbackTitle);
      return { fileUrl, filename };
    }
  }

  // 3. Embedded <iframe src="..."> (Office Web Viewer / PDF.js / direct pluginfile)
  const iframes = [...doc.querySelectorAll("iframe[src]")];
  for (const iframe of iframes) {
    const src = iframe.getAttribute("src") || "";
    try {
      const parsed = new URL(src, baseUrl);
      // Office viewer: ?src=<encoded_url>
      const officeSrc = parsed.searchParams.get("src");
      if (officeSrc && (officeSrc.includes("/pluginfile.php/") || FILE_EXT_REGEX.test(officeSrc))) {
        const fileUrl = new URL(officeSrc, baseUrl).href;
        return { fileUrl, filename: filenameFromUrl(fileUrl, fallbackTitle, "pptx") };
      }
      // PDF.js viewer: ?file=<encoded_url>
      const pdfJsFile = parsed.searchParams.get("file");
      if (pdfJsFile && (pdfJsFile.includes("/pluginfile.php/") || FILE_EXT_REGEX.test(pdfJsFile))) {
        const fileUrl = new URL(pdfJsFile, baseUrl).href;
        return { fileUrl, filename: filenameFromUrl(fileUrl, fallbackTitle, "pdf") };
      }
      // Google Docs viewer: ?url=<encoded_url>
      const gdocsUrl = parsed.searchParams.get("url");
      if (gdocsUrl && (gdocsUrl.includes("/pluginfile.php/") || FILE_EXT_REGEX.test(gdocsUrl))) {
        const fileUrl = new URL(gdocsUrl, baseUrl).href;
        return { fileUrl, filename: filenameFromUrl(fileUrl, fallbackTitle) };
      }
      // Direct pluginfile src
      if (parsed.pathname.includes("/pluginfile.php/")) {
        const fileUrl = parsed.href;
        return { fileUrl, filename: filenameFromUrl(fileUrl, fallbackTitle) };
      }
    } catch {}
  }

  // 4. Moodle fallback anchor inside .resourceworkaround
  const workaroundAnchor = doc.querySelector(".resourceworkaround a[href]");
  if (workaroundAnchor) {
    const fileUrl = new URL(workaroundAnchor.href, baseUrl).href;
    const downloadAttr = workaroundAnchor.getAttribute("download");
    const filename = downloadAttr
      ? safeFilename(downloadAttr)
      : filenameFromUrl(fileUrl, fallbackTitle || workaroundAnchor.textContent.trim());
    return { fileUrl, filename };
  }

  // 5. Any anchor linking to /pluginfile.php/
  const pluginAnchors = [...doc.querySelectorAll('a[href*="/pluginfile.php/"]')];
  // Filter out profile pics / user icons
  const contentAnchors = pluginAnchors.filter((a) => !a.href.includes("/user/icon/"));
  if (contentAnchors.length > 0) {
    // Prioritize links inside .resourcecontent or #region-main
    const bestAnchor =
      contentAnchors.find((a) => a.closest(".resourcecontent, #region-main, .activity-header")) ||
      contentAnchors[0];
    const fileUrl = new URL(bestAnchor.href, baseUrl).href;
    const downloadAttr = bestAnchor.getAttribute("download");
    const filename = downloadAttr
      ? safeFilename(downloadAttr)
      : filenameFromUrl(fileUrl, fallbackTitle || bestAnchor.textContent.trim());
    return { fileUrl, filename };
  }

  // 6. Any anchor matching file extension
  const extAnchors = [...doc.querySelectorAll("a[href]")].filter((a) => FILE_EXT_REGEX.test(a.href));
  if (extAnchors.length > 0) {
    const bestAnchor = extAnchors[0];
    const fileUrl = new URL(bestAnchor.href, baseUrl).href;
    const downloadAttr = bestAnchor.getAttribute("download");
    const filename = downloadAttr
      ? safeFilename(downloadAttr)
      : filenameFromUrl(fileUrl, fallbackTitle || bestAnchor.textContent.trim());
    return { fileUrl, filename };
  }

  // 7. Regex match inside <script> tags for redirected or dynamically rendered URLs
  const scripts = [...doc.querySelectorAll("script")];
  for (const s of scripts) {
    const scriptText = s.textContent || "";
    const match = scriptText.match(/https?:\/\/[^\s"'<>]+\/pluginfile\.php\/[^\s"'<>]+/);
    if (match) {
      const fileUrl = match[0].replace(/\\/g, "");
      return { fileUrl, filename: filenameFromUrl(fileUrl, fallbackTitle) };
    }
  }

  // 8. Meta refresh tag
  const metaRefresh = doc.querySelector('meta[http-equiv="refresh"]');
  if (metaRefresh) {
    const content = metaRefresh.getAttribute("content") || "";
    const match = content.match(/url=(.+)$/i);
    if (match) {
      const fileUrl = new URL(match[1].trim(), baseUrl).href;
      return { fileUrl, filename: filenameFromUrl(fileUrl, fallbackTitle) };
    }
  }

  return null;
}

/**
 * Universal resolver: fetches an LMS resource URL and returns { fileUrl, filename }.
 */
async function resolveOriginalFile(resourceUrl, fallbackTitle = "") {
  if (fileCache.has(resourceUrl)) {
    return fileCache.get(resourceUrl);
  }

  const response = await fetch(resourceUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`CU LMS returned status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const contentDisp = response.headers.get("content-disposition");
  const dispFilename = parseContentDisposition(contentDisp);
  const resUrl = response.url;

  // Case A: Redirected directly to the binary file payload
  const isDirectFile =
    response.redirected ||
    resUrl !== resourceUrl ||
    resUrl.includes("/pluginfile.php/") ||
    FILE_EXT_REGEX.test(resUrl) ||
    (contentType && !contentType.includes("text/html") && !contentType.includes("text/xml"));

  if (isDirectFile && (resUrl.includes("/pluginfile.php/") || FILE_EXT_REGEX.test(resUrl) || dispFilename)) {
    const extHint = inferExtensionFromContentType(contentType);
    const filename = dispFilename || filenameFromUrl(resUrl, fallbackTitle, extHint);
    const result = { fileUrl: resUrl, filename };
    fileCache.set(resourceUrl, result);
    return result;
  }

  // Case B: HTML page returned (embedded viewer or resource page)
  const html = await response.text();
  const page = new DOMParser().parseFromString(html, "text/html");
  const extracted = extractFileFromDoc(page, resourceUrl, fallbackTitle);

  if (extracted) {
    fileCache.set(resourceUrl, extracted);
    return extracted;
  }

  // Fallback: If redirected URL itself is on pluginfile.php
  if (resUrl.includes("/pluginfile.php/")) {
    const filename = dispFilename || filenameFromUrl(resUrl, fallbackTitle);
    const result = { fileUrl: resUrl, filename };
    fileCache.set(resourceUrl, result);
    return result;
  }

  throw new Error("Could not find the original PDF/PPT link for this resource.");
}

/**
 * Structured content extractor for reading pages.
 * Produces clean Markdown-formatted plain text and sanitized HTML.
 */
function extractReadableContent(doc) {
  const main =
    doc.querySelector("#region-main") ||
    doc.querySelector(".region-main") ||
    doc.querySelector('[role="main"]') ||
    doc.body;

  if (!main) throw new Error("The reading material content was not found.");

  const clone = main.cloneNode(true);

  // Strip UI chrome, headers, and extraneous widgets
  clone
    .querySelectorAll(
      "script, style, noscript, iframe, .activity-header, .completion-info, [data-region='activity-information'], ." +
        ACTION_BAR_CLASS +
        ", .breadcrumb, nav, .sr-only, .activity-navigation",
    )
    .forEach((el) => el.remove());

  // Convert to structured plain text
  let plain = "";
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      plain += node.nodeValue;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag === "h1") plain += "\n\n# ";
      else if (tag === "h2") plain += "\n\n## ";
      else if (tag === "h3") plain += "\n\n### ";
      else if (tag === "h4" || tag === "h5" || tag === "h6") plain += "\n\n#### ";
      else if (tag === "p") plain += "\n\n";
      else if (tag === "br") plain += "\n";
      else if (tag === "li") plain += "\n• ";
      else if (tag === "pre" || tag === "code") plain += "\n```\n";
      else if (tag === "tr") plain += "\n";
      else if (tag === "td" || tag === "th") plain += "  |  ";

      for (const child of node.childNodes) {
        walk(child);
      }

      if (tag === "pre" || tag === "code") plain += "\n```\n";
      else if (tag === "p" || tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") plain += "\n";
    }
  }
  walk(clone);

  plain = plain
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!plain) throw new Error("This reading material does not contain copyable text.");

  return { plain, html: clone.innerHTML };
}

/**
 * Writes dual-format text to clipboard (rich HTML + clean plain text).
 */
async function copyFormattedContent({ plain, html }) {
  // Option 1: ClipboardItem with HTML and Plain Text
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/plain": new Blob([plain], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      });
      await navigator.clipboard.write([item]);
      return;
    }
  } catch {}

  // Option 2: Plain text writeText
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain);
      return;
    }
  } catch {}

  // Option 3: Fallback textarea execCommand
  const textarea = document.createElement("textarea");
  textarea.value = plain;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard access was blocked by the browser.");
}

/**
 * Toast notifications for user feedback
 */
function showToast(message, type = "success", duration = 3000) {
  document.querySelectorAll(".cu-lms-toast").forEach((t) => t.remove());

  const toast = document.createElement("div");
  toast.className = `cu-lms-toast cu-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px) scale(0.95)";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function resourceRow(link) {
  return link.closest('[data-region="activity-card"], .activity-item, .activityinstance, li.activity');
}

function cleanActivityTitle(text) {
  return (text || "")
    .replace(/\s+(File|Page|URL|Book|Folder)$/i, "")
    .replace(/[\n\r]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Injects 1-Click Download button on course list file links.
 */
function addDownloadButton(link) {
  if (!currentSettings.enableDownloadButton) return;

  const row = resourceRow(link);
  if (!row || row.querySelector(`.${BUTTON_CLASS}`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.innerHTML = `${ICON_DOWNLOAD}<span>Download</span>`;

  const title = cleanActivityTitle(link.textContent);
  button.title = `Download ${title}`;
  button.setAttribute("aria-label", button.title);

  button.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      button.disabled = true;
      button.innerHTML = `<span>Starting…</span>`;

      try {
        const { fileUrl, filename } = await resolveOriginalFile(link.href, title);

        chrome.runtime.sendMessage(
          { type: "download-file", resourceUrl: link.href, fileUrl, filename },
          (result) => {
            if (chrome.runtime.lastError || !result?.ok) {
              button.innerHTML = `<span>Try again</span>`;
              button.title = result?.error || "Could not start download. Try again.";
              button.disabled = false;
            } else {
              button.classList.add("cu-success");
              button.innerHTML = `${ICON_CHECK}<span>Queued</span>`;
              button.title = `Downloaded: ${filename}`;
              button.disabled = false;
            }
            setTimeout(() => {
              button.classList.remove("cu-success");
              button.innerHTML = `${ICON_DOWNLOAD}<span>Download</span>`;
              button.title = `Download ${title}`;
            }, 2500);
          },
        );
      } catch (error) {
        button.innerHTML = `<span>Try again</span>`;
        button.title = error instanceof Error ? error.message : "Could not find file.";
        button.disabled = false;
        setTimeout(() => {
          button.innerHTML = `${ICON_DOWNLOAD}<span>Download</span>`;
          button.title = `Download ${title}`;
        }, 3500);
      }
    },
    true,
  );

  const target = row.querySelector(".activity-name-area, .activityinstance, .activity-item") || row;
  target.append(button);
}

/**
 * Injects 1-Click Copy Content button on course list reading links.
 */
function addCopyButton(link) {
  if (!currentSettings.enableCopyButton) return;

  const row = resourceRow(link);
  if (!row || row.querySelector(`.${COPY_BUTTON_CLASS}`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = COPY_BUTTON_CLASS;
  button.innerHTML = `${ICON_COPY}<span>Copy content</span>`;

  const title = cleanActivityTitle(link.textContent);
  button.title = `Copy reading material from ${title}`;
  button.setAttribute("aria-label", button.title);

  button.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      button.disabled = true;
      button.innerHTML = `<span>Copying…</span>`;

      try {
        let content = textCache.get(link.href);
        if (!content) {
          const response = await fetch(link.href, { credentials: "include" });
          if (!response.ok) throw new Error(`CU LMS returned ${response.status}`);
          const page = new DOMParser().parseFromString(await response.text(), "text/html");
          content = extractReadableContent(page);
          textCache.set(link.href, content);
        }

        await copyFormattedContent(content);

        button.classList.add("cu-success");
        button.innerHTML = `${ICON_CHECK}<span>Copied</span>`;
        button.title = "Reading material copied to clipboard!";
        showToast(`Copied "${title}" to clipboard!`, "success");
      } catch (error) {
        button.innerHTML = `<span>Try again</span>`;
        button.title = error instanceof Error ? error.message : "Could not copy.";
        showToast(button.title, "error");
      }

      button.disabled = false;
      setTimeout(() => {
        button.classList.remove("cu-success");
        button.innerHTML = `${ICON_COPY}<span>Copy content</span>`;
        button.title = `Copy reading material from ${title}`;
      }, 2500);
    },
    true,
  );

  const target = row.querySelector(".activity-name-area, .activityinstance, .activity-item") || row;
  target.append(button);
}

/**
 * Injects "Download All (N)" button in course section headers.
 */
function addSectionBatchDownload(sectionEl) {
  if (!currentSettings.enableSectionDownloadAll) return;
  if (sectionEl.querySelector(`.${BATCH_BTN_CLASS}`)) return;

  const links = [...sectionEl.querySelectorAll(RESOURCE_SELECTOR)];
  if (links.length < 2) return; // Only show if 2 or more files in section

  const header =
    sectionEl.querySelector(".sectionname, .course-section-header, [data-region='section-title']") ||
    sectionEl.querySelector("h3, h4");
  if (!header) return;

  const container = document.createElement("span");
  container.className = "cu-lms-section-batch-container";

  const button = document.createElement("button");
  button.type = "button";
  button.className = BATCH_BTN_CLASS;
  button.innerHTML = `${ICON_DOWNLOAD}<span>Download All</span><span class="cu-lms-badge">${links.length}</span>`;
  button.title = `Download all ${links.length} files in this section`;

  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    button.disabled = true;
    let successCount = 0;

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const title = cleanActivityTitle(link.textContent);
      button.innerHTML = `<span>Downloading ${i + 1}/${links.length}…</span>`;

      try {
        const { fileUrl, filename } = await resolveOriginalFile(link.href, title);
        await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: "download-file", resourceUrl: link.href, fileUrl, filename },
            () => resolve(),
          );
        });
        successCount++;
      } catch (err) {
        console.warn(`Could not download ${title}:`, err);
      }

      // Small throttle between queue requests
      await new Promise((r) => setTimeout(r, 600));
    }

    button.innerHTML = `${ICON_CHECK}<span>${successCount}/${links.length} Downloaded</span>`;
    showToast(`Downloaded ${successCount} of ${links.length} files!`, "success");

    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = `${ICON_DOWNLOAD}<span>Download All</span><span class="cu-lms-badge">${links.length}</span>`;
    }, 3500);
  });

  container.appendChild(button);
  header.appendChild(container);
}

/**
 * Injects top action bar when directly viewing /mod/resource/view.php
 */
function initResourcePageAction() {
  if (!location.pathname.startsWith("/mod/resource/view.php")) return;
  if (document.querySelector(`.${ACTION_BAR_CLASS}`)) return;

  const targetContainer = document.querySelector("#region-main, .region-main, [role='main']");
  if (!targetContainer) return;

  // Extract from active DOM first
  const pageTitle = cleanActivityTitle(document.querySelector("h2, .page-header-headings")?.textContent || "Resource");
  const extracted = extractFileFromDoc(document, location.href, pageTitle);

  const bar = document.createElement("div");
  bar.className = ACTION_BAR_CLASS;

  const ext = extracted ? getExtensionFromUrl(extracted.fileUrl) || "PDF" : "FILE";
  const displayFilename = extracted?.filename || `${pageTitle}.${ext.toLowerCase()}`;

  bar.innerHTML = `
    <div class="cu-lms-bar-info">
      <span class="cu-lms-file-badge">${ext}</span>
      <span class="cu-lms-bar-title" title="${displayFilename}">${displayFilename}</span>
    </div>
    <div class="cu-lms-bar-actions">
      <button type="button" class="cu-lms-bar-btn cu-lms-bar-btn-primary" id="cuDirectDownloadBtn">
        ${ICON_DOWNLOAD}<span>Download File</span>
      </button>
      <button type="button" class="cu-lms-bar-btn cu-lms-bar-btn-secondary" id="cuDirectCopyBtn">
        ${ICON_COPY}<span>Copy Page Text</span>
      </button>
    </div>
  `;

  // Insert at top of main region
  targetContainer.prepend(bar);

  // Wire download button
  const downloadBtn = bar.querySelector("#cuDirectDownloadBtn");
  downloadBtn?.addEventListener("click", async () => {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `<span>Starting…</span>`;

    try {
      const fileData = extracted || (await resolveOriginalFile(location.href, pageTitle));
      chrome.runtime.sendMessage(
        { type: "download-file", resourceUrl: location.href, fileUrl: fileData.fileUrl, filename: fileData.filename },
        (res) => {
          if (chrome.runtime.lastError || !res?.ok) {
            downloadBtn.innerHTML = `<span>Try again</span>`;
            showToast(res?.error || "Download failed. Please try again.", "error");
          } else {
            downloadBtn.innerHTML = `${ICON_CHECK}<span>Downloaded</span>`;
            showToast(`Downloading: ${fileData.filename}`, "success");
          }
          setTimeout(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = `${ICON_DOWNLOAD}<span>Download File</span>`;
          }, 2500);
        },
      );
    } catch (err) {
      downloadBtn.innerHTML = `<span>Try again</span>`;
      downloadBtn.disabled = false;
      showToast(err instanceof Error ? err.message : "Could not find file.", "error");
    }
  });

  // Wire copy button
  const copyBtn = bar.querySelector("#cuDirectCopyBtn");
  copyBtn?.addEventListener("click", async () => {
    copyBtn.disabled = true;
    copyBtn.innerHTML = `<span>Copying…</span>`;
    try {
      const content = extractReadableContent(document);
      await copyFormattedContent(content);
      copyBtn.innerHTML = `${ICON_CHECK}<span>Copied</span>`;
      showToast("Page content copied to clipboard!", "success");
    } catch (err) {
      copyBtn.innerHTML = `<span>Try again</span>`;
      showToast(err instanceof Error ? err.message : "Could not copy text.", "error");
    }
    setTimeout(() => {
      copyBtn.disabled = false;
      copyBtn.innerHTML = `${ICON_COPY}<span>Copy Page Text</span>`;
    }, 2500);
  });
}

/**
 * Injects top action bar when directly viewing /mod/page/view.php or /mod/book/view.php
 */
function initReadingPageAction() {
  const isPage = location.pathname.startsWith("/mod/page/view.php");
  const isBook = location.pathname.startsWith("/mod/book/view.php");
  if (!isPage && !isBook) return;
  if (document.querySelector(`.${ACTION_BAR_CLASS}`)) return;

  const targetContainer = document.querySelector("#region-main, .region-main, [role='main']");
  if (!targetContainer) return;

  const pageTitle = cleanActivityTitle(
    document.querySelector("h2, .page-header-headings, [role='main'] h3")?.textContent || "Reading Material",
  );

  const bar = document.createElement("div");
  bar.className = ACTION_BAR_CLASS;
  bar.innerHTML = `
    <div class="cu-lms-bar-info">
      <span class="cu-lms-file-badge">${isBook ? "BOOK" : "PAGE"}</span>
      <span class="cu-lms-bar-title" title="${pageTitle}">${pageTitle}</span>
    </div>
    <div class="cu-lms-bar-actions">
      <button type="button" class="cu-lms-bar-btn cu-lms-bar-btn-primary" id="cuDirectReadingCopyBtn">
        ${ICON_COPY}<span>Copy Entire Content</span>
      </button>
    </div>
  `;

  targetContainer.prepend(bar);

  const copyBtn = bar.querySelector("#cuDirectReadingCopyBtn");
  copyBtn?.addEventListener("click", async () => {
    copyBtn.disabled = true;
    copyBtn.innerHTML = `<span>Copying…</span>`;
    try {
      const content = extractReadableContent(document);
      await copyFormattedContent(content);
      copyBtn.innerHTML = `${ICON_CHECK}<span>Copied</span>`;
      showToast("Reading material copied to clipboard!", "success");
    } catch (err) {
      copyBtn.innerHTML = `<span>Try again</span>`;
      showToast(err instanceof Error ? err.message : "Could not copy content.", "error");
    }
    setTimeout(() => {
      copyBtn.disabled = false;
      copyBtn.innerHTML = `${ICON_COPY}<span>Copy Entire Content</span>`;
    }, 2500);
  });
}

// Track explicit user interactions with the AI tools buttons / panel
window.addEventListener(
  "click",
  (event) => {
    if (
      event.target.closest(
        "#ai-lib-close, .ai-lib-icon-btn[aria-label='Close'], .ai-lib-icon-btn[title='Close']",
      )
    ) {
      userOpenedAiPopup = false;
    } else if (
      event.target.closest(
        "#ai-lib-fab, .ai-lib-fab, [aria-controls='ai-lib-panel'], #ai-lib-panel, .ai-lib-panel, [data-lib-url], [data-lib-id]",
      )
    ) {
      userOpenedAiPopup = true;
    }
  },
  true,
);

window.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter" || event.key === " ") {
      if (
        event.target.closest(
          "#ai-lib-fab, .ai-lib-fab, [aria-controls='ai-lib-panel']",
        )
      ) {
        userOpenedAiPopup = true;
      }
    }
  },
  true,
);

function dismissAiPopup(force = false) {
  if (userOpenedAiPopup && !force) return;

  const panel =
    document.getElementById("ai-lib-panel") ||
    document.querySelector(".ai-lib-panel");
  if (!panel) return;

  const isVisible =
    panel.style.display === "flex" ||
    (panel.style.display !== "none" &&
      panel.style.display !== "" &&
      window.getComputedStyle(panel).display !== "none");

  if (!isVisible) {
    if (force) {
      panel.style.display = "none";
      const fab =
        document.getElementById("ai-lib-fab") ||
        document.querySelector(".ai-lib-fab");
      if (fab) fab.style.display = "none";
    }
    return;
  }

  const dontShow =
    document.getElementById("ai-lib-dontshow") ||
    panel.querySelector(".ai-lib-dontshow-cb");
  if (dontShow && !dontShow.checked) {
    dontShow.checked = true;
    dontShow.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const closeBtn = document.getElementById("ai-lib-close");
  if (closeBtn) closeBtn.click();

  panel.style.display = "none";

  const fab =
    document.getElementById("ai-lib-fab") ||
    document.querySelector(".ai-lib-fab");
  if (fab) {
    fab.classList.remove("ai-lib-fab--active");
    fab.setAttribute("aria-expanded", "false");
    if (force) fab.style.display = "none";
  }
}

/**
 * Scan DOM and apply buttons & page enhancements.
 */
function scan() {
  if (currentSettings.hideSopPermanently) {
    dismissAiPopup(true);
  } else if (currentSettings.disableAutoSopPopup) {
    dismissAiPopup(false);
  }

  // Active page direct view action bars
  initResourcePageAction();
  initReadingPageAction();

  // Course list page enhancements
  if (currentSettings.enableDownloadButton) {
    document.querySelectorAll(RESOURCE_SELECTOR).forEach(addDownloadButton);
  }

  if (currentSettings.enableCopyButton) {
    document.querySelectorAll(PAGE_SELECTOR).forEach(addCopyButton);
    document.querySelectorAll(BOOK_SELECTOR).forEach(addCopyButton);
  }

  if (currentSettings.enableSectionDownloadAll) {
    document.querySelectorAll(".section, li.section, [data-region='section-summary']").forEach(addSectionBatchDownload);
  }

  // Quiz Auto-Solver check
  if (currentSettings.enableQuizSolver) {
    checkAndInitQuizSolver();
  }
}

/**
 * Quiz Auto-Solver module
 */
function checkAndInitQuizSolver() {
  const isQuizView = location.pathname.includes("/mod/quiz/view.php");
  const isQuizAttempt = location.pathname.includes("/mod/quiz/attempt.php");
  const isQuizSummary = location.pathname.includes("/mod/quiz/summary.php") || document.querySelector(".quizsummaryofattempt");
  const isQuizReview = location.pathname.includes("/mod/quiz/review.php");

  // 1. Auto proceed / click "Attempt quiz" button if present on view.php
  if (isQuizView && (currentSettings.enableAutoProceed || currentSettings.enableQuizSolver)) {
    const attemptBtn = [...document.querySelectorAll("button, input[type='submit'], a")].find(
      (el) => el.textContent.trim().toLowerCase().includes("attempt quiz") || el.textContent.trim().toLowerCase().includes("re-attempt quiz")
    );
    if (attemptBtn && !attemptBtn.dataset.cuAutoClicked) {
      attemptBtn.dataset.cuAutoClicked = "true";
      showToast("Auto-clicking 'Attempt Quiz'...", "success");
      setTimeout(() => attemptBtn.click(), 600);
    }

    // Modal popup: "Start attempt"
    const modalStartBtn = [...document.querySelectorAll(".modal button, .modal input[type='submit'], div[role='dialog'] button, .moodle-dialogue-bd button")].find(
      (el) => el.textContent.trim().toLowerCase().includes("start attempt")
    );
    if (modalStartBtn && !modalStartBtn.dataset.cuAutoClicked) {
      modalStartBtn.dataset.cuAutoClicked = "true";
      showToast("Auto-clicking 'Start attempt' modal...", "success");
      setTimeout(() => modalStartBtn.click(), 600);
    }
  }

  // 2. Summary page -> Click "Submit all and finish"
  if (isQuizSummary && currentSettings.enableAutoProceed) {
    const submitAllBtn = [...document.querySelectorAll("input[type='submit'], button")].find(
      (el) => el.value?.toLowerCase().includes("submit all and finish") || el.textContent?.toLowerCase().includes("submit all and finish")
    );
    if (submitAllBtn && !submitAllBtn.dataset.cuAutoClicked) {
      submitAllBtn.dataset.cuAutoClicked = "true";
      showToast("Auto-submitting test...", "success");
      setTimeout(() => submitAllBtn.click(), 800);
    }

    // Confirmation modal for submission
    setTimeout(() => {
      const confirmModalBtn = [...document.querySelectorAll(".modal button, .confirmation-dialog button, div[role='dialog'] button, input[type='button']")].find(
        (el) => el.textContent.trim().toLowerCase() === "submit all and finish" || el.value?.toLowerCase() === "submit all and finish"
      );
      if (confirmModalBtn && !confirmModalBtn.dataset.cuAutoClicked) {
        confirmModalBtn.dataset.cuAutoClicked = "true";
        showToast("Final submission confirmed! Quiz complete.", "success");
        confirmModalBtn.click();
        isAutoSolvingQuiz = false;
        chrome.storage.sync.set({ enableAutoProceed: false });
      }
    }, 1200);
  }

  // Active quiz attempt page
  if (isQuizAttempt || document.querySelector(".que, .questionflag, #responseform")) {
    injectQuizSolverWidget();
    if (currentSettings.enableAutoProceed && !isAutoSolvingQuiz) {
      isAutoSolvingQuiz = true;
      setTimeout(() => runAutoSolveLoop(), 1000);
    }
  }
}

function getActiveModelForProvider(provider) {
  const p = (provider || "gemini").toLowerCase();
  if (p === "gemini") return currentSettings.geminiModel || "gemini-2.5-flash";
  if (p === "grok") return currentSettings.grokModel || "grok-beta";
  if (p === "nvidia") return currentSettings.nvidiaModel || "meta/llama-3.1-70b-instruct";
  if (p === "openrouter") return currentSettings.openrouterModel || "meta-llama/llama-3.3-70b-instruct:free";
  return "";
}

function getActiveApiKeyForProvider(provider) {
  const p = (provider || "gemini").toLowerCase();
  if (p === "gemini") return currentSettings.geminiApiKey || "";
  if (p === "grok") return currentSettings.grokApiKey || "";
  if (p === "nvidia") return currentSettings.nvidiaApiKey || "";
  if (p === "openrouter") return currentSettings.openrouterApiKey || "";
  return "";
}

function injectQuizSolverWidget() {
  if (document.getElementById("cuQuizSolverWidget")) return;

  const currentProvider = currentSettings.quizProvider || "gemini";
  const currentModel = getActiveModelForProvider(currentProvider);

  const widget = document.createElement("div");
  widget.id = "cuQuizSolverWidget";
  widget.className = "cu-quiz-solver-widget";
  widget.innerHTML = `
    <div class="cu-quiz-widget-header" id="cuQuizHeader">
      <div class="cu-quiz-header-title">
        <span>⚡ Quiz Solver</span>
        <span class="cu-quiz-header-badge" id="cuHeaderBadge">${currentProvider.toUpperCase()}</span>
      </div>
      <button type="button" class="cu-quiz-header-minimize" id="cuMinimizeBtn" title="Minimize / Expand">_</button>
    </div>

    <div class="cu-quiz-widget-body" id="cuQuizBody">
      <!-- Quick Actions Grid -->
      <div class="cu-quiz-action-grid">
        <button type="button" id="cuSolveCurrentBtn" class="cu-quiz-btn" style="flex: 1;">
          Solve & Mark
        </button>
        <button type="button" id="cuAutoSolveAllBtn" class="cu-quiz-btn ${currentSettings.enableAutoProceed ? 'cu-quiz-btn-active' : 'cu-quiz-btn-secondary'}" style="flex: 1;">
          ${currentSettings.enableAutoProceed ? 'Auto: ON' : 'Auto-Proceed'}
        </button>
      </div>

      <!-- Retractable Model & API Accordion -->
      <button type="button" id="cuToggleRetractBtn" class="cu-quiz-retract-btn">
        <span>⚙️ AI Engine & Keys</span>
        <span id="cuRetractChevron">▼</span>
      </button>

      <div id="cuRetractPanel" class="cu-quiz-retract-panel" style="display: none;">
        <div class="cu-quiz-controls-row">
          <label>Provider:</label>
          <select id="cuWidgetProvider" class="cu-quiz-select">
            <option value="gemini" ${currentProvider === "gemini" ? "selected" : ""}>Google Gemini</option>
            <option value="grok" ${currentProvider === "grok" ? "selected" : ""}>xAI Grok</option>
            <option value="nvidia" ${currentProvider === "nvidia" ? "selected" : ""}>NVIDIA NIM</option>
            <option value="openrouter" ${currentProvider === "openrouter" ? "selected" : ""}>OpenRouter AI</option>
            <option value="lm_studio" ${currentProvider === "lm_studio" ? "selected" : ""}>LM Studio Local</option>
          </select>
        </div>

        <div class="cu-quiz-controls-row">
          <label>Model:</label>
          <input type="text" id="cuWidgetModelInput" class="cu-quiz-input" value="${currentModel}">
        </div>

        <div class="cu-quiz-controls-row">
          <label>API Key:</label>
          <input type="password" id="cuWidgetApiKeyInput" class="cu-quiz-input" placeholder="uses .env if blank" value="${getActiveApiKeyForProvider(currentProvider)}">
        </div>

        <div style="text-align: right; margin-top: 2px;">
          <button type="button" id="cuRetractDoneBtn" style="background:#334155;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.7rem;cursor:pointer;">Retract</button>
        </div>
      </div>

      <div id="cuQuizExplanation" class="cu-quiz-explanation-box" style="display: none;"></div>
    </div>
  `;

  document.body.appendChild(widget);

  // Minimize / Expand widget body
  const header = widget.querySelector("#cuQuizHeader");
  const minimizeBtn = widget.querySelector("#cuMinimizeBtn");
  const toggleMinimize = (e) => {
    if (e.target.id === "cuWidgetProvider") return;
    widget.classList.toggle("cu-minimized");
    minimizeBtn.innerText = widget.classList.contains("cu-minimized") ? "▲" : "_";
  };
  header.addEventListener("click", toggleMinimize);

  // Retract Accordion
  const retractBtn = widget.querySelector("#cuToggleRetractBtn");
  const retractPanel = widget.querySelector("#cuRetractPanel");
  const retractChevron = widget.querySelector("#cuRetractChevron");
  const retractDoneBtn = widget.querySelector("#cuRetractDoneBtn");

  const toggleAccordion = () => {
    const isClosed = retractPanel.style.display === "none";
    retractPanel.style.display = isClosed ? "flex" : "none";
    retractChevron.innerText = isClosed ? "▲" : "▼";
  };
  retractBtn.addEventListener("click", toggleAccordion);
  retractDoneBtn.addEventListener("click", () => {
    retractPanel.style.display = "none";
    retractChevron.innerText = "▼";
  });

  // Provider & Model & Key change inside floating widget
  const widgetProviderSelect = widget.querySelector("#cuWidgetProvider");
  const widgetModelInput = widget.querySelector("#cuWidgetModelInput");
  const widgetApiKeyInput = widget.querySelector("#cuWidgetApiKeyInput");
  const headerBadge = widget.querySelector("#cuHeaderBadge");

  widgetProviderSelect.addEventListener("change", (e) => {
    const prov = e.target.value;
    currentSettings.quizProvider = prov;
    headerBadge.innerText = prov.toUpperCase();
    widgetModelInput.value = getActiveModelForProvider(prov);
    widgetApiKeyInput.value = getActiveApiKeyForProvider(prov);
    chrome.storage.sync.set({ quizProvider: prov });
  });

  widgetModelInput.addEventListener("change", (e) => {
    const prov = currentSettings.quizProvider || "gemini";
    const key = `${prov}Model`;
    currentSettings[key] = e.target.value.trim();
    chrome.storage.sync.set({ [key]: e.target.value.trim() });
  });

  widgetApiKeyInput.addEventListener("change", (e) => {
    const prov = currentSettings.quizProvider || "gemini";
    const key = `${prov}ApiKey`;
    currentSettings[key] = e.target.value.trim();
    chrome.storage.sync.set({ [key]: e.target.value.trim() });
  });

  // Action buttons
  const solveCurrentBtn = widget.querySelector("#cuSolveCurrentBtn");
  solveCurrentBtn.addEventListener("click", async () => {
    solveCurrentBtn.disabled = true;
    solveCurrentBtn.innerText = "Solving...";
    try {
      await solvePageQuestions(currentSettings.quizProvider || "gemini");
      showToast("Question solved and answer marked!", "success");
    } catch (err) {
      showToast("Solver error: " + err.message, "error");
    } finally {
      solveCurrentBtn.disabled = false;
      solveCurrentBtn.innerText = "Solve & Mark";
    }
  });

  const autoSolveAllBtn = widget.querySelector("#cuAutoSolveAllBtn");
  autoSolveAllBtn.addEventListener("click", async () => {
    isAutoSolvingQuiz = !isAutoSolvingQuiz;
    currentSettings.enableAutoProceed = isAutoSolvingQuiz;
    chrome.storage.sync.set({ enableAutoProceed: isAutoSolvingQuiz });

    if (isAutoSolvingQuiz) {
      autoSolveAllBtn.innerText = "Auto: ON";
      autoSolveAllBtn.classList.add("cu-quiz-btn-active");
      showToast("Full Auto-Proceed active: Solving & proceeding through quiz...", "success");
      runAutoSolveLoop();
    } else {
      autoSolveAllBtn.innerText = "Auto-Proceed";
      autoSolveAllBtn.classList.remove("cu-quiz-btn-active");
      showToast("Auto-proceed stopped", "info");
    }
  });
}

async function solvePageQuestions(provider) {
  const questionContainers = document.querySelectorAll(".que");
  if (questionContainers.length === 0) {
    throw new Error("No question container (.que) found on page.");
  }

  const p = (provider || "gemini").toLowerCase();
  const activeModel = getActiveModelForProvider(p);
  const activeApiKey = getActiveApiKeyForProvider(p);

  for (const qEl of questionContainers) {
    const qtextEl = qEl.querySelector(".qtext, .formulation .qtext");
    const qtext = qtextEl ? qtextEl.innerText.trim() : qEl.innerText.trim();

    // Extract options
    const options = [];
    const optionContainers = qEl.querySelectorAll(".answer .r0, .answer .r1, .answer div[class*='r']");

    optionContainers.forEach((optContainer, idx) => {
      const label = optContainer.querySelector("label, .flex-fill, span.an-span");
      const text = label ? label.innerText.trim() : optContainer.innerText.trim();
      const input = optContainer.querySelector("input[type='radio'], input[type='checkbox']");
      options.push({
        idx: idx,
        key: String.fromCharCode(97 + idx),
        text: text,
        inputEl: input,
        containerEl: optContainer
      });
    });

    const isShortAnswer = qEl.querySelector("input[type='text']:not([type='hidden']), textarea");

    let qtype = "multichoice";
    if (isShortAnswer) qtype = "shortanswer";

    // Call Python backend
    const resp = await fetch("http://127.0.0.1:8765/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: p,
        question_text: qtext,
        options: options.map(o => ({ key: o.key, text: o.text })),
        qtype: qtype,
        api_key: activeApiKey || undefined,
        model: activeModel || undefined
      })
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error || `Server error ${resp.status}`);
    }

    const data = await resp.json();
    if (!data.ok || !data.result) {
      throw new Error(data.error || "Solver failed to return result");
    }

    const res = data.result;

    // Highlight and show explanation
    const expBox = document.getElementById("cuQuizExplanation");
    if (expBox) {
      expBox.style.display = "block";
      expBox.innerHTML = `<strong>Confidence: ${res.confidence || "High"}</strong><br>${res.explanation || "Answer identified & marked."}`;
    }

    // Select input or fill text
    if (qtype === "multichoice" && options.length > 0) {
      let targetOpt = null;

      if (res.selected_index !== null && res.selected_index !== undefined && options[res.selected_index]) {
        targetOpt = options[res.selected_index];
      } else if (res.selected_key) {
        targetOpt = options.find(o => o.key.toLowerCase() === String(res.selected_key).toLowerCase());
      } else if (res.answer_text) {
        targetOpt = options.find(o => o.text.toLowerCase().includes(String(res.answer_text).toLowerCase()) || String(res.answer_text).toLowerCase().includes(o.text.toLowerCase()));
      }

      if (!targetOpt) targetOpt = options[0]; // fallback best guess

      if (targetOpt) {
        if (targetOpt.inputEl) {
          targetOpt.inputEl.checked = true;
          targetOpt.inputEl.dispatchEvent(new Event("change", { bubbles: true }));
          targetOpt.inputEl.dispatchEvent(new Event("click", { bubbles: true }));
        }
        targetOpt.containerEl.classList.add("cu-quiz-ai-highlighted");
      }
    } else if (qtype === "shortanswer" && isShortAnswer) {
      isShortAnswer.value = res.answer_text || "";
      isShortAnswer.dispatchEvent(new Event("input", { bubbles: true }));
      isShortAnswer.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

async function runAutoSolveLoop() {
  if (!isAutoSolvingQuiz) return;

  try {
    await solvePageQuestions(currentSettings.quizProvider || "gemini");
    showToast("Answer marked! Proceeding...", "success");

    setTimeout(() => {
      if (!isAutoSolvingQuiz) return;

      // STRICT NEXT BUTTON FINDER: Never click Previous button!
      // In Moodle: Next page button has name='next' or id='mod_quiz-next-nav' or contains 'next page' text.
      // Previous button has name='previous' or class 'mod_quiz-prev-nav'.
      const allFormSubmitInputs = [...document.querySelectorAll("#responseform input[type='submit'], #responseform button, input.mod_quiz-next-nav, button.mod_quiz-next-nav")];
      
      const nextBtn = allFormSubmitInputs.find(el => {
        const val = (el.value || el.textContent || "").trim().toLowerCase();
        const name = (el.name || "").toLowerCase();
        // Exclude anything matching 'previous'
        if (name.includes("prev") || val.includes("previous")) return false;
        return name === "next" || val.includes("next page") || val === "next" || el.classList.contains("mod_quiz-next-nav");
      });

      const finishAttemptBtn = [...document.querySelectorAll("input[type='submit'], button, a")].find(el => {
        const val = (el.value || el.textContent || "").trim().toLowerCase();
        return val.includes("finish attempt");
      });

      if (nextBtn) {
        showToast("Moving to next question...", "success");
        nextBtn.click();
      } else if (finishAttemptBtn) {
        showToast("Final question answered! Proceeding to Summary...", "success");
        finishAttemptBtn.click();
      } else {
        showToast("No further next questions found.", "info");
      }
    }, 1200);
  } catch (err) {
    showToast("Auto-solve paused: " + err.message, "error");
    isAutoSolvingQuiz = false;
    const autoSolveBtn = document.getElementById("cuAutoSolveAllBtn");
    if (autoSolveBtn) {
      autoSolveBtn.innerText = "Auto-Proceed";
      autoSolveBtn.classList.remove("cu-quiz-btn-active");
    }
  }
}

function applySettings() {
  if (currentSettings.hideSopPermanently) {
    document.documentElement.setAttribute("data-cu-hide-sop-permanently", "true");
    const panel = document.getElementById("ai-lib-panel") || document.querySelector(".ai-lib-panel");
    if (panel) panel.style.display = "none";
    const fab = document.getElementById("ai-lib-fab") || document.querySelector(".ai-lib-fab");
    if (fab) fab.style.display = "none";
  } else {
    document.documentElement.removeAttribute("data-cu-hide-sop-permanently");
    const fab = document.getElementById("ai-lib-fab") || document.querySelector(".ai-lib-fab");
    if (fab && fab.style.display === "none") fab.style.display = "";
  }

  if (!currentSettings.enableDownloadButton) {
    document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((btn) => btn.remove());
  }

  if (!currentSettings.enableCopyButton) {
    document.querySelectorAll(`.${COPY_BUTTON_CLASS}`).forEach((btn) => btn.remove());
  }

  if (!currentSettings.enableSectionDownloadAll) {
    document.querySelectorAll(`.${BATCH_BTN_CLASS}`).forEach((btn) => btn.remove());
    document.querySelectorAll(".cu-lms-section-batch-container").forEach((el) => el.remove());
  }

  scan();
}

async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    currentSettings = { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.error("CU LMS extension could not load settings:", error);
  }
  applySettings();
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "sync") return;
  for (const [key, change] of Object.entries(changes)) {
    currentSettings[key] = change.newValue;
  }
  applySettings();
});

// Initialize on page load
loadSettings();

new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// Periodic checks for delayed LMS auto-open scripts during page initialization
[150, 400, 900, 1800, 3000].forEach((delay) => {
  window.setTimeout(() => {
    if (currentSettings.hideSopPermanently) {
      dismissAiPopup(true);
    } else if (currentSettings.disableAutoSopPopup) {
      dismissAiPopup(false);
    }
  }, delay);
});
