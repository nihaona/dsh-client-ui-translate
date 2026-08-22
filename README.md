# dsh-client-ui-translate (external)

English | [中文](README.zh.md)

A DSH web translation panel: a right-edge drawer where you paste text, pick
source/target languages, and get a translation. It is installed **outside the
DSH source tree** (in `$DSH_HOME`), so a DSH update overwriting the source
checkout does not touch it.

- Location: `$DSH_HOME/plugins/dsh-client-ui-translate`
- Registered into the web profile as a bundle, composing the `ui-translate`
  browser plugin row via `cordis.patch.yml`.
- Translation backend: the free [MyMemory public API](https://mymemory.translated.net/doc/spec.php)
  (keyless, CORS-enabled, called directly from the browser). Long input is
  chunked at sentence boundaries; an `auto` source is resolved client-side by
  script heuristics.

## Files

- `src/` — the plugin source (component `TranslatePanel.tsx`, service
  `translate.ts`, `locales.ts`, `contract/slots.ts`, `index.ts`).
- `lib/` — **prebuilt** output (`client.js` browser bundle, `index.js` node
  half, `types/`). This is what DSH loads.
- `cordis.patch.yml` — composes the `ui-translate` row when the package is a
  profile bundle.
- `package.json` — package manifest (`exports["./client"]` + `dsh.client`).

## How it is wired

The web profile `$DSH_HOME/profiles/web/package.json` lists this package in
`dsh.profile.bundles` and `dependencies`. On `dsh web` startup the loader
composes this bundle's `cordis.patch.yml`, which inserts the `ui-translate`
row; the browser module system then serves `lib/client.js` under
`/plugins/@deepseek-ai/dsh-client-ui-translate/client.js`.

## Rebuilding after editing `src/`

`lib/` is prebuilt with DSH's own tsdown client preset, which lives in the DSH
source checkout, so a rebuild must run through it. From a DSH checkout
(`D:\deepseek-harness`):

1. Temporarily place this package's `src/`, `tsconfig.json`, `tsdown.config.ts`
   and a repo-shaped `package.json` under `packages/client/ui-translate`.
2. Run `pnpm exec tsc -b packages/client/ui-translate` then
   `pnpm --filter @deepseek-ai/dsh-client-ui-translate run bundle`.
3. Copy the resulting `lib/` back here, then remove the temporary repo copy.

The DSH agent can perform this rebuild on request. The prebuilt bundle only
needs rebuilding when the plugin source changes or DSH's baseline externals
(`react`, `@deepseek-ai/dsh-client-ui-primitives`) change.

## Toggling

- Enable: ensure this package is listed in the web profile's
  `dsh.profile.bundles` (+ dependency), then restart `dsh web`.
- Disable: remove it from `dsh.profile.bundles`, then restart `dsh web`.
