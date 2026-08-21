// src/shared.js
var ATTACH_COMMAND = "attach";

// src/index.js
var name = "dsh-image-upload";
var inject = ["commands"];
var WEB_ONLY_MESSAGE = "Open the Web + menu and choose \u201Cattach\u201D to browse image files.";
function apply(ctx) {
  ctx.effect(() => ctx.commands.register({
    name: ATTACH_COMMAND,
    description: "\u6D4F\u89C8\u56FE\u7247\u6587\u4EF6\uFF08PNG\u3001JPEG\u3001WebP\u3001GIF\uFF09",
    handler: () => Promise.resolve({ kind: "error", text: WEB_ONLY_MESSAGE })
  }), "dsh-image-upload: attach command");
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
