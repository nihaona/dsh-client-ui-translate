/**
 * Translation-panel slot contract: the registrant-side props composition for
 * the layout-owned `shell.overlay` list slot. The panel is a frame-wide,
 * session-independent surface, so its whole contract is the framework runtime
 * share (root scope — no session facts needed) plus the standard locale seat.
 */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-layout's SlotMap merge (the 'shell.overlay' entry) into
// every program that sees this contract, so PropsRuntime resolves.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { TranslateKey } from '../locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The translation panel's copy. */
    translate: TranslateKey
  }
}

/**
 * Full component props: the overlay runtime share plus the locale seat. The
 * panel owns all its own state (drawer visibility, drafts, run results), so
 * no store and no injected face are declared.
 */
export type TranslatePanelProps =
  PropsRuntime<'shell.overlay'> & PropsLocale<'translate'>
