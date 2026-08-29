window.__ModuleLoader__.load({ id: "dsh-file-resource", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  ATTACH_COMMAND: () => ATTACH_COMMAND,
  apply: () => apply,
  createAttachDecoration: () => createAttachDecoration,
  findWakeMarkerRow: () => findWakeMarkerRow,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/shared.js
var ATTACH_COMMAND = "attach";
var RESOURCE_ENDPOINT = "/dsh-file-resource/v1";

// src/picker.js
var FILE_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
  ".rtf",
  ".epub",
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".jsonl",
  ".xml",
  ".html",
  ".htm",
  ".yaml",
  ".yml",
  ".log",
  ".ini",
  ".toml",
  ".sql",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".sh",
  ".ps1",
  ".bat",
  ".css",
  ".scss"
].join(",");
var NATIVE_IMAGE_TYPES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
var NATIVE_IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif)$/iu;
var STYLE_ID = "dsh-file-resource";
var MENU_LAYER_STYLES = `
#dsh-slash-option-command-0 {
  position: relative;
  margin-bottom: 10px;
}

#dsh-slash-option-command-0::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -5px;
  left: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
  pointer-events: none;
}
`;
function dispatchImagesAsDrop(files, environment = globalThis) {
  if (files.length === 0) return false;
  const transfer = new environment.DataTransfer();
  for (const file of files) transfer.items.add(file);
  const event = new environment.DragEvent("drop", {
    bubbles: true,
    cancelable: true,
    dataTransfer: transfer
  });
  return environment.document.dispatchEvent(event);
}
function partitionSelectedFiles(files) {
  const images = [];
  const documents = [];
  for (const file of files) {
    if (NATIVE_IMAGE_TYPES.has(String(file.type).toLowerCase()) || String(file.type) === "" && NATIVE_IMAGE_EXTENSION.test(String(file.name))) images.push(file);
    else documents.push(file);
  }
  return { images, documents };
}
function dispatchDocumentSelection(files, environment = globalThis) {
  if (files.length === 0) return false;
  return environment.document.dispatchEvent(new environment.CustomEvent("dsh-file-resource:selected", {
    bubbles: false,
    cancelable: false,
    detail: { files: [...files] }
  }));
}
function dismissPickerOverlay(environment = globalThis) {
  const event = new environment.PointerEvent("pointerdown", {
    bubbles: true,
    cancelable: true
  });
  environment.document.body.dispatchEvent(event);
  environment.document.querySelector("[data-composer-card] textarea:not(:disabled)")?.focus();
}
function installMenuLayerStyles(documentRef = document) {
  const selector = `style[data-plugin-css="${STYLE_ID}"]`;
  if (documentRef.querySelector(selector) !== null) return () => {
  };
  const style = documentRef.createElement("style");
  style.dataset.plugin = STYLE_ID;
  style.dataset.pluginCss = STYLE_ID;
  style.textContent = MENU_LAYER_STYLES;
  documentRef.body.append(style);
  return () => {
    style.remove();
  };
}
function installAttachActivationBridge(picker, documentRef = document) {
  const onPointerDown = (event) => {
    const option = event.target?.closest?.('[role="option"]');
    const command = option?.querySelector?.("span")?.textContent?.trim();
    if (command === "attach") picker.open();
  };
  documentRef.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    documentRef.removeEventListener("pointerdown", onPointerDown, true);
  };
}
function createFilePicker({
  document: documentRef = document,
  window: windowRef = window,
  onFiles,
  onSettled
}) {
  const input = documentRef.createElement("input");
  input.type = "file";
  input.accept = FILE_ACCEPT;
  input.multiple = true;
  input.hidden = true;
  input.tabIndex = -1;
  documentRef.body.append(input);
  let active = false;
  let disposed = false;
  const settle = () => {
    if (!active) return;
    active = false;
    windowRef.removeEventListener("focus", onWindowFocus);
    input.value = "";
    onSettled();
  };
  const onChange = () => {
    if (!active) return;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) onFiles(files);
    settle();
  };
  const onCancel = () => {
    settle();
  };
  const onWindowFocus = () => {
    windowRef.setTimeout(() => {
      settle();
    }, 100);
  };
  input.addEventListener("change", onChange);
  input.addEventListener("cancel", onCancel);
  return {
    open() {
      if (active || disposed) return;
      active = true;
      windowRef.addEventListener("focus", onWindowFocus, { once: true });
      try {
        if (typeof input.showPicker === "function") input.showPicker();
        else input.click();
      } catch (error) {
        settle();
        throw error;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      windowRef.removeEventListener("focus", onWindowFocus);
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      input.remove();
    }
  };
}
var DROP_OVERLAY_CLASS = "dsh-file-resource-drop-overlay";
var DROP_OVERLAY_STYLES = `
.${DROP_OVERLAY_CLASS} {
  align-items: center;
  background: rgba(0, 0, 0, .42);
  border: 2px dashed rgba(255, 255, 255, .7);
  border-radius: 14px;
  bottom: 14px;
  box-sizing: border-box;
  color: #fff;
  display: flex;
  font-size: 15px;
  justify-content: center;
  left: 14px;
  pointer-events: none;
  position: fixed;
  right: 14px;
  top: 14px;
  z-index: 1400;
}
`;
function documentFilesOnly(files) {
  return (files ?? []).filter((file) => {
    const type = String(file?.type ?? "").toLowerCase();
    if (type.startsWith("image/")) return false;
    if (type === "" && /\.(?:png|jpe?g|webp|gif)$/iu.test(String(file?.name ?? ""))) return false;
    return true;
  });
}
function dragHasFiles(event) {
  const types = event?.dataTransfer?.types;
  if (types === void 0 || types === null) return false;
  if (Array.isArray(types)) return types.includes("Files");
  return /(?:^|\s)Files(?:$|\s)/.test(String(types));
}
function installGlobalDropTarget({
  document: documentRef = document,
  window: windowRef = window,
  onFiles,
  onCleanup = () => {
  }
}) {
  if (typeof documentRef?.addEventListener !== "function" || typeof windowRef?.addEventListener !== "function") return () => {
  };
  let style = null;
  let overlay = null;
  let depth = 0;
  const ensureStyle = () => {
    if (style !== null) return;
    style = documentRef.createElement("style");
    style.dataset = style.dataset ?? {};
    style.dataset.plugin = "dsh-file-resource";
    style.dataset.pluginCss = "dsh-file-resource-drop";
    style.textContent = DROP_OVERLAY_STYLES;
    documentRef.head?.append?.(style);
  };
  const show = () => {
    if (overlay !== null) return;
    ensureStyle();
    overlay = documentRef.createElement("div");
    overlay.className = DROP_OVERLAY_CLASS;
    overlay.textContent = "\u677E\u5F00\u4EE5\u6DFB\u52A0\u6587\u4EF6 / Release to attach";
    documentRef.body?.append?.(overlay);
  };
  const hide = () => {
    overlay?.remove?.();
    overlay = null;
  };
  const onEnter = (event) => {
    if (!dragHasFiles(event)) return;
    depth += 1;
    event.preventDefault();
    event.stopImmediatePropagation();
    show();
  };
  const onOver = (event) => {
    if (!dragHasFiles(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const onLeave = (event) => {
    if (!dragHasFiles(event)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) hide();
    event.stopImmediatePropagation();
  };
  const onDrop = (event) => {
    if (event.isTrusted === false) return;
    depth = 0;
    hide();
    if (!dragHasFiles(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) {
      onFiles(files, event);
      try {
        dismissPickerOverlay({ document: documentRef });
      } catch {
      }
    }
  };
  windowRef.addEventListener("dragenter", onEnter, true);
  windowRef.addEventListener("dragover", onOver, true);
  windowRef.addEventListener("dragleave", onLeave, true);
  windowRef.addEventListener("drop", onDrop, true);
  return () => {
    windowRef.removeEventListener("dragenter", onEnter, true);
    windowRef.removeEventListener("dragover", onOver, true);
    windowRef.removeEventListener("dragleave", onLeave, true);
    windowRef.removeEventListener("drop", onDrop, true);
    hide();
    style?.remove?.();
    style = null;
    onCleanup();
  };
}
function installDocumentPasteBridge({ document: documentRef = document, onFiles }) {
  if (typeof documentRef?.addEventListener !== "function") return () => {
  };
  const onPaste = (event) => {
    const target = event?.target;
    if (typeof target?.closest === "function" && target.closest("[data-composer-card]") === null) return;
    const files = Array.from(event?.clipboardData?.files ?? []);
    if (files.length === 0) return;
    const documents = documentFilesOnly(files);
    if (documents.length === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    onFiles(documents, event);
  };
  documentRef.addEventListener("paste", onPaste, true);
  return () => {
    documentRef.removeEventListener("paste", onPaste, true);
  };
}

// src/client/file-dock.js
var import_react = __toESM(require("react"), 1);

// src/client/resources.js
function abortError() {
  return new DOMException("Upload cancelled", "AbortError");
}
function responseBody(xhr) {
  if (xhr.response !== null && typeof xhr.response === "object") return xhr.response;
  if (typeof xhr.responseText === "string" && xhr.responseText !== "") {
    try {
      return JSON.parse(xhr.responseText);
    } catch {
      return null;
    }
  }
  return null;
}
function uploadBrowserResource({
  sessionId,
  file,
  onProgress = () => {
  },
  onProcessing = () => {
  },
  XMLHttpRequestCtor = XMLHttpRequest
}) {
  const xhr = new XMLHttpRequestCtor();
  xhr.open("POST", RESOURCE_ENDPOINT);
  xhr.responseType = "json";
  xhr.setRequestHeader("X-DSH-File-Resource", "1");
  xhr.setRequestHeader("X-DSH-Operation", "upload");
  xhr.setRequestHeader("X-DSH-Session", sessionId);
  xhr.setRequestHeader("X-DSH-File-Name", encodeURIComponent(file.name));
  xhr.setRequestHeader("X-DSH-Media-Type", encodeURIComponent(file.type || "application/octet-stream"));
  let settled = false;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject;
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    });
    xhr.upload.addEventListener("load", onProcessing);
    xhr.addEventListener("load", () => {
      if (settled) return;
      settled = true;
      const body = responseBody(xhr);
      if (xhr.status >= 200 && xhr.status < 300 && body?.ok === true) resolve(body.resource);
      else reject(new Error(body?.error || `Upload failed (${xhr.status})`));
    });
    xhr.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      reject(new Error("Upload connection failed"));
    });
    xhr.addEventListener("abort", () => {
      if (settled) return;
      settled = true;
      reject(abortError());
    });
  });
  xhr.send(file);
  return {
    promise,
    abort() {
      if (settled) return;
      xhr.abort();
      if (!settled) {
        settled = true;
        rejectPromise(abortError());
      }
    }
  };
}
async function resourceOperation(sessionId, operation, {
  method = "POST",
  resourceId,
  resourceIds,
  fetchImpl = fetch
} = {}) {
  const headers = {
    "X-DSH-File-Resource": "1",
    "X-DSH-Operation": operation,
    "X-DSH-Session": sessionId
  };
  if (resourceId !== void 0) headers["X-DSH-Resource"] = resourceId;
  const response = await fetchImpl(RESOURCE_ENDPOINT, {
    method,
    headers,
    ...resourceIds === void 0 ? {} : { body: JSON.stringify({ resourceIds }) }
  });
  const body = await response.json();
  if (!response.ok || body?.ok !== true) throw new Error(body?.error || `Resource request failed (${response.status})`);
  return body;
}
function shouldCommitDraftFiles(previous, current2) {
  const wasBusy = previous?.phase === "adjudicating" || previous?.phase === "submitting";
  return wasBusy && current2?.phase === "plain" && current2.draft === "";
}
function composeAttachedDraft(draft, names) {
  const mentions = (names ?? []).filter(Boolean).map((name) => `@${String(name)}`).join(" ");
  const base = String(draft ?? "").trimEnd();
  if (mentions === "") return String(draft ?? "");
  return base === "" ? mentions : `${base} ${mentions}`;
}
function bindAttachedSendButton(button, {
  getDraft = () => "",
  setDraft = () => {
  },
  submit = () => {
  },
  getReadyNames = () => []
}) {
  let owned = false;
  let busy = false;
  let lastReactDisabled = false;
  const run = () => {
    if (!owned || busy) return;
    const current2 = String(getDraft());
    const next = composeAttachedDraft(current2, getReadyNames());
    if (next === current2) return;
    busy = true;
    button.inert = true;
    button.dataset.dshFileResourceSendBusy = "true";
    try {
      setDraft(next);
      submit();
    } finally {
      busy = false;
      button.inert = false;
      delete button.dataset.dshFileResourceSendBusy;
    }
  };
  const onClick = (event) => {
    if (!owned || busy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    run();
  };
  button.addEventListener("click", onClick, true);
  return {
    update(state) {
      lastReactDisabled = state.reactDisabled === true;
      if (state.eligible && !state.busy && !busy) {
        owned = true;
        button.dataset.dshFileResourceSend = "true";
        if (button.disabled) button.disabled = false;
      } else if (owned) {
        owned = false;
        delete button.dataset.dshFileResourceSend;
        if (lastReactDisabled && !button.disabled) button.disabled = true;
      } else {
        delete button.dataset.dshFileResourceSend;
      }
    },
    dispose() {
      button.removeEventListener("click", onClick, true);
      if (owned) {
        owned = false;
        delete button.dataset.dshFileResourceSend;
        if (lastReactDisabled && !button.disabled) button.disabled = true;
      }
    }
  };
}

// src/client/preview.js
var PREVIEW_STYLE_ID = "dsh-file-resource-preview";
var PREVIEW_STYLES = `
.dsh-file-resource-preview {
  background: var(--dsw-alias-bg-layer-1, #fff);
  border-left: 1px solid rgba(127, 127, 127, .25);
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary, inherit);
  display: flex;
  flex-direction: column;
  inset: 0 0 0 auto;
  max-width: 100vw;
  position: fixed;
  width: var(--dsh-preview-width, 50vw);
  z-index: 1501;
}
/* True split view: the conversation column (messages + composer, which live
   inside ONE [data-conversation-scroll] wrapper) shifts left and the right
   half belongs to the preview panel. Only the scroll wrapper is shrunk, so
   messages and the input stay aligned with each other. */
body[data-dsh-preview-open] [data-conversation-scroll] {
  margin-right: var(--dsh-preview-width, 50vw) !important;
}
.dsh-file-resource-preview-header {
  align-items: center;
  border-bottom: 1px solid rgba(127, 127, 127, .18);
  display: flex;
  flex: none;
  gap: 8px;
  padding: 10px 12px 10px 16px;
}
.dsh-file-resource-preview-title {
  font-size: 14px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-file-resource-preview-kind {
  color: var(--dsw-alias-label-secondary);
  flex: none;
  font-size: 12px;
}
.dsh-file-resource-preview-close {
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  flex: none;
  font-size: 17px;
  height: 28px;
  line-height: 1;
  margin-left: auto;
  padding: 0;
  width: 28px;
}
.dsh-file-resource-preview-close:hover {
  background: rgba(127, 127, 127, .22);
  color: var(--dsw-alias-label-primary);
}
.dsh-file-resource-preview-body {
  flex: 1 1 auto;
  overflow: auto;
  padding: 14px 16px;
}
.dsh-file-resource-preview-body pre {
  font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Consolas, monospace);
  font-size: 12.5px;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.dsh-file-resource-preview-table {
  border-collapse: collapse;
  font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Consolas, monospace);
  font-size: 12.5px;
  margin: 0;
  min-width: 100%;
}
.dsh-file-resource-preview-table td {
  border: 1px solid rgba(127, 127, 127, .24);
  line-height: 1.5;
  min-width: 40px;
  padding: 3px 7px;
  vertical-align: top;
  white-space: pre-wrap;
  word-break: break-word;
}
.dsh-file-resource-preview-table tr[data-head='true'] td {
  background: rgba(127, 127, 127, .10);
  font-weight: 600;
}
.dsh-file-resource-preview-status {
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  padding: 6px 16px 12px;
}
.dsh-file-resource-preview-truncated {
  border-top: 1px solid rgba(127, 127, 127, .18);
  color: var(--dsw-alias-label-secondary);
  flex: none;
  font-size: 12px;
  padding: 8px 16px;
}
@media (prefers-reduced-motion: reduce) {
  .dsh-file-resource-preview { transition: none; }
}
`;
var current = null;
var TABLE_KINDS = /^(?:xlsx|ods|csv|tsv)$/iu;
function isSpreadsheetKind(kind) {
  return TABLE_KINDS.test(String(kind ?? ""));
}
function spreadsheetTable(text) {
  const value = String(text ?? "");
  if (!value.includes("	")) return null;
  const rows = value.split(/\r?\n/u).map((line) => line.split("	")).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  return rows.length === 0 ? null : rows;
}
function previewCandidateName(node) {
  let element = node;
  for (let depth = 0; element !== null && element !== void 0 && depth < 4; depth += 1, element = element.parentElement) {
    const text = typeof element?.textContent === "string" ? element.textContent.trim() : "";
    if (text.length === 0 || text.length > 120) continue;
    if (!text.startsWith("@")) continue;
    const name = text.slice(1).trim();
    if (name === "" || /[\s@]/.test(name)) continue;
    return name;
  }
  return null;
}
function referenceChipName(node) {
  if (typeof node?.closest !== "function") return null;
  const chip = node.closest("[data-ref-chip]");
  if (chip === null) return null;
  const raw = String(chip.getAttribute?.("title") ?? chip.textContent ?? "").trim();
  let name = raw.replace(/^@/u, "").replace(/^"|"$/gu, "");
  const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  if (slash !== -1) name = name.slice(slash + 1);
  name = name.trim();
  if (name === "" || name.length > 200) return null;
  return name;
}
function installPreviewStyles(documentRef = document) {
  if (typeof documentRef?.createElement !== "function") return () => {
  };
  if (documentRef.querySelector(`style[data-plugin-css="${PREVIEW_STYLE_ID}"]`) !== null) return () => {
  };
  const style = documentRef.createElement("style");
  style.dataset.plugin = "dsh-file-resource";
  style.dataset.pluginCss = PREVIEW_STYLE_ID;
  style.textContent = PREVIEW_STYLES;
  documentRef.head?.append?.(style);
  return () => {
    style.remove();
  };
}
function closePreview(documentRef = document) {
  if (current === null) return;
  current.close(documentRef);
  current = null;
}
async function openPreview({ document: documentRef = document, sessionId, fileName, t = (key) => key }) {
  if (typeof documentRef?.createElement !== "function" || typeof fetch !== "function") return;
  closePreview(documentRef);
  const panel = documentRef.createElement("div");
  panel.className = "dsh-file-resource-preview";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t("preview") ?? "preview");
  const header = documentRef.createElement("div");
  header.className = "dsh-file-resource-preview-header";
  const title = documentRef.createElement("span");
  title.className = "dsh-file-resource-preview-title";
  title.textContent = `@${fileName}`;
  const kind = documentRef.createElement("span");
  kind.className = "dsh-file-resource-preview-kind";
  const close = documentRef.createElement("button");
  close.className = "dsh-file-resource-preview-close";
  close.setAttribute("aria-label", t("preview-close") ?? "close");
  close.textContent = "\xD7";
  close.type = "button";
  header.append(title, kind, close);
  const body = documentRef.createElement("div");
  body.className = "dsh-file-resource-preview-body";
  const message = documentRef.createElement("p");
  message.className = "dsh-file-resource-preview-status";
  message.textContent = t("preview-loading") ?? "Loading\u2026";
  body.append(message);
  const truncated = documentRef.createElement("div");
  truncated.className = "dsh-file-resource-preview-truncated";
  truncated.hidden = true;
  panel.append(header, body, truncated);
  documentRef.body?.append?.(panel);
  documentRef.body.dataset.dshPreviewOpen = "true";
  documentRef.body.style.setProperty("--dsh-preview-width", "min(50vw, 720px)");
  const alignColumn = () => {
    const scroll = typeof documentRef.querySelector === "function" ? documentRef.querySelector("[data-conversation-scroll]") : null;
    const rect = typeof scroll?.getBoundingClientRect === "function" ? scroll.getBoundingClientRect() : null;
    if (rect === null || rect.height === 0) return;
    const height = documentRef.defaultView?.innerHeight ?? documentRef.documentElement?.clientHeight ?? 0;
    panel.style.top = `${Math.max(0, Math.round(rect.top))}px`;
    panel.style.bottom = `${Math.max(0, Math.round(height - rect.bottom))}px`;
  };
  alignColumn();
  let disposed = false;
  const onKey = (event) => {
    if (event.key === "Escape") destroy();
  };
  const onResize = () => {
    if (!disposed) alignColumn();
  };
  const view = documentRef.defaultView ?? null;
  view?.addEventListener("resize", onResize);
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    view?.removeEventListener("resize", onResize);
    documentRef.removeEventListener("keydown", onKey, true);
    delete documentRef.body.dataset.dshPreviewOpen;
    documentRef.body.style.removeProperty("--dsh-preview-width");
    panel.remove();
  };
  close.addEventListener("click", destroy);
  documentRef.addEventListener("keydown", onKey, true);
  current = { close: destroy };
  const render = (text) => {
    body.textContent = "";
    const pre = documentRef.createElement("pre");
    pre.textContent = text;
    body.append(pre);
  };
  const renderTable = (rows) => {
    body.textContent = "";
    const table = documentRef.createElement("table");
    table.className = "dsh-file-resource-preview-table";
    rows.forEach((row, index) => {
      const tr = documentRef.createElement("tr");
      if (index === 0) tr.dataset.head = "true";
      for (const cell of row) {
        const td = documentRef.createElement("td");
        td.textContent = String(cell ?? "");
        tr.append(td);
      }
      table.append(tr);
    });
    body.append(table);
  };
  try {
    const response = await fetch(RESOURCE_ENDPOINT, {
      method: "GET",
      headers: {
        "X-DSH-File-Resource": "1",
        "X-DSH-Operation": "preview",
        "X-DSH-Session": sessionId,
        "X-DSH-File-Name": encodeURIComponent(fileName)
      }
    });
    const payload = await response.json();
    if (disposed) return;
    if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || "preview failed");
    const preview = payload.preview;
    title.textContent = `@${preview.fileName}`;
    kind.textContent = preview.kind;
    const rows = isSpreadsheetKind(preview.kind) ? spreadsheetTable(preview.text) : null;
    if (rows !== null) renderTable(rows);
    else render(preview.text || "");
    truncated.hidden = preview.truncated !== true;
    truncated.textContent = t("preview-truncated") ?? "Preview truncated";
  } catch (error) {
    if (disposed) return;
    body.textContent = "";
    const hint = documentRef.createElement("p");
    hint.className = "dsh-file-resource-preview-status";
    const detail = String(error?.message ?? "");
    hint.textContent = /no attached file|not attached/iu.test(detail) ? t("preview-not-in-session") ?? "Not attached to this conversation" : t("preview-failed") ?? "Preview unavailable";
    body.append(hint);
  }
}

