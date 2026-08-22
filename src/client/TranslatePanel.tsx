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
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  Button,
  IconCheckOutline14,
  IconCloseOutline16,
  IconCopyOutline16,
  IconGlobeOutline14,
  IconLoadingOutline16,
  IconRefreshOutline14,
  writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { LANGUAGES, TranslateFailure, translateText, type LangCode, type TranslateFailureKind } from './translate.ts'
import type { TranslatePanelProps } from './contract/slots.ts'
import css from './TranslatePanel.module.css'

/** One failure kind to its locale key; the panel only ever shows localized copy. */
const FAILURE_KEYS: Record<TranslateFailureKind, 'error.empty' | 'error.network' | 'error.api' | 'error.quota'> = {
  'empty': 'error.empty',
  'network': 'error.network',
  'api': 'error.api',
  'quota': 'error.quota',
}

/** The target picker never offers `auto` — a translation always needs a target. */
const TARGET_LANGUAGES = LANGUAGES.filter(lang => lang.code !== 'auto')

/**
 * Render the translation panel entry.
 * @param props.t - the standard locale seat for the `translate` namespace.
 */
export function TranslatePanel({ t }: TranslatePanelProps) {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<LangCode>('auto')
  const [target, setTarget] = useState<Exclude<LangCode, 'auto'>>('zh-CN')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<TranslateFailureKind | null>(null)
  const [copied, setCopied] = useState(false)
  const runAbort = useRef<AbortController | null>(null)

  // Abort any in-flight run when the entry is disposed (HMR, teardown).
  useEffect(() => () => { runAbort.current?.abort() }, [])

  const run = useCallback(async (): Promise<void> => {
    if (input.trim().length === 0) {
      setFailure('empty')
      return
    }
    runAbort.current?.abort()
    const controller = new AbortController()
    runAbort.current = controller
    setBusy(true)
    setFailure(null)
    setOutput('')
    try {
      const result = await translateText(input, source, target, controller.signal)
      if (controller.signal.aborted) return
      setOutput(result.translated)
    } catch (error) {
      if (controller.signal.aborted) return
      setFailure(error instanceof TranslateFailure ? error.kind : 'network')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }, [input, source, target])

  const swap = useCallback((): void => {
    setSource(target)
    setTarget(source === 'auto' ? 'en' : source)
  }, [source, target])

  const copy = useCallback(async (): Promise<void> => {
    const accepted = await writeClipboard(output)
    if (!accepted) return
    setCopied(true)
    window.setTimeout(() => { setCopied(false) }, 1500)
  }, [output])

  const onInputKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void run()
    }
  }, [run])

  return (
    <div className={css.root}>
      <button
        type="button"
        className={css.toggle}
        aria-label={t(open ? 'panel.close' : 'panel.toggle')}
        title={t(open ? 'panel.close' : 'panel.toggle')}
        aria-expanded={open}
        onClick={() => { setOpen(open => !open) }}
      >
        <IconGlobeOutline14 size={18} />
      </button>
      {open && (
        <div className={css.drawer} role="complementary" aria-label={t('panel.title')}>
          <div className={css.header}>
            <span className={css.title}>{t('panel.title')}</span>
            <Button size="sm" variant="ghost" icon={<IconCloseOutline16 />} aria-label={t('panel.close')} onClick={() => { setOpen(false) }} />
          </div>
          <div className={css.body}>
            <div className={css.langRow}>
              <label className={css.field}>
                <span className={css.label}>{t('source.label')}</span>
                <select
                  className={css.select}
                  value={source}
                  onChange={(event) => { setSource(event.target.value as LangCode) }}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{t(lang.labelKey)}</option>
                  ))}
                </select>
              </label>
              <Button
                size="sm"
                variant="ghost"
                className={css.swap}
                icon={<IconRefreshOutline14 />}
                aria-label={t('swap.label')}
                onClick={swap}
              />
              <label className={css.field}>
                <span className={css.label}>{t('target.label')}</span>
                <select
                  className={css.select}
                  value={target}
                  onChange={(event) => { setTarget(event.target.value as Exclude<LangCode, 'auto'>) }}
                >
                  {TARGET_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{t(lang.labelKey)}</option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              className={css.input}
              value={input}
              rows={6}
              placeholder={t('input.placeholder')}
              onChange={(event) => { setInput(event.target.value) }}
              onKeyDown={onInputKeyDown}
            />
            <Button
              variant="primary"
              className={css.go}
              icon={busy ? <span className={css.spin}><IconLoadingOutline16 /></span> : undefined}
              disabled={busy}
              onClick={() => { void run() }}
            >
              {busy ? t('busy') : t('action.translate')}
            </Button>
            {failure !== null && (
              <div className={css.error} role="alert">{t(FAILURE_KEYS[failure])}</div>
            )}
            <div className={css.outputHeader}>
              <span className={css.label}>{t('panel.result')}</span>
              <Button
                size="sm"
                variant="ghost"
                icon={copied ? <IconCheckOutline14 /> : <IconCopyOutline16 />}
                disabled={output.length === 0}
                onClick={() => { void copy() }}
              >
                {copied ? t('action.copied') : t('action.copy')}
              </Button>
            </div>
            <div className={css.output} aria-live="polite">
              {output.length > 0 ? output : <span className={css.outputPlaceholder}>{t('output.placeholder')}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
