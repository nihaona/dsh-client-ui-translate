/**
 * Translation panel plugin, browser half: the `translate` dictionaries and
 * TranslatePanel registered into the layout-owned `shell.overlay` list slot.
 * The overlay is the additive frame-wide seat, so this entry joins beside the
 * shipped ones without touching the three-column frame. Export discipline:
 * packages/client/AGENTS.md.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type TranslateKey } from './locales.ts';
export type { TranslatePanelProps } from './contract/slots.ts';
export type { TranslateKey } from './locales.ts';
export { LANGUAGES, TranslateFailure, chunkText, detectLanguage, translateText, type LangCode, type LanguageOption, type ResolvedLang, type TranslateFailureKind, } from './translate.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The translation panel's copy. */
        translate: TranslateKey;
    }
}
/** Required services: the slot registry and the panel's copy. */
export declare const inject: string[];
/**
 * Client plugin body: register the `translate` dictionaries and the panel
 * entry. One contribution into the overlay list slot; the entry owns all its
 * state, so no store and no injected face are declared.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map