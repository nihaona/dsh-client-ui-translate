import { TranslatePanel } from "./TranslatePanel.js";
import { en, zh } from "./locales.js";
export { LANGUAGES, TranslateFailure, chunkText, detectLanguage, translateText, } from "./translate.js";
/** Dictionary namespace owned by this plugin. */
const NS = 'translate';
/** Required services: the slot registry and the panel's copy. */
export const inject = ['slots', 'locale'];
/**
 * Client plugin body: register the `translate` dictionaries and the panel
 * entry. One contribution into the overlay list slot; the entry owns all its
 * state, so no store and no injected face are declared.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-translate: dictionaries');
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'translate', locale: NS }, TranslatePanel));
}
//# sourceMappingURL=index.js.map