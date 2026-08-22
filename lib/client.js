window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-translate",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/translate.ts
		/** The language picker, in picker order. `auto` first so it is the default. */
		const LANGUAGES = [
			{
				code: "auto",
				labelKey: "lang.auto"
			},
			{
				code: "zh-CN",
				labelKey: "lang.zh-CN"
			},
			{
				code: "zh-TW",
				labelKey: "lang.zh-TW"
			},
			{
				code: "en",
				labelKey: "lang.en"
			},
			{
				code: "ja",
				labelKey: "lang.ja"
			},
			{
				code: "ko",
				labelKey: "lang.ko"
			},
			{
				code: "fr",
				labelKey: "lang.fr"
			},
			{
				code: "de",
				labelKey: "lang.de"
			},
			{
				code: "es",
				labelKey: "lang.es"
			},
			{
				code: "ru",
				labelKey: "lang.ru"
			},
			{
				code: "it",
				labelKey: "lang.it"
			},
			{
				code: "pt-BR",
				labelKey: "lang.pt-BR"
			},
			{
				code: "ar",
				labelKey: "lang.ar"
			},
			{
				code: "th",
				labelKey: "lang.th"
			},
			{
				code: "vi",
				labelKey: "lang.vi"
			},
			{
				code: "id",
				labelKey: "lang.id"
			},
			{
				code: "tr",
				labelKey: "lang.tr"
			},
			{
				code: "nl",
				labelKey: "lang.nl"
			},
			{
				code: "pl",
				labelKey: "lang.pl"
			},
			{
				code: "uk",
				labelKey: "lang.uk"
			},
			{
				code: "hi",
				labelKey: "lang.hi"
			}
		];
		/** The anonymous single-request cap MyMemory documents, kept well under. */
		const MAX_CHUNK_BYTES = 480;
		/** Hard character ceiling per chunk, so a CJK run cannot balloon the byte count. */
		const MAX_CHUNK_CHARS = 400;
		/** Sentence-end characters a chunk boundary may land on (CJK and Latin). */
		const SENTENCE_ENDERS = "。！？；.!?;\n";
		/**
		* Client-side language guess for the `auto` source option. Heuristics only:
		* the dominant script of the input decides. Latin-script input falls back to
		* English, which is the common case for a coding-oriented harness.
		* @param text - the untrimmed source text.
		* @returns a concrete MyMemory language code.
		*/
		function detectLanguage(text) {
			let kana = 0;
			let hangul = 0;
			let hanzi = 0;
			let cyrillic = 0;
			let arabic = 0;
			let thai = 0;
			let devanagari = 0;
			for (const char of text) {
				const code = char.codePointAt(0) ?? 0;
				if (code >= 12352 && code <= 12543) kana += 1;
				else if (code >= 44032 && code <= 55215) hangul += 1;
				else if (code >= 19968 && code <= 40959) hanzi += 1;
				else if (code >= 1024 && code <= 1279) cyrillic += 1;
				else if (code >= 1536 && code <= 1791) arabic += 1;
				else if (code >= 3584 && code <= 3711) thai += 1;
				else if (code >= 2304 && code <= 2431) devanagari += 1;
			}
			if (kana > 0) return "ja";
			if (hangul > 0) return "ko";
			if (hanzi > 0) return "zh-CN";
			if (cyrillic > 0) return "ru";
			if (arabic > 0) return "ar";
			if (thai > 0) return "th";
			if (devanagari > 0) return "hi";
			return "en";
		}
		/** UTF-8 byte length of a string, counted without allocating an encoder. */
		function utf8Bytes(text) {
			let bytes = 0;
			for (const char of text) {
				const code = char.codePointAt(0) ?? 0;
				if (code <= 127) bytes += 1;
				else if (code <= 2047) bytes += 2;
				else if (code <= 65535) bytes += 3;
				else bytes += 4;
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
				if (SENTENCE_ENDERS.includes(char)) sentenceEnd = index;
				else if (char === " " && space < 0) space = index;
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
		function chunkText(text) {
			const source = text.trim();
			if (source.length === 0) return [];
			const chunks = [];
			let start = 0;
			while (start < source.length) {
				const rest = source.slice(start);
				const slice = rest.slice(0, MAX_CHUNK_CHARS);
				let cut = slice.length;
				if (rest.length > MAX_CHUNK_CHARS) {
					const boundary = lastChunkBoundary(slice);
					if (boundary >= 0) cut = boundary + 1;
				}
				while (cut > 1 && utf8Bytes(slice.slice(0, cut)) > MAX_CHUNK_BYTES) cut -= 1;
				chunks.push(slice.slice(0, cut));
				start += cut;
			}
			return chunks;
		}
		/** Typed translation failure; the message is diagnostic, never user copy. */
		var TranslateFailure = class extends Error {
			kind;
			constructor(kind, message) {
				super(message);
				this.kind = kind;
				this.name = "TranslateFailure";
			}
		};
		const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
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
		async function translateText(text, source, target, signal) {
			const trimmed = text.trim();
			if (trimmed.length === 0) throw new TranslateFailure("empty", "empty input");
			const sourceUsed = source === "auto" ? detectLanguage(trimmed) : source;
			const chunks = chunkText(trimmed);
			const parts = [];
			for (const chunk of chunks) {
				const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(chunk)}&langpair=${sourceUsed}|${target}`;
				let response;
				try {
					response = await fetch(url, { signal });
				} catch (error) {
					if (error instanceof DOMException && error.name === "AbortError") throw error;
					throw new TranslateFailure("network", "fetch failed");
				}
				if (!response.ok) throw new TranslateFailure(response.status === 429 ? "quota" : "network", `HTTP ${response.status}`);
				let payload;
				try {
					payload = await response.json();
				} catch {
					throw new TranslateFailure("api", "malformed response");
				}
				if (payload.responseStatus !== 200 || payload.responseData === void 0) {
					const details = payload.responseDetails ?? `status ${payload.responseStatus ?? "unknown"}`;
					throw new TranslateFailure(/quota|limit|day/i.test(details) ? "quota" : "api", details);
				}
				const translated = payload.responseData.translatedText?.trim() ?? "";
				if (translated.length === 0) throw new TranslateFailure("api", "empty translation");
				parts.push(translated);
			}
			return {
				translated: parts.join(""),
				sourceUsed
			};
		}
		//#endregion
		//#region \0dsh-css:TranslatePanel.module.css.mjs
		const css = ".K6acRq_root{z-index:21;width:0;position:fixed;top:0;bottom:0;right:0}.K6acRq_toggle{border:1px solid var(--dsw-alias-border-l2,var(--dsw-static-neutral-bluish-200,#e1e5ee));width:44px;height:44px;color:var(--dsw-alias-label-primary,var(--dsw-static-neutral-bluish-1000,#0f1115));background:var(--dsw-alias-button-floating-fill,var(--dsw-static-neutral-bluish-00,#fff));box-shadow:var(--dsw-shadow-lv2);cursor:pointer;border-right:none;border-radius:12px 0 0 12px;justify-content:center;align-items:center;padding:0;display:flex;position:absolute;top:84px;right:0}.K6acRq_toggle:hover{background:var(--dsw-alias-button-floating-hover,var(--dsw-static-neutral-bluish-75,#e9ebef))}.K6acRq_drawer{border-left:1px solid var(--dsw-alias-border-l2,var(--dsw-static-neutral-bluish-200,#e1e5ee));background:var(--dsw-alias-bg-layer-2,var(--dsw-static-neutral-bluish-00,#fff));width:340px;max-width:calc(100vw - 24px);box-shadow:var(--dsw-shadow-lv2);flex-direction:column;display:flex;position:absolute;top:0;bottom:0;right:0}.K6acRq_header{border-bottom:1px solid var(--dsw-alias-border-l1,var(--dsw-static-neutral-bluish-200,#e1e5ee));flex:none;justify-content:space-between;align-items:center;height:46px;padding:0 10px 0 16px;display:flex}.K6acRq_title{color:var(--dsw-alias-label-primary,var(--dsw-static-neutral-bluish-1000,#0f1115));font-size:14px;font-weight:600}.K6acRq_body{flex-direction:column;flex:1;gap:12px;min-height:0;padding:14px 16px 16px;display:flex;overflow-y:auto}.K6acRq_langRow{grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr);align-items:end;gap:8px;display:grid}.K6acRq_field{flex-direction:column;gap:5px;min-width:0;display:flex}.K6acRq_label{color:var(--dsw-alias-label-secondary,var(--dsw-static-neutral-bluish-700,#61666b));font-size:12px}.K6acRq_select{border:1px solid var(--dsw-alias-border-l2,var(--dsw-static-neutral-bluish-200,#e1e5ee));width:100%;height:34px;color:var(--dsw-alias-label-primary,var(--dsw-static-neutral-bluish-1000,#0f1115));background:var(--dsw-specific-input-major,var(--dsw-static-neutral-bluish-00,#fff));border-radius:8px;padding:0 10px;font-size:13px}.K6acRq_swap{margin-bottom:1px}.K6acRq_input{box-sizing:border-box;resize:vertical;border:1px solid var(--dsw-alias-border-l2,var(--dsw-static-neutral-bluish-200,#e1e5ee));width:100%;min-height:110px;color:var(--dsw-alias-label-primary,var(--dsw-static-neutral-bluish-1000,#0f1115));background:var(--dsw-specific-input-major,var(--dsw-static-neutral-bluish-00,#fff));font:inherit;border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.5}.K6acRq_input:focus-visible,.K6acRq_select:focus-visible{border-color:var(--dsw-alias-button-ghost-active-border,var(--dsw-static-neutral-bluish-500,#979da6));outline:none}.K6acRq_go{flex:none;align-self:stretch}.K6acRq_spin{animation:1s linear infinite K6acRq_translate-spin;display:inline-flex}@keyframes K6acRq_translate-spin{to{transform:rotate(360deg)}}.K6acRq_error{color:var(--dsw-alias-state-error-primary,var(--dsw-static-red-600,#ec1313));font-size:12px}.K6acRq_outputHeader{flex:none;justify-content:space-between;align-items:center;display:flex}.K6acRq_output{border:1px solid var(--dsw-alias-border-l1,var(--dsw-static-neutral-bluish-200,#e1e5ee));min-height:110px;color:var(--dsw-alias-label-primary,var(--dsw-static-neutral-bluish-1000,#0f1115));background:var(--dsw-alias-bg-layer-1,var(--dsw-static-neutral-bluish-00,#fff));white-space:pre-wrap;word-break:break-word;user-select:text;border-radius:8px;flex:1;padding:10px 12px;font-size:13px;line-height:1.6;overflow-y:auto}.K6acRq_outputPlaceholder{color:var(--dsw-alias-label-tertiary,var(--dsw-static-neutral-bluish-600,#81858c))}";
		const tagId = "@deepseek-ai/dsh-client-ui-translate/TranslatePanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-translate";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TranslatePanel_module_css_default = {
			"body": "K6acRq_body",
			"drawer": "K6acRq_drawer",
			"error": "K6acRq_error",
			"field": "K6acRq_field",
			"go": "K6acRq_go",
			"header": "K6acRq_header",
			"input": "K6acRq_input",
			"label": "K6acRq_label",
			"langRow": "K6acRq_langRow",
			"output": "K6acRq_output",
			"outputHeader": "K6acRq_outputHeader",
			"outputPlaceholder": "K6acRq_outputPlaceholder",
			"root": "K6acRq_root",
			"select": "K6acRq_select",
			"spin": "K6acRq_spin",
			"swap": "K6acRq_swap",
			"title": "K6acRq_title",
			"toggle": "K6acRq_toggle",
			"translate-spin": "K6acRq_translate-spin"
		};
		//#endregion
		//#region src/client/TranslatePanel.tsx
		/**
		* Translation panel: the frame-wide right-side drawer for translating pasted
		* text. Registered into the layout-owned `shell.overlay` list slot, so it is
		* additive and session-independent; the shell layer is click-through, so the
		* entry root is a zero-width fixed strip whose children (the floating toggle
		* and, when open, the drawer) opt back into pointer events.
		*
		* All state is component-private: drawer visibility, drafts, and run results
		* are the component's own live data, and translation runs are local async
		* work — no store, no subscription, no ctx.
		*/
		/** One failure kind to its locale key; the panel only ever shows localized copy. */
		const FAILURE_KEYS = {
			"empty": "error.empty",
			"network": "error.network",
			"api": "error.api",
			"quota": "error.quota"
		};
		/** The target picker never offers `auto` — a translation always needs a target. */
		const TARGET_LANGUAGES = LANGUAGES.filter((lang) => lang.code !== "auto");
		/**
		* Render the translation panel entry.
		* @param props.t - the standard locale seat for the `translate` namespace.
		*/
		function TranslatePanel({ t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [source, setSource] = (0, react.useState)("auto");
			const [target, setTarget] = (0, react.useState)("zh-CN");
			const [input, setInput] = (0, react.useState)("");
			const [output, setOutput] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(null);
			const [copied, setCopied] = (0, react.useState)(false);
			const runAbort = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				runAbort.current?.abort();
			}, []);
			const run = (0, react.useCallback)(async () => {
				if (input.trim().length === 0) {
					setFailure("empty");
					return;
				}
				runAbort.current?.abort();
				const controller = new AbortController();
				runAbort.current = controller;
				setBusy(true);
				setFailure(null);
				setOutput("");
				try {
					const result = await translateText(input, source, target, controller.signal);
					if (controller.signal.aborted) return;
					setOutput(result.translated);
				} catch (error) {
					if (controller.signal.aborted) return;
					setFailure(error instanceof TranslateFailure ? error.kind : "network");
				} finally {
					if (!controller.signal.aborted) setBusy(false);
				}
			}, [
				input,
				source,
				target
			]);
			const swap = (0, react.useCallback)(() => {
				setSource(target);
				setTarget(source === "auto" ? "en" : source);
			}, [source, target]);
			const copy = (0, react.useCallback)(async () => {
				if (!await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(output)) return;
				setCopied(true);
				window.setTimeout(() => {
					setCopied(false);
				}, 1500);
			}, [output]);
			const onInputKeyDown = (0, react.useCallback)((event) => {
				if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
					event.preventDefault();
					run();
				}
			}, [run]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TranslatePanel_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: TranslatePanel_module_css_default.toggle,
					"aria-label": t(open ? "panel.close" : "panel.toggle"),
					title: t(open ? "panel.close" : "panel.toggle"),
					"aria-expanded": open,
					onClick: () => {
						setOpen((open) => !open);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGlobeOutline14, { size: 18 })
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TranslatePanel_module_css_default.drawer,
					role: "complementary",
					"aria-label": t("panel.title"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TranslatePanel_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TranslatePanel_module_css_default.title,
							children: t("panel.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {}),
							"aria-label": t("panel.close"),
							onClick: () => {
								setOpen(false);
							}
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TranslatePanel_module_css_default.body,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TranslatePanel_module_css_default.langRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: TranslatePanel_module_css_default.field,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TranslatePanel_module_css_default.label,
											children: t("source.label")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
											className: TranslatePanel_module_css_default.select,
											value: source,
											onChange: (event) => {
												setSource(event.target.value);
											},
											children: LANGUAGES.map((lang) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: lang.code,
												children: t(lang.labelKey)
											}, lang.code))
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										className: TranslatePanel_module_css_default.swap,
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {}),
										"aria-label": t("swap.label"),
										onClick: swap
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: TranslatePanel_module_css_default.field,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TranslatePanel_module_css_default.label,
											children: t("target.label")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
											className: TranslatePanel_module_css_default.select,
											value: target,
											onChange: (event) => {
												setTarget(event.target.value);
											},
											children: TARGET_LANGUAGES.map((lang) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: lang.code,
												children: t(lang.labelKey)
											}, lang.code))
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: TranslatePanel_module_css_default.input,
								value: input,
								rows: 6,
								placeholder: t("input.placeholder"),
								onChange: (event) => {
									setInput(event.target.value);
								},
								onKeyDown: onInputKeyDown
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								className: TranslatePanel_module_css_default.go,
								icon: busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TranslatePanel_module_css_default.spin,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, {})
								}) : void 0,
								disabled: busy,
								onClick: () => {
									run();
								},
								children: busy ? t("busy") : t("action.translate")
							}),
							failure !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: TranslatePanel_module_css_default.error,
								role: "alert",
								children: t(FAILURE_KEYS[failure])
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TranslatePanel_module_css_default.outputHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TranslatePanel_module_css_default.label,
									children: t("panel.result")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									icon: copied ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, {}),
									disabled: output.length === 0,
									onClick: () => {
										copy();
									},
									children: copied ? t("action.copied") : t("action.copy")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: TranslatePanel_module_css_default.output,
								"aria-live": "polite",
								children: output.length > 0 ? output : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TranslatePanel_module_css_default.outputPlaceholder,
									children: t("output.placeholder")
								})
							})
						]
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** `translate` namespace dictionaries: translation panel copy (product copy is Chinese). */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"panel.title": "翻译",
			"panel.toggle": "打开翻译面板",
			"panel.close": "关闭翻译面板",
			"panel.result": "译文",
			"source.label": "源语言",
			"target.label": "目标语言",
			"swap.label": "交换源语言与目标语言",
			"input.placeholder": "输入要翻译的文本…",
			"action.translate": "翻译",
			"action.copy": "复制",
			"action.copied": "已复制",
			"busy": "翻译中…",
			"output.placeholder": "译文将显示在这里",
			"error.empty": "请输入要翻译的文本",
			"error.network": "网络请求失败，请检查网络后重试",
			"error.api": "翻译服务返回错误，请稍后重试",
			"error.quota": "免费翻译额度已用尽，请明天再试",
			"lang.auto": "自动检测",
			"lang.zh-CN": "中文（简体）",
			"lang.zh-TW": "中文（繁体）",
			"lang.en": "英语",
			"lang.ja": "日语",
			"lang.ko": "韩语",
			"lang.fr": "法语",
			"lang.de": "德语",
			"lang.es": "西班牙语",
			"lang.ru": "俄语",
			"lang.it": "意大利语",
			"lang.pt-BR": "葡萄牙语（巴西）",
			"lang.ar": "阿拉伯语",
			"lang.th": "泰语",
			"lang.vi": "越南语",
			"lang.id": "印尼语",
			"lang.tr": "土耳其语",
			"lang.nl": "荷兰语",
			"lang.pl": "波兰语",
			"lang.uk": "乌克兰语",
			"lang.hi": "印地语"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"panel.title": "Translate",
			"panel.toggle": "Open translation panel",
			"panel.close": "Close translation panel",
			"panel.result": "Translation",
			"source.label": "Source language",
			"target.label": "Target language",
			"swap.label": "Swap source and target languages",
			"input.placeholder": "Enter text to translate…",
			"action.translate": "Translate",
			"action.copy": "Copy",
			"action.copied": "Copied",
			"busy": "Translating…",
			"output.placeholder": "The translation will appear here",
			"error.empty": "Enter some text to translate",
			"error.network": "Network request failed — check your connection and retry",
			"error.api": "The translation service returned an error — please retry",
			"error.quota": "The free translation quota is exhausted — try again tomorrow",
			"lang.auto": "Detect language",
			"lang.zh-CN": "Chinese (Simplified)",
			"lang.zh-TW": "Chinese (Traditional)",
			"lang.en": "English",
			"lang.ja": "Japanese",
			"lang.ko": "Korean",
			"lang.fr": "French",
			"lang.de": "German",
			"lang.es": "Spanish",
			"lang.ru": "Russian",
			"lang.it": "Italian",
			"lang.pt-BR": "Portuguese (Brazil)",
			"lang.ar": "Arabic",
			"lang.th": "Thai",
			"lang.vi": "Vietnamese",
			"lang.id": "Indonesian",
			"lang.tr": "Turkish",
			"lang.nl": "Dutch",
			"lang.pl": "Polish",
			"lang.uk": "Ukrainian",
			"lang.hi": "Hindi"
		};
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "translate";
		/** Required services: the slot registry and the panel's copy. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: register the `translate` dictionaries and the panel
		* entry. One contribution into the overlay list slot; the entry owns all its
		* state, so no store and no injected face are declared.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-translate: dictionaries");
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "translate",
				locale: NS
			}, TranslatePanel));
		}
		//#endregion
		exports.LANGUAGES = LANGUAGES;
		exports.TranslateFailure = TranslateFailure;
		exports.apply = apply;
		exports.chunkText = chunkText;
		exports.detectLanguage = detectLanguage;
		exports.inject = inject;
		exports.translateText = translateText;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map