/**
 * Translation panel plugin, node half.
 *
 * Deliberately empty: translating is a browser-only concern here. The panel
 * calls the free MyMemory public API directly from the browser (CORS-enabled,
 * keyless), so the host plane has nothing to own — no tools, no sessions, no
 * model route. Everything model-visible that this plugin ever ships is the
 * text the user pastes into its drawer.
 */

/** Host plugin body — the browser half does all the work. */
export function apply(): void {}
