window.__ModuleLoader__.load({ id: "dsh-image-upload", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  ATTACH_COMMAND: () => ATTACH_COMMAND,
  apply: () => apply,
  createAttachDecoration: () => createAttachDecoration,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/shared.js
var ATTACH_COMMAND = "attach";

// src/picker.js
var IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
var STYLE_ID = "dsh-image-upload";
var MENU_LAYER_STYLES = `
#dsh-slash-option-command-0 {
  box-shadow: 0 5px 0 -4px var(--dsw-alias-border-l2-darkmode-thin);
  margin-bottom: 8px;
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
function createImagePicker({
  document: documentRef = document,
  window: windowRef = window,
  onFiles,
  onSettled
}) {
  const input = documentRef.createElement("input");
  input.type = "file";
  input.accept = IMAGE_ACCEPT;
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

// src/client/index.js
var inject = ["commandUi"];
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
function apply(ctx) {
  const commandUi = ctx.get("commandUi");
  if (commandUi === void 0) throw new Error("dsh-image-upload: commandUi service unavailable");
  let picker;
  ctx.effect(() => {
    picker = createImagePicker({
      onFiles: (files) => {
        dispatchImagesAsDrop(files);
      },
      onSettled: () => {
        dismissPickerOverlay();
      }
    });
    const removeStyles = installMenuLayerStyles();
    return () => {
      picker.dispose();
      removeStyles();
    };
  }, "dsh-image-upload: native picker");
  ctx.effect(() => commandUi.decorate(createAttachDecoration({
    open: () => {
      picker?.open();
    }
  })), "dsh-image-upload: attach command decoration");
}
return module.exports; } });
//# sourceMappingURL=client.js.map
