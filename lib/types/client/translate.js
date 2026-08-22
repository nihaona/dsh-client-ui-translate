/** The language picker, in picker order. `auto` first so it is the default. */
export const LANGUAGES = [
    { code: 'auto', labelKey: 'lang.auto' },
    { code: 'zh-CN', labelKey: 'lang.zh-CN' },
    { code: 'zh-TW', labelKey: 'lang.zh-TW' },
    { code: 'en', labelKey: 'lang.en' },
    { code: 'ja', labelKey: 'lang.ja' },
    { code: 'ko', labelKey: 'lang.ko' },
    { code: 'fr', labelKey: 'lang.fr' },
    { code: 'de', labelKey: 'lang.de' },
    { code: 'es', labelKey: 'lang.es' },
    { code: 'ru', labelKey: 'lang.ru' },
    { code: 'it', labelKey: 'lang.it' },
    { code: 'pt-BR', labelKey: 'lang.pt-BR' },
    { code: 'ar', labelKey: 'lang.ar' },
    { code: 'th', labelKey: 'lang.th' },
    { code: 'vi', labelKey: 'lang.vi' },
    { code: 'id', labelKey: 'lang.id' },
    { code: 'tr', labelKey: 'lang.tr' },
    { code: 'nl', labelKey: 'lang.nl' },
    { code: 'pl', labelKey: 'lang.pl' },
    { code: 'uk', labelKey: 'lang.uk' },
    { code: 'hi', labelKey: 'lang.hi' },
];
/** The anonymous single-request cap MyMemory documents, kept well under. */
const MAX_CHUNK_BYTES = 480;
/** Hard character ceiling per chunk, so a CJK run cannot balloon the byte count. */
const MAX_CHUNK_CHARS = 400;
/** Sentence-end characters a chunk boundary may land on (CJK and Latin). */
const SENTENCE_ENDERS = '。！？；.!?;\n';
/**
 * Client-side language guess for the `auto` source option. Heuristics only:
 * the dominant script of the input decides. Latin-script input falls back to
 * English, which is the common case for a coding-oriented harness.
 * @param text - the untrimmed source text.
 * @returns a concrete MyMemory language code.
 */
export function detectLanguage(text) {
    let kana = 0;
    let hangul = 0;
    let hanzi = 0;
    let cyrillic = 0;
    let arabic = 0;
    let thai = 0;
    let devanagari = 0;
    for (const char of text) {
        const code = char.codePointAt(0) ?? 0;
        if (code >= 0x3040 && code <= 0x30ff)
            kana += 1;
        else if (code >= 0xac00 && code <= 0xd7af)
            hangul += 1;
        else if (code >= 0x4e00 && code <= 0x9fff)
            hanzi += 1;
        else if (code >= 0x0400 && code <= 0x04ff)
            cyrillic += 1;
        else if (code >= 0x0600 && code <= 0x06ff)
            arabic += 1;
        else if (code >= 0x0e00 && code <= 0x0e7f)
            thai += 1;
        else if (code >= 0x0900 && code <= 0x097f)
            devanagari += 1;
    }
    if (kana > 0)
        return 'ja';
    if (hangul > 0)
        return 'ko';
    if (hanzi > 0)
        return 'zh-CN';
    if (cyrillic > 0)
        return 'ru';
    if (arabic > 0)
        return 'ar';
    if (thai > 0)
        return 'th';
    if (devanagari > 0)
        return 'hi';
    return 'en';
}
/** UTF-8 byte length of a string, counted without allocating an encoder. */
function utf8Bytes(text) {
    let bytes = 0;
    for (const char of text) {
        const code = char.codePointAt(0) ?? 0;
        if (code <= 0x7f)
            bytes += 1;
        else if (code <= 0x7ff)
            bytes += 2;
        else if (code <= 0xffff)
            bytes += 3;
        else
            bytes += 4;
    }
    return bytes;
}
/**
 * The last cut position in a chunk window: the final sentence end, else a
 * space, else -1 for a hard cut. The space fallback is only the FIRST space,
 * so a window full of words still breaks at a word boundary.
 * @param slice - the bounded slice under consideration.
 * @returns index of the cut (the delimiter itself is kept in the chunk).
 */
function lastChunkBoundary(slice) {
    let sentenceEnd = -1;
    let space = -1;
    for (let index = 0; index < slice.length; index += 1) {
        const char = slice[index];
        if (SENTENCE_ENDERS.includes(char))
            sentenceEnd = index;
        else if (char === ' ' && space < 0)
            space = index;
    }
    return sentenceEnd >= 0 ? sentenceEnd : space;
}
/**
 * Split text into MyMemory-safe chunks: at most {@link MAX_CHUNK_CHARS}
 * characters and {@link MAX_CHUNK_BYTES} bytes, preferring sentence ends and
 * word boundaries so each chunk translates independently and the pieces join
 * without artifacts. A single over-long run is hard-cut at the byte cap.
 * @param text - the untrimmed source text.
 * @returns non-empty chunks; an empty/whitespace input yields none.
 */
export function chunkText(text) {
    const source = text.trim();
    if (source.length === 0)
        return [];
    const chunks = [];
    let start = 0;
    while (start < source.length) {
        const rest = source.slice(start);
        const slice = rest.slice(0, MAX_CHUNK_CHARS);
        let cut = slice.length;
        if (rest.length > MAX_CHUNK_CHARS) {
            const boundary = lastChunkBoundary(slice);
            if (boundary >= 0)
                cut = boundary + 1;
        }
        while (cut > 1 && utf8Bytes(slice.slice(0, cut)) > MAX_CHUNK_BYTES)
            cut -= 1;
        chunks.push(slice.slice(0, cut));
        start += cut;
    }
    return chunks;
}
/** Typed translation failure; the message is diagnostic, never user copy. */
export class TranslateFailure extends Error {
    kind;
    constructor(kind, message) {
        super(message);
        this.kind = kind;
        this.name = 'TranslateFailure';
    }
}
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';
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
export async function translateText(text, source, target, signal) {
    const trimmed = text.trim();
    if (trimmed.length === 0)
        throw new TranslateFailure('empty', 'empty input');
    const sourceUsed = source === 'auto' ? detectLanguage(trimmed) : source;
    const chunks = chunkText(trimmed);
    const parts = [];
    for (const chunk of chunks) {
        const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(chunk)}&langpair=${sourceUsed}|${target}`;
        let response;
        try {
            response = await fetch(url, { signal });
        }
        catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError')
                throw error;
            throw new TranslateFailure('network', 'fetch failed');
        }
        if (!response.ok) {
            throw new TranslateFailure(response.status === 429 ? 'quota' : 'network', `HTTP ${response.status}`);
        }
        let payload;
        try {
            payload = (await response.json());
        }
        catch {
            throw new TranslateFailure('api', 'malformed response');
        }
        if (payload.responseStatus !== 200 || payload.responseData === undefined) {
            const details = payload.responseDetails ?? `status ${payload.responseStatus ?? 'unknown'}`;
            // The API reports daily quota exhaustion with a 403-style status + text.
            const exhausted = /quota|limit|day/i.test(details);
            throw new TranslateFailure(exhausted ? 'quota' : 'api', details);
        }
        const translated = payload.responseData.translatedText?.trim() ?? '';
        if (translated.length === 0)
            throw new TranslateFailure('api', 'empty translation');
        parts.push(translated);
    }
    return { translated: parts.join(''), sourceUsed };
}
//# sourceMappingURL=translate.js.map