// src/client/file-dock.js
var MAX_FILES = 20;
var MAX_FILE_BYTES = 50 * 1024 * 1024;
var MAX_BATCH_BYTES = 200 * 1024 * 1024;
var zh = {
  uploading: "\u6B63\u5728\u4E0A\u4F20",
  processing: "\u6B63\u5728\u672C\u5730\u89E3\u6790",
  ready: "\u5DF2\u5C31\u7EEA",
  failed: "\u5904\u7406\u5931\u8D25",
  cancel: "\u53D6\u6D88\u5E76\u79FB\u9664\u6587\u4EF6",
  remove: "\u79FB\u9664\u6587\u4EF6",
  tooMany: "\u4E00\u6B21\u6700\u591A\u6DFB\u52A0 20 \u4E2A\u6587\u4EF6",
  tooLarge: "\u5355\u4E2A\u6587\u4EF6\u4E0D\u80FD\u8D85\u8FC7 50 MB",
  batchTooLarge: "\u672C\u6B21\u6587\u4EF6\u603B\u5927\u5C0F\u4E0D\u80FD\u8D85\u8FC7 200 MB",
  sendFailed: "\u6587\u4EF6\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
  preview: "\u6587\u4EF6\u9884\u89C8",
  "preview-close": "\u5173\u95ED\u9884\u89C8",
  "preview-loading": "\u6B63\u5728\u8BFB\u53D6\u9884\u89C8\u2026",
  "preview-truncated": "\u9884\u89C8\u5DF2\u622A\u65AD\uFF0C\u4EC5\u663E\u793A\u5F00\u5934\u90E8\u5206",
  "preview-failed": "\u65E0\u6CD5\u9884\u89C8\u6B64\u6587\u4EF6",
  "preview-not-in-session": "\u6B64\u6587\u4EF6\u4E0D\u5728\u5F53\u524D\u4F1A\u8BDD\u7684\u9644\u4EF6\u91CC\uFF08\u53EF\u80FD\u662F\u5728\u53E6\u4E00\u4E2A\u5BF9\u8BDD\u4E2D\u4E0A\u4F20\u7684\uFF09"
};
var en = {
  uploading: "Uploading",
  processing: "Processing locally",
  ready: "Ready",
  failed: "Failed",
  cancel: "Cancel and remove file",
  remove: "Remove file",
  tooMany: "You can add up to 20 files at once",
  tooLarge: "Each file must be 50 MB or smaller",
  batchTooLarge: "The file batch must be 200 MB or smaller",
  sendFailed: "The files could not be sent; try again",
  preview: "File preview",
  "preview-close": "Close preview",
  "preview-loading": "Reading preview\u2026",
  "preview-truncated": "Preview truncated; only the beginning is shown",
  "preview-failed": "Preview unavailable for this file",
  "preview-not-in-session": "This file is not attached to the current conversation (it may have been uploaded in another one)"
};
function reactDisabledFromInput(state) {
  if (state === null || state === void 0) return true;
  if (state.phase === "adjudicating" || state.phase === "submitting") return true;
  return String(state?.draft ?? "").trim() === "" && (state.imageIds?.length ?? 0) === 0;
}
var FILE_DOCK_STYLES = `
.dsh-file-resource-dock { box-sizing: border-box; display: flex; flex-wrap: wrap; gap: 6px; margin: 0; max-width: 100%; padding: 4px 12px 2px; width: 100%; }
.dsh-file-resource-dock[hidden] { display: none; }
.dsh-file-resource-card { align-items: center; background: rgba(127,127,127,.10); border: 1px solid rgba(127,127,127,.18); border-radius: 10px; box-sizing: border-box; display: grid; flex: 0 1 220px; gap: 8px; grid-template-columns: 28px minmax(0,1fr) 28px; max-width: calc(100vw - 48px); min-height: 44px; padding: 6px 7px; width: 220px; }
.dsh-file-resource-card[data-status='error'] { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d88) 45%, transparent); }
.dsh-file-resource-icon { align-items: center; background: rgba(127,127,127,.16); border-radius: 7px; color: var(--dsw-alias-label-secondary); display: inline-flex; height: 28px; justify-content: center; width: 28px; }
.dsh-file-resource-copy { min-width: 0; }
.dsh-file-resource-name { color: var(--dsw-alias-label-primary); display: block; font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-file-resource-meta { color: var(--dsw-alias-label-secondary); display: block; font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-file-resource-progress { background: rgba(127,127,127,.18); border-radius: 99px; display: block; height: 3px; margin-top: 4px; overflow: hidden; width: 100%; }
.dsh-file-resource-progress > i { background: var(--dsw-alias-label-primary); display: block; height: 100%; transition: width 120ms ease-out; }
.dsh-file-resource-cancel { align-items: center; background: rgba(127,127,127,.20); border: 0; border-radius: 999px; color: var(--dsw-alias-label-secondary); cursor: pointer; display: inline-flex; height: 28px; justify-content: center; padding: 0; width: 28px; }
.dsh-file-resource-cancel:hover { background: rgba(127,127,127,.30); color: var(--dsw-alias-label-primary); }
.dsh-file-resource-cancel:focus-visible { outline: 2px solid var(--dsw-alias-state-focus-primary, currentColor); outline-offset: 2px; }
/* \u4EC5\u6587\u4EF6\u53D1\u9001\uFF08wake \u517C\u5BB9\uFF09\u98DE\u884C\u4E2D\u7684\u89C6\u89C9\u53CD\u9988\uFF1A\u4E0D\u89E6\u78B0 React \u62E5\u6709\u7684 disabled \u5C5E\u6027 */
[data-dsh-file-resource-send-busy] { cursor: default; opacity: .55; }
@media (prefers-reduced-motion: reduce) { .dsh-file-resource-progress > i { transition: none; } }
`;
function placeDockInsideComposer(dock, documentRef = document) {
  if (dock === null || dock === void 0) return { visible: dock, dispose: () => {
  } };
  const composer = documentRef.querySelector("[data-composer-card]");
  const scroll = composer?.querySelector?.("[data-input-scroll]");
  if (composer === null || composer === void 0 || scroll === null || scroll === void 0 || dock.parentNode === composer) return { visible: dock, dispose: () => {
  } };
  const visible = dock.cloneNode(true);
  dock.hidden = true;
  visible.hidden = false;
  visible.dataset.composerAttachment = "true";
  composer.insertBefore(visible, scroll);
  const Observer = documentRef.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  const observer = typeof Observer === "function" ? new Observer(() => {
    visible.innerHTML = dock.innerHTML;
  }) : null;
  observer?.observe(dock, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true
  });
  return {
    visible,
    dispose() {
      observer?.disconnect();
      visible.remove();
      dock.hidden = false;
    }
  };
}
function bindComposerDockActions(dock, lookupItem, onRemove) {
  const onClick = (event) => {
    const button = event.target?.closest?.("[data-file-resource-remove]");
    const localId = button?.dataset?.fileResourceRemove;
    if (typeof localId !== "string") return;
    const item = lookupItem(localId);
    if (item === void 0) return;
    event.preventDefault();
    event.stopPropagation();
    onRemove(item);
  };
  dock.addEventListener("click", onClick);
  return () => {
    dock.removeEventListener("click", onClick);
  };
}
function sizeText(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function FileIcon() {
  return import_react.default.createElement(
    "svg",
    { "aria-hidden": true, fill: "none", height: 17, viewBox: "0 0 24 24", width: 17 },
    import_react.default.createElement("path", { d: "M7 3h7l4 4v14H7zM14 3v5h5", stroke: "currentColor", strokeLinejoin: "round", strokeWidth: 1.7 })
  );
}
function CloseIcon() {
  return import_react.default.createElement(
    "svg",
    { "aria-hidden": true, fill: "none", height: 15, viewBox: "0 0 24 24", width: 15 },
    import_react.default.createElement("path", { d: "m7 7 10 10M17 7 7 17", stroke: "currentColor", strokeLinecap: "round", strokeWidth: 2 })
  );
}
function ResourceCard({ item, onRemove, t }) {
  const progress = Math.max(0, Math.min(1, Number(item.progress) || 0));
  const status = item.status === "uploading" ? `${t("uploading")} ${Math.round(progress * 100)}%` : item.status === "processing" ? t("processing") : item.status === "ready" ? t("ready") : `${t("failed")}${item.error ? `\uFF1A${item.error}` : ""}`;
  const canceling = item.status === "uploading" || item.status === "processing";
  return import_react.default.createElement(
    "div",
    {
      className: "dsh-file-resource-card",
      "data-file-resource-card": true,
      "data-status": item.status
    },
    import_react.default.createElement("span", { className: "dsh-file-resource-icon" }, import_react.default.createElement(FileIcon)),
    import_react.default.createElement(
      "span",
      { className: "dsh-file-resource-copy" },
      import_react.default.createElement("span", { className: "dsh-file-resource-name", title: item.fileName }, item.fileName),
      import_react.default.createElement("span", { className: "dsh-file-resource-meta" }, `${sizeText(item.size)} \xB7 ${status}`),
      item.status === "uploading" && import_react.default.createElement("span", {
        "aria-label": status,
        "aria-valuemax": 100,
        "aria-valuemin": 0,
        "aria-valuenow": Math.round(progress * 100),
        className: "dsh-file-resource-progress",
        role: "progressbar"
      }, import_react.default.createElement("i", { style: { width: `${Math.round(progress * 100)}%` } }))
    ),
    import_react.default.createElement("button", {
      "aria-label": canceling ? t("cancel") : t("remove"),
      className: "dsh-file-resource-cancel",
      "data-file-resource-remove": item.localId,
      onClick: () => {
        onRemove(item);
      },
      title: canceling ? t("cancel") : t("remove"),
      type: "button"
    }, import_react.default.createElement(CloseIcon))
  );
}
function errorItem(message) {
  return { localId: crypto.randomUUID(), fileName: message, size: 0, status: "error", progress: 0, error: "" };
}
function arrowSendButton(documentRef) {
  return documentRef.querySelector('[data-composer-card] button svg path[d^="M8.3125"]')?.closest("button") ?? null;
}
function FileResourceDock({ sessionId, input, inputActions, t }) {
  const [items, setItems] = import_react.default.useState([]);
  const dockRef = import_react.default.useRef(null);
  const operations = import_react.default.useRef(/* @__PURE__ */ new Map());
  const live = import_react.default.useRef({ input, items });
  const previousInput = import_react.default.useRef(input);
  const sendingIds = import_react.default.useRef([]);
  const syncButton = import_react.default.useRef(() => {
  });
  const knownFiles = import_react.default.useRef(/* @__PURE__ */ new Set());
  live.current = { input, inputActions, items };
  const knownStorageKey = `dsh-file-resource:names:${sessionId}`;
  const loadKnownFiles = import_react.default.useCallback(() => {
    const names = /* @__PURE__ */ new Set();
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(knownStorageKey);
        if (raw !== null) {
          for (const name of JSON.parse(raw)) names.add(String(name));
        }
      }
    } catch {
    }
    return names;
  }, [knownStorageKey]);
  const persistKnownFiles = import_react.default.useCallback(() => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(knownStorageKey, JSON.stringify([...knownFiles.current]));
      }
    } catch {
    }
  }, [knownStorageKey]);
  import_react.default.useEffect(() => {
    knownFiles.current = loadKnownFiles();
  }, [loadKnownFiles]);
  import_react.default.useEffect(() => {
    let changed = false;
    for (const item of items) {
      if (item.status === "ready" && !knownFiles.current.has(item.fileName)) {
        knownFiles.current.add(item.fileName);
        changed = true;
      }
    }
    if (changed) persistKnownFiles();
  }, [items, persistKnownFiles]);
  const update = import_react.default.useCallback((localId, patch) => {
    setItems((current2) => current2.map((item) => item.localId === localId ? { ...item, ...patch } : item));
  }, []);
  const intake = import_react.default.useCallback(async (files) => {
    const currentBytes = live.current.items.reduce((sum, item) => sum + item.size, 0);
    if (live.current.items.length + files.length > MAX_FILES) {
      setItems((current2) => [...current2, errorItem(t("tooMany"))]);
      return;
    }
    if (files.some((file) => file.size > MAX_FILE_BYTES)) {
      setItems((current2) => [...current2, errorItem(t("tooLarge"))]);
      return;
    }
    if (currentBytes + files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_BYTES) {
      setItems((current2) => [...current2, errorItem(t("batchTooLarge"))]);
      return;
    }
    const queued = files.map((file) => ({
      localId: crypto.randomUUID(),
      file,
      fileName: file.name,
      size: file.size,
      status: "uploading",
      progress: 0
    }));
    for (const item of queued) operations.current.set(item.localId, "queued");
    setItems((current2) => [...current2, ...queued]);
    for (const item of queued) {
      if (operations.current.get(item.localId) === null) continue;
      const operation = uploadBrowserResource({
        sessionId,
        file: item.file,
        onProgress: (progress) => {
          update(item.localId, { progress });
        },
        onProcessing: () => {
          update(item.localId, { status: "processing", progress: 1 });
        }
      });
      operations.current.set(item.localId, operation);
      try {
        const resource = await operation.promise;
        operations.current.delete(item.localId);
        update(item.localId, { ...resource, fileName: item.fileName, size: item.size, status: "ready", progress: 1, file: void 0 });
      } catch (error) {
        operations.current.delete(item.localId);
        if (error?.name === "AbortError") setItems((current2) => current2.filter((candidate) => candidate.localId !== item.localId));
        else update(item.localId, { status: "error", error: error instanceof Error ? error.message : String(error) });
      }
    }
  }, [sessionId, t, update]);
  import_react.default.useEffect(() => {
    let active = true;
    void resourceOperation(sessionId, "list", { method: "GET" }).then((body) => {
      if (!active || body.resources.length === 0) return;
      setItems(body.resources.map((resource) => ({ ...resource, localId: crypto.randomUUID(), status: "ready", progress: 1 })));
    }).catch(() => {
    });
    const onSelected = (event) => {
      const files = Array.isArray(event.detail?.files) ? event.detail.files : [];
      if (files.length > 0) void intake(files);
    };
    document.addEventListener("dsh-file-resource:selected", onSelected);
    return () => {
      active = false;
      document.removeEventListener("dsh-file-resource:selected", onSelected);
      for (const operation of operations.current.values()) operation?.abort?.();
      operations.current.clear();
    };
  }, [intake, sessionId]);
  const remove = import_react.default.useCallback((item) => {
    const operation = operations.current.get(item.localId);
    if (operation !== void 0) {
      operations.current.set(item.localId, null);
      operation?.abort?.();
    }
    setItems((current2) => current2.filter((candidate) => candidate.localId !== item.localId));
    if (item.resourceId !== void 0) {
      void resourceOperation(sessionId, "remove", { method: "DELETE", resourceId: item.resourceId }).catch(() => {
      });
    }
  }, [sessionId]);
  import_react.default.useEffect(() => {
    if (typeof document === "undefined") return void 0;
    const removeStyles = installPreviewStyles(document);
    const onPreviewClick = (event) => {
      const target = event?.target;
      if (typeof target?.closest === "function" && target.closest(
        "[data-composer-card],[data-file-resource-dock],[data-file-resource-preview],.dsh-file-resource-preview"
      ) !== null) return;
      const name = referenceChipName(target) ?? previewCandidateName(target);
      if (name === null) return;
      if (!knownFiles.current.has(name)) return;
      event.preventDefault();
      void openPreview({ document, sessionId, fileName: name, t });
    };
    document.addEventListener("click", onPreviewClick, true);
    return () => {
      document.removeEventListener("click", onPreviewClick, true);
      removeStyles();
    };
  }, [sessionId, t]);
  import_react.default.useEffect(() => {
    const previous = previousInput.current;
    const readyIds = items.filter((item) => item.status === "ready").map((item) => item.resourceId);
    const previousDraft = String(previous?.draft ?? "");
    const enteringBusy = previous?.phase === "plain" && (input?.phase === "adjudicating" || input?.phase === "submitting") && previousDraft.trim() !== "" && !previousDraft.trimStart().startsWith("/");
    if (enteringBusy && readyIds.length > 0) sendingIds.current = readyIds;
    if (sendingIds.current.length > 0 && shouldCommitDraftFiles(previous, input)) {
      const committed = [...sendingIds.current];
      sendingIds.current = [];
      void resourceOperation(sessionId, "commit", { resourceIds: committed }).then(() => {
        setItems((current2) => current2.filter((item) => !committed.includes(item.resourceId)));
      }).catch(() => {
      });
    }
    previousInput.current = input;
    syncButton.current();
  }, [input, items, sessionId]);
  import_react.default.useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return void 0;
    let button = null;
    let binding = null;
    const attachedNames = () => live.current.items.filter((item) => item.status === "ready").map((item) => item.fileName);
    const sendWithAttachments = () => {
      const state = live.current.input;
      if (state?.phase !== "plain") return false;
      const next = composeAttachedDraft(state?.draft ?? "", attachedNames());
      if (String(state?.draft ?? "") === next) return false;
      if (live.current.inputActions?.setDraft) live.current.inputActions.setDraft(next);
      live.current.inputActions?.submit();
      return true;
    };
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (typeof target?.closest !== "function" || target.closest("[data-composer-card]") === null) return;
      if (attachedNames().length === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      sendWithAttachments();
    };
    const sync = () => {
      const next = arrowSendButton(document);
      if (next !== button) {
        binding?.dispose();
        button = next;
        binding = button === null ? null : bindAttachedSendButton(button, {
          getDraft: () => live.current.input?.draft ?? "",
          setDraft: (value) => {
            if (live.current.input?.phase === "plain") live.current.inputActions?.setDraft(value);
          },
          submit: () => {
            live.current.inputActions?.submit();
          },
          getReadyNames: attachedNames
        });
      }
      const state = live.current.input;
      binding?.update({
        eligible: attachedNames().length > 0 && state?.phase === "plain",
        busy: state?.phase === "adjudicating" || state?.phase === "submitting",
        reactDisabled: reactDisabledFromInput(state)
      });
    };
    syncButton.current = sync;
    document.addEventListener("keydown", onKeyDown, true);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["disabled"] });
    sync();
    return () => {
      syncButton.current = () => {
      };
      document.removeEventListener("keydown", onKeyDown, true);
      observer.disconnect();
      binding?.dispose();
    };
  }, [sessionId, t]);
  import_react.default.useLayoutEffect(() => {
    if (items.length === 0 || typeof document === "undefined") return void 0;
    const dock = dockRef.current;
    const mounted = placeDockInsideComposer(dock, document);
    const unbind = mounted.visible !== dock ? bindComposerDockActions(
      mounted.visible,
      (localId) => live.current.items.find((item) => item.localId === localId),
      remove
    ) : () => {
    };
    return () => {
      unbind();
      mounted.dispose();
    };
  }, [items.length > 0, remove, sessionId]);
  if (items.length === 0) return null;
  return import_react.default.createElement(
    "div",
    {
      className: "dsh-file-resource-dock",
      "data-file-resource-dock": true,
      ref: dockRef
    },
    ...items.map((item) => import_react.default.createElement(ResourceCard, { item, key: item.localId, onRemove: remove, t }))
  );
}

