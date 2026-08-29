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
    show();
  };
  const onOver = (event) => {
    if (dragHasFiles(event)) event.preventDefault();
  };
  const onLeave = (event) => {
    if (!dragHasFiles(event)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) hide();
  };
  const onDrop = (event) => {
    depth = 0;
    hide();
    if (!dragHasFiles(event)) return;
    event.preventDefault();
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
function shouldCommitDraftFiles(previous, current) {
  const wasBusy = previous?.phase === "adjudicating" || previous?.phase === "submitting";
  return wasBusy && current?.phase === "plain" && current.draft === "";
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
    const current = String(getDraft());
    const next = composeAttachedDraft(current, getReadyNames());
    if (next === current) return;
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

// src/client/mention.js
var COMPOSER_SELECTOR = "[data-composer-card] textarea:not(:disabled)";
function detectMentionToken(text, caret) {
  const draft = String(text ?? "");
  const index = Math.max(0, Math.min(draft.length, Math.max(0, Number(caret) || 0)));
  const before = draft.slice(0, index);
  const match = /(^|\s)@([^\s@]*)$/u.exec(before);
  if (match === null) return null;
  return {
    start: index - match[0].length + match[1].length,
    end: index,
    query: match[2]
  };
}
function replaceMention(draft, token, fileName) {
  const value = String(draft ?? "");
  return `${value.slice(0, token.start)}@${String(fileName)}${value.slice(token.end)}`;
}
function anchorRect(textarea) {
  try {
    const rect = textarea?.getBoundingClientRect?.();
    return rect === void 0 || rect === null ? null : rect;
  } catch {
    return null;
  }
}
var MentionController = class {
  constructor({ documentRef, getDraft, setDraft, getReadyFiles, onState }) {
    this.documentRef = documentRef;
    this.getDraft = getDraft;
    this.setDraft = setDraft;
    this.getReadyFiles = getReadyFiles;
    this.onState = onState;
    this.textarea = null;
    this.open = null;
    this.disposed = false;
    this.view = null;
    this.restoreId = null;
    this.closeId = null;
  }
  attach() {
    if (this.disposed) return this;
    const documentRef = this.documentRef;
    if (typeof documentRef !== "object" || documentRef === null || typeof documentRef.addEventListener !== "function") return this;
    this.view = documentRef.defaultView ?? null;
    this.syncTextarea();
    documentRef.addEventListener("focusin", this.handleFocusIn, true);
    documentRef.addEventListener("pointerdown", this.handlePointerDown, true);
    if (this.view !== null && typeof this.view.addEventListener === "function") {
      this.view.addEventListener("resize", this.handleResize);
      this.view.addEventListener("scroll", this.handleScroll, true);
    }
    return this;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.detachTextarea();
    const documentRef = this.documentRef;
    if (typeof documentRef?.removeEventListener === "function") {
      documentRef.removeEventListener("focusin", this.handleFocusIn, true);
      documentRef.removeEventListener("pointerdown", this.handlePointerDown, true);
    }
    if (this.view !== null && typeof this.view.removeEventListener === "function") {
      this.view.removeEventListener("resize", this.handleResize);
      this.view.removeEventListener("scroll", this.handleScroll, true);
    }
    this.view = null;
    this.closeLater();
    this.commit();
    this.open = null;
    if (this.onState !== void 0) this.onState(null);
  }
  detachTextarea() {
    if (this.textarea === null) return;
    const textarea = this.textarea;
    this.textarea = null;
    textarea.removeEventListener("input", this.handleInput, true);
    textarea.removeEventListener("keydown", this.handleKeyDown, true);
    textarea.removeEventListener("blur", this.handleBlur, true);
  }
  syncTextarea() {
    if (this.disposed) return;
    const documentRef = this.documentRef;
    if (typeof documentRef?.querySelector !== "function") return;
    const next = documentRef.querySelector(COMPOSER_SELECTOR) ?? null;
    if (next === this.textarea) return;
    this.detachTextarea();
    this.textarea = next;
    if (next === null) return;
    next.addEventListener("input", this.handleInput, true);
    next.addEventListener("keydown", this.handleKeyDown, true);
    next.addEventListener("blur", this.handleBlur, true);
  }
  handleInput = (event) => {
    this.syncTextarea();
    if (this.textarea !== null && event?.target === this.textarea) this.refresh();
  };
  handleBlur = () => this.delayClose();
  handleFocusIn = () => {
    this.syncTextarea();
  };
  handlePointerDown = (event) => {
    if (event?.target?.closest?.("[data-file-resource-mention]") !== null) return;
    this.delayClose();
  };
  handleResize = () => this.syncAnchor();
  handleScroll = () => this.syncAnchor();
  handleKeyDown = (event) => {
    const open = this.open;
    if (open === null) return;
    const key = String(event?.key ?? "");
    if (key === "ArrowDown") {
      event.preventDefault();
      this.move(1);
    } else if (key === "ArrowUp") {
      event.preventDefault();
      this.move(-1);
    } else if (key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.commit(open.files[open.index]?.name);
    } else if (key === "Escape") {
      event.preventDefault();
      this.close();
    }
  };
  refresh() {
    if (this.disposed || this.textarea === null) return;
    const draft = this.textarea?.value ?? this.getDraft();
    const token = detectMentionToken(draft, this.textarea.selectionStart ?? draft.length);
    const files = (this.getReadyFiles ?? (() => []))();
    if (token === null || files.length === 0) {
      this.close();
      return;
    }
    const same = this.open !== null && this.open.start === token.start && this.open.end === token.end;
    this.open = {
      start: token.start,
      end: token.end,
      query: token.query,
      files,
      index: same ? Math.min(this.open.index, files.length - 1) : 0
    };
    this.publish();
  }
  move(delta) {
    if (this.open === null) return;
    const count = this.open.files.length;
    if (count === 0) return;
    this.open = { ...this.open, index: (this.open.index + delta + count) % count };
    this.publish();
  }
  commit(fileName) {
    const open = this.open;
    if (open === null || typeof fileName !== "string" || fileName === "") return;
    const draft = this.textarea?.value ?? this.getDraft();
    const next = replaceMention(draft, open, fileName);
    this.close();
    this.setDraft(next);
    const caret = open.end + 1 + fileName.length;
    this.restoreCaret(caret);
  }
  close() {
    this.closeLater();
    if (this.open === null) return;
    this.open = null;
    this.publish();
  }
  closeLater() {
    if (this.closeId !== null) {
      this.view?.clearTimeout?.(this.closeId);
      this.closeId = null;
    }
  }
  delayClose() {
    if (this.view === null || typeof this.view.setTimeout !== "function") {
      this.close();
      return;
    }
    this.closeLater();
    this.closeId = this.view.setTimeout(() => {
      this.closeId = null;
      if (this.open !== null) this.close();
    }, 180);
  }
  restoreCaret(caret) {
    if (this.view === null || typeof this.view.requestAnimationFrame !== "function") return;
    this.restoreId = this.view.requestAnimationFrame(() => {
      this.restoreId = null;
      this.restoreId = this.view.requestAnimationFrame(() => {
        this.restoreId = null;
        const textarea = this.textarea;
        if (textarea === null) return;
        try {
          textarea.focus();
          textarea.setSelectionRange(caret, caret);
        } catch {
        }
      });
    });
  }
  syncAnchor() {
    if (this.open === null || this.view === null) return;
    const rect = anchorRect(this.textarea);
    if (rect === null || rect.width === 0 && rect.height === 0) return;
    this.publish(rect);
  }
  publish(rectOverride = null) {
    if (this.onState === void 0) return;
    const open = this.open;
    if (open === null) {
      this.onState(null);
      return;
    }
    const rect = rectOverride ?? anchorRect(this.textarea);
    const height = this.view?.innerHeight ?? 0;
    const spaceBelow = rect === null ? 0 : height - rect.bottom - 8;
    const spaceAbove = rect === null ? 0 : rect.top - 8;
    this.onState({
      open: true,
      query: open.query,
      files: open.files,
      index: open.index,
      left: rect === null ? 12 : Math.max(8, rect.left),
      textareaTop: rect === null ? null : rect.top,
      textareaBottom: rect === null ? null : rect.bottom,
      viewportHeight: height,
      above: rect !== null && spaceBelow < 196 && spaceBelow < spaceAbove
    });
  }
};

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
  sendFailed: "\u6587\u4EF6\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"
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
  sendFailed: "The files could not be sent; try again"
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
/* \u4EC5\u6587\u4EF6\u53D1\u9001\uFF08wake\uFF09\u98DE\u884C\u4E2D\u7684\u89C6\u89C9\u53CD\u9988\uFF1A\u4E0D\u89E6\u78B0 React \u62E5\u6709\u7684 disabled \u5C5E\u6027 */
[data-dsh-file-resource-send-busy] { cursor: default; opacity: .55; }
.dsh-file-resource-mention {
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border: 1px solid rgba(127, 127, 127, .25);
  border-radius: 10px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, .22);
  box-sizing: border-box;
  font-size: 13px;
  max-height: 192px;
  overflow-y: auto;
  padding: 4px;
  position: fixed;
  width: min(320px, 76vw);
  z-index: 1200;
}
.dsh-file-resource-mention-item {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 7px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: 6px;
  line-height: 20px;
  margin: 0;
  padding: 4px 8px;
  text-align: left;
  width: 100%;
}
.dsh-file-resource-mention-item:hover,
.dsh-file-resource-mention-item[data-selected='true'] {
  background: rgba(127, 127, 127, .18);
}
.dsh-file-resource-mention-at {
  color: var(--dsw-alias-label-secondary);
  flex: none;
}
.dsh-file-resource-mention-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
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
  const [mention, setMention] = import_react.default.useState(null);
  const dockRef = import_react.default.useRef(null);
  const operations = import_react.default.useRef(/* @__PURE__ */ new Map());
  const live = import_react.default.useRef({ input, items });
  const previousInput = import_react.default.useRef(input);
  const sendingIds = import_react.default.useRef([]);
  const syncButton = import_react.default.useRef(() => {
  });
  const mentionController = import_react.default.useRef(null);
  live.current = { input, inputActions, items };
  const update = import_react.default.useCallback((localId, patch) => {
    setItems((current) => current.map((item) => item.localId === localId ? { ...item, ...patch } : item));
  }, []);
  const intake = import_react.default.useCallback(async (files) => {
    const currentBytes = live.current.items.reduce((sum, item) => sum + item.size, 0);
    if (live.current.items.length + files.length > MAX_FILES) {
      setItems((current) => [...current, errorItem(t("tooMany"))]);
      return;
    }
    if (files.some((file) => file.size > MAX_FILE_BYTES)) {
      setItems((current) => [...current, errorItem(t("tooLarge"))]);
      return;
    }
    if (currentBytes + files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_BYTES) {
      setItems((current) => [...current, errorItem(t("batchTooLarge"))]);
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
    setItems((current) => [...current, ...queued]);
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
        if (error?.name === "AbortError") setItems((current) => current.filter((candidate) => candidate.localId !== item.localId));
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
    setItems((current) => current.filter((candidate) => candidate.localId !== item.localId));
    if (item.resourceId !== void 0) {
      void resourceOperation(sessionId, "remove", { method: "DELETE", resourceId: item.resourceId }).catch(() => {
      });
    }
  }, [sessionId]);
  import_react.default.useEffect(() => {
    if (typeof document === "undefined") return void 0;
    const controller = new MentionController({
      documentRef: document,
      getDraft: () => live.current.input?.draft ?? "",
      setDraft: (value) => {
        if (live.current.input?.phase === "plain") live.current.inputActions?.setDraft(value);
      },
      getReadyFiles: () => live.current.items.filter((item) => item.status === "ready").map((item) => ({ name: item.fileName, resourceId: item.resourceId })),
      onState: setMention
    });
    mentionController.current = controller;
    controller.attach();
    return () => {
      controller.dispose();
      mentionController.current = null;
    };
  }, []);
  const commitMention = import_react.default.useCallback((name) => {
    mentionController.current?.commit(name);
  }, []);
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
        setItems((current) => current.filter((item) => !committed.includes(item.resourceId)));
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
      if (document.querySelector("[data-file-resource-mention]") !== null) return;
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
  const mentionStyle = mention?.open === true ? mention.above && mention.textareaTop !== null ? { bottom: `${mention.viewportHeight - mention.textareaTop + 8}px`, left: mention.left } : { top: `${(mention.textareaBottom ?? 0) + 8}px`, left: mention.left } : void 0;
  return import_react.default.createElement(
    import_react.default.Fragment,
    null,
    import_react.default.createElement(
      "div",
      {
        className: "dsh-file-resource-dock",
        "data-file-resource-dock": true,
        ref: dockRef
      },
      ...items.map((item) => import_react.default.createElement(ResourceCard, { item, key: item.localId, onRemove: remove, t }))
    ),
    mention?.open === true && import_react.default.createElement(
      "div",
      {
        className: "dsh-file-resource-mention",
        "data-file-resource-mention": true,
        role: "listbox",
        style: mentionStyle
      },
      ...mention.files.map((file, index) => import_react.default.createElement(
        "button",
        {
          "aria-selected": index === mention.index ? "true" : "false",
          className: "dsh-file-resource-mention-item",
          "data-selected": index === mention.index ? "true" : "false",
          key: `${file.resourceId ?? index}:${file.name}`,
          onClick: () => {
            commitMention(file.name);
          },
          onMouseEnter: () => setMention((current) => current === null || current.open !== true ? current : { ...current, index }),
          role: "option",
          type: "button"
        },
        import_react.default.createElement("span", { className: "dsh-file-resource-mention-at" }, "@"),
        import_react.default.createElement("span", { className: "dsh-file-resource-mention-name" }, file.name)
      ))
    )
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
