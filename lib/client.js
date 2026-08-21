window.__ModuleLoader__.load({ id: "dsh-file-upload", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
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
var RESOURCE_ENDPOINT = "/dsh-file-upload/v1";

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
var STYLE_ID = "dsh-file-upload";
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
  return environment.document.dispatchEvent(new environment.CustomEvent("dsh-file-upload:selected", {
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
  xhr.setRequestHeader("X-DSH-File-Upload", "1");
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
    "X-DSH-File-Upload": "1",
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
function bindFileOnlySendButton(button, { onSend }) {
  let owned = false;
  let busy = false;
  const onClick = (event) => {
    if (!owned || busy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    busy = true;
    button.disabled = true;
    void Promise.resolve(onSend()).finally(() => {
      busy = false;
    });
  };
  button.addEventListener("click", onClick, true);
  return {
    update(state) {
      if (state.eligible && !state.busy && !busy) {
        owned = true;
        button.dataset.dshFileSend = "true";
        if (button.disabled) button.disabled = false;
      } else {
        owned = false;
        delete button.dataset.dshFileSend;
        if (!button.disabled) button.disabled = true;
      }
    },
    dispose() {
      button.removeEventListener("click", onClick, true);
      if (owned) {
        delete button.dataset.dshFileSend;
        button.disabled = true;
      }
      owned = false;
    }
  };
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
var FILE_DOCK_STYLES = `
.dsh-file-upload-dock { display: grid; gap: 6px; margin: 0 0 8px; width: 100%; }
.dsh-file-upload-card { align-items: center; background: rgba(127,127,127,.10); border: 1px solid rgba(127,127,127,.18); border-radius: 10px; box-sizing: border-box; display: grid; gap: 10px; grid-template-columns: 30px minmax(0,1fr) 30px; min-height: 48px; padding: 7px 9px; width: 100%; }
.dsh-file-upload-card[data-status='error'] { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d88) 45%, transparent); }
.dsh-file-upload-icon { align-items: center; background: rgba(127,127,127,.16); border-radius: 7px; color: var(--dsw-alias-label-secondary); display: inline-flex; height: 30px; justify-content: center; width: 30px; }
.dsh-file-upload-copy { min-width: 0; }
.dsh-file-upload-name { color: var(--dsw-alias-label-primary); display: block; font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-file-upload-meta { color: var(--dsw-alias-label-secondary); display: block; font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-file-upload-progress { background: rgba(127,127,127,.18); border-radius: 99px; display: block; height: 3px; margin-top: 4px; overflow: hidden; width: 100%; }
.dsh-file-upload-progress > i { background: var(--dsw-alias-label-primary); display: block; height: 100%; transition: width 120ms ease-out; }
.dsh-file-upload-cancel { align-items: center; background: rgba(127,127,127,.20); border: 0; border-radius: 999px; color: var(--dsw-alias-label-secondary); cursor: pointer; display: inline-flex; height: 28px; justify-content: center; padding: 0; width: 28px; }
.dsh-file-upload-cancel:hover { background: rgba(127,127,127,.30); color: var(--dsw-alias-label-primary); }
.dsh-file-upload-cancel:focus-visible { outline: 2px solid var(--dsw-alias-state-focus-primary, currentColor); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .dsh-file-upload-progress > i { transition: none; } }
`;
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
      className: "dsh-file-upload-card",
      "data-file-resource-card": true,
      "data-status": item.status
    },
    import_react.default.createElement("span", { className: "dsh-file-upload-icon" }, import_react.default.createElement(FileIcon)),
    import_react.default.createElement(
      "span",
      { className: "dsh-file-upload-copy" },
      import_react.default.createElement("span", { className: "dsh-file-upload-name", title: item.fileName }, item.fileName),
      import_react.default.createElement("span", { className: "dsh-file-upload-meta" }, `${sizeText(item.size)} \xB7 ${status}`),
      item.status === "uploading" && import_react.default.createElement("span", {
        "aria-label": status,
        "aria-valuemax": 100,
        "aria-valuemin": 0,
        "aria-valuenow": Math.round(progress * 100),
        className: "dsh-file-upload-progress",
        role: "progressbar"
      }, import_react.default.createElement("i", { style: { width: `${Math.round(progress * 100)}%` } }))
    ),
    import_react.default.createElement("button", {
      "aria-label": canceling ? t("cancel") : t("remove"),
      className: "dsh-file-upload-cancel",
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
function FileResourceDock({ sessionId, input, t }) {
  const [items, setItems] = import_react.default.useState([]);
  const operations = import_react.default.useRef(/* @__PURE__ */ new Map());
  const live = import_react.default.useRef({ input, items });
  const previousInput = import_react.default.useRef(input);
  const sendingIds = import_react.default.useRef([]);
  const syncButton = import_react.default.useRef(() => {
  });
  live.current = { input, items };
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
    document.addEventListener("dsh-file-upload:selected", onSelected);
    return () => {
      active = false;
      document.removeEventListener("dsh-file-upload:selected", onSelected);
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
    const sync = () => {
      const next = arrowSendButton(document);
      if (next !== button) {
        binding?.dispose();
        button = next;
        binding = button === null ? null : bindFileOnlySendButton(button, {
          onSend: async () => {
            const ids = live.current.items.filter((item) => item.status === "ready").map((item) => item.resourceId);
            if (ids.length === 0) return;
            try {
              await resourceOperation(sessionId, "wake", { resourceIds: ids });
              setItems((current) => current.filter((item) => !ids.includes(item.resourceId)));
            } catch {
              setItems((current) => [...current, errorItem(t("sendFailed"))]);
            } finally {
              sync();
            }
          }
        });
      }
      const state = live.current.input;
      binding?.update({
        eligible: live.current.items.some((item) => item.status === "ready") && state?.phase === "plain" && String(state?.draft ?? "").trim() === "",
        busy: state?.phase === "adjudicating" || state?.phase === "submitting"
      });
    };
    syncButton.current = sync;
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["disabled"] });
    sync();
    return () => {
      syncButton.current = () => {
      };
      observer.disconnect();
      binding?.dispose();
    };
  }, [sessionId, t]);
  if (items.length === 0) return null;
  return import_react.default.createElement(
    "div",
    { className: "dsh-file-upload-dock", "data-file-resource-dock": true },
    ...items.map((item) => import_react.default.createElement(ResourceCard, { item, key: item.localId, onRemove: remove, t }))
  );
}

// src/client/index.js
var NS = "file-upload";
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
  const existing = document.querySelector('style[data-plugin-css="dsh-file-upload-dock"]');
  if (existing !== null) return () => {
  };
  const style = document.createElement("style");
  style.dataset.plugin = "dsh-file-upload";
  style.dataset.pluginCss = "dsh-file-upload-dock";
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
      if (source.textContent?.trim() !== "dsh-file-upload") continue;
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
  if (commandUi === void 0) throw new Error("dsh-image-upload: commandUi service unavailable");
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-file-upload: dictionaries");
  ctx.effect(installFileDockStyles, "dsh-file-upload: file dock styles");
  ctx.effect(installWakeMarkerFilter, "dsh-file-upload: empty wake marker filter");
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
  }, "dsh-file-upload: native picker");
  ctx.effect(() => commandUi.decorate(createAttachDecoration({
    open: () => {
      picker?.open();
    }
  })), "dsh-file-upload: attach command decoration");
  ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
    name: "conversation.input.dock",
    id: "file-upload-resources",
    order: -10,
    locale: NS
  }, FileResourceDock));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
