// src/invariant.js
var PACKAGE_NAME = "dsh-file-resource";
var name = "dsh-file-resource-invariant";
var inject = ["invariants"];
function apply(ctx) {
  return Promise.resolve(ctx.invariants.register(PACKAGE_NAME, () => {
  }));
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=invariant.js.map
