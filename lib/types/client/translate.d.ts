/**
 * Translation service: browser-side client for the free MyMemory public API
 * (https://mymemory.translated.net/doc/spec.php). Keyless and CORS-enabled,
 * so the panel never needs a host route or a credential. The anonymous tier
 * caps a single request at 500 bytes and a day at 5000 chars, so long input
 * is chunked at sentence boundaries before the requests go out.
 */
import type { TranslateKey } from './locales.ts';
/** Language codes MyMemory accepts as `langpair` members; `auto` is panel-only. */
export type LangCode = 'auto' | 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru' | 'it' | 'pt-BR' | 'ar' | 'th' | 'vi' | 'id' | 'tr' | 'nl' | 'pl' | 'uk' | 'hi';
/** One entry of the language picker: the wire code plus the locale key of its label. */
export interface LanguageOption {
    /** The code sent in the `langpair` parameter (or `auto`). */
    code: LangCode;
    /** Locale key of the display label, rendered through the panel's `t` seat. */
    labelKey: TranslateKey;
}
/** The language picker, in picker order. `auto` first so it is the default. */
export declare const LANGUAGES: readonly LanguageOption[];
/** MyMemory `langpair` values never include `auto` — it is resolved client-side. */
export type ResolvedLang = Exclude<LangCode, 'auto'>;
/**
 * Client-side language guess for the `auto` source option. Heuristics only:
 * the dominant script of the input decides. Latin-script input falls back to
 * English, which is the common case for a coding-oriented harness.
 * @param text - the untrimmed source text.
 * @returns a concrete MyMemory language code.
 */
export declare function detectLanguage(text: string): ResolvedLang;
/**
 * Split text into MyMemory-safe chunks: at most {@link MAX_CHUNK_CHARS}
 * characters and {@link MAX_CHUNK_BYTES} bytes, preferring sentence ends and
 * word boundaries so each chunk translates independently and the pieces join
 * without artifacts. A single over-long run is hard-cut at the byte cap.
 * @param text - the untrimmed source text.
 * @returns non-empty chunks; an empty/whitespace input yields none.
 */
export declare function chunkText(text: string): string[];
/** Why a translation run failed, mapped to a locale key in the panel. */
export type TranslateFailureKind = 'empty' | 'network' | 'api' | 'quota';
/** Typed translation failure; the message is diagnostic, never user copy. */
export declare class TranslateFailure extends Error {
    readonly kind: TranslateFailureKind;
    constructor(kind: TranslateFailureKind, message: string);
}
/**
 * Translate text through MyMemory, chunking when needed. Runs chunks
 * sequentially to keep order and to stay under the anonymous rate.
 * @param text - the source text (untrimmed is fine).
 * @param source - the picker's source code; `auto` is resolved first.
 * @param target - the target language code.
 * @param signal - abort signal for the whole run.
 * @returns the joined translation and the language actually used for the source.
 * @throws {TranslateFailure} with a kind the panel can localize.
 */
export declare function translateText(text: string, source: LangCode, target: Exclude<LangCode, 'auto'>, signal: AbortSignal): Promise<{
    translated: string;
    sourceUsed: ResolvedLang;
}>;
//# sourceMappingURL=translate.d.ts.map