# galaxy#23952 - [26.1] Make GTN webhook tool and workflow buttons keyboard accessible

- PR: https://github.com/galaxyproject/galaxy/pull/23952
- Author: itisAliRH
- Base: `release_26.1`
- Head reviewed: `0fe0a3c1622e86f9b9e6da9e0e5d4d1e92637eb5`
- Stacked on #23950 (head `626cdbdc772`, already reviewed: approve - see
  `galaxy_23950_fix_gtn_webhook_tool_links_with_formatted_tool_names.md`). Only the new
  commit reviewed: `git diff 626cdbdc772 0fe0a3c1622` (+20/-2 of the +26/-18 total).
- Worktree: `~/projects/worktrees/galaxy/pr/23952`
- Status: reviewed; draft below unposted. Verdict: approve.

## Summary

Adds `buttonify(el, activate)` at the top of the GTN webhook IIFE
(`config/plugins/webhooks/gtn/script.js:19-37`). It attaches `activate` as the click
handler; for non-`<a>` elements it also sets `role="button"` / `tabindex="0"` only when
absent and adds a `keydown` listener that runs the same `activate` on Enter or Space with
`preventDefault()` (stops Space scrolling the tutorial). The tool and workflow `forEach`
loops (`:160`, `:179`) now call `buttonify` instead of `addEventListener("click", ...)`.

## A11y check

| Concern | Result |
|---|---|
| One activation path for click + keyboard | yes, same closure passed to both |
| `role`/`tabindex` only when unset | yes; GTN `_layouts/workflow.html:128` "Launch in Tutorial Mode" already has both and is preserved |
| GTN markup actually emitted | `_plugins/jekyll-tool-tag.rb:52,57` emits `<span class="tool" data-tool aria-role="button">` (invalid attr, so `hasAttribute("role")` is false and role is added - correct); `:88` workflow span has neither |
| `<a data-tool>` left alone | yes, early return after click wiring; no `a[data-tool]` found in current GTN anyway |
| Space on keydown vs keyup | keydown; native buttons fire Space on keyup, but keydown + `preventDefault` is the common, acceptable pattern and avoids scroll |
| Nested interactive children | none - GTN spans contain only `<i aria-hidden>` + `<strong>` text, so bubbling keydown from a child isn't a concern |
| Re-applied per iframe navigation | yes, runs in the iframe `load` handler on each new `contentDocument` |
| Content added after load | not handled, but GTN renders these statically; not a real gap |
| Focus-visible styling | browser default outline; GTN `main.scss:1443` styles `span.tool/span.workflow` without suppressing `outline`. Fine |
| Reusable Galaxy client utility | none realistically reusable - webhook is plain JS loaded outside the Vue bundle (`client/src/composables/accessibleHover.ts` etc. not importable) |

## Interaction with #23949

#23949 adds one delegated `click` listener on the GTN document that returns early for
anything inside `[data-tool],[data-workflow]`. `git merge-tree --write-tree 0fe0a3c1622
refs/pr/23949` (4b6832e2ec3): clean (tree `c93b5124ddd`). No semantic interaction: keydown
activation never synthesizes a click, and the delegated handler skips these elements anyway.

## Findings (ranked; none blocking)

1. **Key auto-repeat re-fires the action** - `script.js:31-35`. Holding Enter/Space calls
   `activate()` repeatedly. For tools that's repeated `router.push` of the same path
   (harmless); for `upload1` it's repeated `#tool-panel-upload-button.click()`, which may
   toggle the upload dialog. One-line fix: `if (e.repeat) return;` at the top of the
   listener. Suggest, not required.
2. **Upstream GTN markup bug** - GTN `_plugins/jekyll-tool-tag.rb:52,57` uses
   `aria-role="button"`, which isn't an ARIA attribute. The webhook guard copes, and the
   author's reasoning for not adding `tabindex` in GTN (buttons only act inside Galaxy) is
   sound, but the bogus `aria-role` should be dropped in GTN. Follow-up for
   training-material, not this PR.
3. **Focus is stranded after activation** (pre-existing, follow-up) - `removeOverlay()`
   only sets `visibility: hidden`; a keyboard user's focus stays in the hidden iframe
   rather than landing in the opened tool form. Similarly there's no Escape-to-close for the
   overlay. Both are broader overlay focus-management work, out of scope here.
4. **No automated test.** `lib/galaxy_test/selenium/test_tutorial_mode.py` needs a proxied
   GTN and is skipped otherwise; a keyboard test would hit the same wall. Manual steps in the
   PR body plus the author's 18-check static harness are a reasonable substitute.

## Draft GitHub review (unposted)

Event: APPROVE

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*
>
> Looks good - one shared activation function for click and keyboard, `role`/`tabindex`
> only added when missing (the workflow layout's "Launch in Tutorial Mode" button keeps its
> own), links untouched, and `preventDefault` on Space stops the tutorial scrolling. Merges
> cleanly with #23949, whose delegated click handler skips `[data-tool]`/`[data-workflow]`.
>
> One small optional suggestion: holding Enter/Space auto-repeats `keydown`, so `activate()`
> fires repeatedly - harmless for `router.push`, but for `upload1` it re-clicks the upload
> button. Skipping repeats avoids that:
>
> ```js
> el.addEventListener("keydown", (e) => {
>     if (e.repeat) {
>         return;
>     }
>     if (e.key === "Enter" || e.key === " ") {
>         e.preventDefault();
>         activate();
>     }
> });
> ```
>
> Side note, not for this PR: GTN's tool tag emits `aria-role="button"`, which isn't a real
> ARIA attribute - worth dropping in training-material at some point.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).