// src/client/index.js
var NS = "file-resource";
var inject = ["commandUi", "slots", "locale"];
function createAttachDecoration(picker) {
  return {
    name: ATTACH_COMMAND,
    available: () => true,
    ui: {
      kind: "popupSelect",
      options: async () => {
        picker.open();
        return [];
      },
      onSelect: () => {
      }
    }
  };
}
function installFileDockStyles() {
  const existing = document.querySelector('style[data-plugin-css="dsh-file-resource-dock"]');
  if (existing !== null) return () => {
  };
  const style = document.createElement("style");
  style.dataset.plugin = "dsh-file-resource";
  style.dataset.pluginCss = "dsh-file-resource-dock";
  style.textContent = FILE_DOCK_STYLES;
  document.head.append(style);
  return () => {
    style.remove();
  };
}
function findWakeMarkerRow(source) {
  const flowRow = source.closest?.('[data-chat-flow-kind="context"]');
  if (flowRow !== null && flowRow !== void 0) return flowRow;
  let row = source.parentElement;
  for (let depth = 0; row !== null && depth < 6; depth += 1, row = row.parentElement) {
    if (row.querySelector?.("[data-context-injection-body]") !== null) return row;
  }
  return null;
}
function installWakeMarkerFilter() {
  const hide = () => {
    for (const source of document.querySelectorAll("[data-context-source]")) {
      if (source.textContent?.trim() !== "dsh-file-resource") continue;
      const row = findWakeMarkerRow(source);
      if (row === null) continue;
      row.hidden = true;
      row.dataset.dshFileWakeMarker = "true";
    }
  };
  const observer = new MutationObserver(hide);
  observer.observe(document.body, { childList: true, subtree: true });
  hide();
  return () => {
    observer.disconnect();
  };
}
function apply(ctx) {
  const commandUi = ctx.get("commandUi");
  if (commandUi === void 0) throw new Error("dsh-file-resource: commandUi service unavailable");
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-file-resource: dictionaries");
  ctx.effect(installFileDockStyles, "dsh-file-resource: file dock styles");
  ctx.effect(installWakeMarkerFilter, "dsh-file-resource: empty wake marker filter");
  let picker;
  ctx.effect(() => {
    picker = createFilePicker({
      onFiles: (files) => {
        const { images, documents } = partitionSelectedFiles(files);
        if (images.length > 0) dispatchImagesAsDrop(images);
        if (documents.length > 0) dispatchDocumentSelection(documents);
      },
      onSettled: () => {
        dismissPickerOverlay();
      }
    });
    const removeStyles = installMenuLayerStyles();
    const removeActivationBridge = installAttachActivationBridge(picker);
    return () => {
      removeActivationBridge();
      picker.dispose();
      removeStyles();
    };
  }, "dsh-file-resource: native picker");
  ctx.effect(() => commandUi.decorate(createAttachDecoration({
    open: () => {
      picker?.open();
    }
  })), "dsh-file-resource: attach command decoration");
  ctx.effect(() => {
    const removeDrop = installGlobalDropTarget({
      onFiles: (files) => {
        const { images, documents } = partitionSelectedFiles(files);
        if (images.length > 0) dispatchImagesAsDrop(images);
        if (documents.length > 0) dispatchDocumentSelection(documents);
      }
    });
    const removePaste = installDocumentPasteBridge({
      onFiles: (documents) => {
        dispatchDocumentSelection(documents);
      }
    });
    return () => {
      removeDrop();
      removePaste();
    };
  }, "dsh-file-resource: global drop and document paste");
  ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
    name: "conversation.input.dock",
    id: "file-resource-resources",
    order: -10,
    locale: NS
  }, FileResourceDock));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
