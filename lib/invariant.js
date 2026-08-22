//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-translate`.
* @module @deepseek-ai/dsh-client-ui-translate/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-client-ui-translate";
/** Cordis companion plugin name. */
const name = "client-ui-translate-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the slot registration is an effect owned and observed
* by the slot registry, and the translation service is a pure browser-side
* fetch with no host state to verify.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns The installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
