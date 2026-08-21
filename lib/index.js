// src/shared.js
var ATTACH_COMMAND = "attach";

// src/index.js
var name = "dsh-image-upload";
var inject = ["commands"];
var WEB_ONLY_MESSAGE = "Open the Web + menu and choose \u201Cattach\u201D to browse image files.";
function apply(ctx) {
  ctx.effect(() => ctx.commands.register({
    name: ATTACH_COMMAND,
    description: "Browse image files (PNG, JPEG, WebP, GIF)",
    handler: () => Promise.resolve({ kind: "error", text: WEB_ONLY_MESSAGE })
  }), "dsh-image-upload: attach command");
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
