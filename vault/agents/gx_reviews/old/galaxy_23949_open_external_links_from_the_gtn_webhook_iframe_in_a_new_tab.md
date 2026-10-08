# galaxy#23949 - [26.1] Open external links from the GTN webhook iframe in a new tab

- PR: https://github.com/galaxyproject/galaxy/pull/23949
- Author: itisAliRH
- Base: `release_26.1`
- Head reviewed: `4b6832e2ec3127af4242dd64d655bf48e19ca9d0`
- Size: +20/-0, 1 file (`config/plugins/webhooks/gtn/script.js`)
- Worktree: `~/projects/worktrees/galaxy/pr/23949`
- Status: reviewed; draft below unposted. Verdict: approve.

## Summary

In proxy mode (GTN served same-origin under `/training-material/`) the iframe `load`
handler now adds one delegated `click` listener to the GTN document. A clicked `a[href]`
that isn't inside `[data-tool]`/`[data-workflow]`, resolves to http(s), and is either
another origin or outside `/training-material/` gets `target="_blank"` and
`rel` += `noopener noreferrer`. Default action not prevented, so the browser opens it.
Fixes Zenodo-style `X-Frame-Options` pages breaking inside the overlay.

## Behaviour check (proxy mode)

| Link kind | Result | OK? |
|---|---|---|
| `https://zenodo.org/...` | new tab | yes |
| `/training-material/topics/...` / relative tutorial link | in frame | yes |
| `#section` anchor | resolves to current `/training-material/` URL, in frame | yes |
| `mailto:` / `javascript:` | protocol filter, untouched | yes |
| Galaxy instance link (`/`, `/datasets/...`) without `data-tool` | new tab (previously nested Galaxy in iframe) | improvement |
| Already `target=_blank` | idempotent; `rel` gains noopener | yes |
| Middle-click | `click` doesn't fire, browser default new tab anyway | yes |
| Ctrl/Cmd/Shift-click | attribute set, browser modifier behaviour wins | yes |
| `[data-tool]` / `[data-workflow]` | early return, own handlers unchanged | yes |
| Non-proxy (public GTN, cross-origin) | `contentDocument` null guard returns first (72cf7ef2ac1) | unchanged |

- Listener lifetime: each navigation yields a new `contentDocument`; the old one (and its
  listener) is discarded. Hash navigation doesn't fire `load`, so no double-attach. No leak.
- Ordering: delegated document listener runs after the per-element tool/workflow listeners
  in bubble phase; mutation happens before the default action, so new tab is honoured.
- `<base>` handled via `link.baseURI`.

## Sibling PR #23950

Same author, same file, rewrites the tool/workflow `forEach` handlers to read
`el.dataset.*` instead of walking `e.target`. `git merge-tree` of both heads: clean, no
textual conflict. No semantic conflict either: this PR skips anything inside
`[data-tool],[data-workflow]` and doesn't touch those handlers.

## Findings (ranked; none blocking)

1. **Path check is a near-duplicate of an existing one** -
   `config/plugins/webhooks/gtn/script.js:144` vs `:75`. Both encode "is this a
   `/training-material/` path". A tiny `isTrainingMaterialPath(pathname)` helper at the top
   of the IIFE would keep the proxy prefix in one place. Optional.
2. **Bare `/training-material` (no trailing slash) counts as external** - `:144`. Opens the
   GTN root in a new tab. Unlikely in practice; `startsWith("/training-material")` with a
   `/`-or-end check would cover it. Nit, only worth it if (1) is done.
3. **Galaxy-instance links now open a new tab** - `:144`. Intended per description and
   strictly better than the old nested-Galaxy-in-iframe. A future option is routing them
   via `Galaxy.router.push` + `removeOverlay()` like tool links; out of scope.
4. **No automated test.** `lib/galaxy_test/selenium/test_tutorial_mode.py` only covers
   activation and needs a configured GTN webhook; CI doesn't proxy the GTN, so a
   same-origin test isn't realistic. Manual instructions in PR are adequate for a 20-line
   webhook fix.

Security: `noopener` added, `window.open` not used, no new redirect surface. Nothing to
report privately.

## Draft GitHub review (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*
>
> Looks good. Walked the delegated handler through the cases: external origin and
> same-origin-outside-`/training-material/` links get a new tab; tutorial links, `#` anchors,
> `mailto:`, and `data-tool`/`data-workflow` elements are untouched; the cross-origin guard
> above it keeps the public-GTN path unchanged. Each tutorial navigation gets a fresh
> `contentDocument`, so the listener doesn't accumulate. Also checked it merges cleanly with
> #23950.
>
> One optional tidy-up: the `/training-material/` path check here duplicates the one used
> for the stored location a few lines up. A small helper would keep the proxy prefix in one
> place, e.g.
>
> ```js
> function isTrainingMaterialPath(pathname) {
>     return pathname === "/training-material" || pathname.startsWith("/training-material/");
> }
> ```
>
> used in both spots. Not blocking.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).
