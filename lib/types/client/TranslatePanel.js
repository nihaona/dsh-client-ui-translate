import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, IconCheckOutline14, IconCloseOutline16, IconCopyOutline16, IconGlobeOutline14, IconLoadingOutline16, IconRefreshOutline14, writeClipboard, } from '@deepseek-ai/dsh-client-ui-primitives';
import { LANGUAGES, TranslateFailure, translateText } from "./translate.js";
import css from './TranslatePanel.module.css';
/** One failure kind to its locale key; the panel only ever shows localized copy. */
const FAILURE_KEYS = {
    'empty': 'error.empty',
    'network': 'error.network',
    'api': 'error.api',
    'quota': 'error.quota',
};
/** The target picker never offers `auto` — a translation always needs a target. */
const TARGET_LANGUAGES = LANGUAGES.filter(lang => lang.code !== 'auto');
/**
 * Render the translation panel entry.
 * @param props.t - the standard locale seat for the `translate` namespace.
 */
export function TranslatePanel({ t }) {
    const [open, setOpen] = useState(false);
    const [source, setSource] = useState('auto');
    const [target, setTarget] = useState('zh-CN');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState(null);
    const [copied, setCopied] = useState(false);
    const runAbort = useRef(null);
    // Abort any in-flight run when the entry is disposed (HMR, teardown).
    useEffect(() => () => { runAbort.current?.abort(); }, []);
    const run = useCallback(async () => {
        if (input.trim().length === 0) {
            setFailure('empty');
            return;
        }
        runAbort.current?.abort();
        const controller = new AbortController();
        runAbort.current = controller;
        setBusy(true);
        setFailure(null);
        setOutput('');
        try {
            const result = await translateText(input, source, target, controller.signal);
            if (controller.signal.aborted)
                return;
            setOutput(result.translated);
        }
        catch (error) {
            if (controller.signal.aborted)
                return;
            setFailure(error instanceof TranslateFailure ? error.kind : 'network');
        }
        finally {
            if (!controller.signal.aborted)
                setBusy(false);
        }
    }, [input, source, target]);
    const swap = useCallback(() => {
        setSource(target);
        setTarget(source === 'auto' ? 'en' : source);
    }, [source, target]);
    const copy = useCallback(async () => {
        const accepted = await writeClipboard(output);
        if (!accepted)
            return;
        setCopied(true);
        window.setTimeout(() => { setCopied(false); }, 1500);
    }, [output]);
    const onInputKeyDown = useCallback((event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void run();
        }
    }, [run]);
    return (_jsxs("div", { className: css.root, children: [_jsx("button", { type: "button", className: css.toggle, "aria-label": t(open ? 'panel.close' : 'panel.toggle'), "aria-expanded": open, onClick: () => { setOpen(open => !open); }, children: _jsx(IconGlobeOutline14, { size: 16 }) }), open && (_jsxs("div", { className: css.drawer, role: "complementary", "aria-label": t('panel.title'), children: [_jsxs("div", { className: css.header, children: [_jsx("span", { className: css.title, children: t('panel.title') }), _jsx(Button, { size: "sm", variant: "ghost", icon: _jsx(IconCloseOutline16, {}), "aria-label": t('panel.close'), onClick: () => { setOpen(false); } })] }), _jsxs("div", { className: css.body, children: [_jsxs("div", { className: css.langRow, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.label, children: t('source.label') }), _jsx("select", { className: css.select, value: source, onChange: (event) => { setSource(event.target.value); }, children: LANGUAGES.map(lang => (_jsx("option", { value: lang.code, children: t(lang.labelKey) }, lang.code))) })] }), _jsx(Button, { size: "sm", variant: "ghost", className: css.swap, icon: _jsx(IconRefreshOutline14, {}), "aria-label": t('swap.label'), onClick: swap }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.label, children: t('target.label') }), _jsx("select", { className: css.select, value: target, onChange: (event) => { setTarget(event.target.value); }, children: TARGET_LANGUAGES.map(lang => (_jsx("option", { value: lang.code, children: t(lang.labelKey) }, lang.code))) })] })] }), _jsx("textarea", { className: css.input, value: input, rows: 6, placeholder: t('input.placeholder'), onChange: (event) => { setInput(event.target.value); }, onKeyDown: onInputKeyDown }), _jsx(Button, { variant: "primary", className: css.go, icon: busy ? _jsx("span", { className: css.spin, children: _jsx(IconLoadingOutline16, {}) }) : undefined, disabled: busy, onClick: () => { void run(); }, children: busy ? t('busy') : t('action.translate') }), failure !== null && (_jsx("div", { className: css.error, role: "alert", children: t(FAILURE_KEYS[failure]) })), _jsxs("div", { className: css.outputHeader, children: [_jsx("span", { className: css.label, children: t('panel.result') }), _jsx(Button, { size: "sm", variant: "ghost", icon: copied ? _jsx(IconCheckOutline14, {}) : _jsx(IconCopyOutline16, {}), disabled: output.length === 0, onClick: () => { void copy(); }, children: copied ? t('action.copied') : t('action.copy') })] }), _jsx("div", { className: css.output, "aria-live": "polite", children: output.length > 0 ? output : _jsx("span", { className: css.outputPlaceholder, children: t('output.placeholder') }) })] })] }))] }));
}
//# sourceMappingURL=TranslatePanel.js.map