# galaxy#23950 - [26.1] Fix GTN webhook tool links with formatted tool names

- PR: https://github.com/galaxyproject/galaxy/pull/23950
- Author: itisAliRH
- Base: `release_26.1` (merge-base `b18269a10f8`)
- Head reviewed: `626cdbdc7722b1dcd80b8985824efeb9415b1133`
- Size: +6/-18, 1 file (`config/plugins/webhooks/gtn/script.js`)
- Status: reviewed, draft below unposted. No existing reviews or comments on the PR.

## Summary

GTN renders tool titles through markdown, so `span[data-tool]` can contain `<strong><strong>..</strong></strong>` or
`<strong><code>..</code></strong>`. The click handler walked one level up from `e.target`, so clicks on the inner
element read `dataset.tool` from the outer `<strong>` and pushed `/?tool_id=undefined`. The fix reads the id from the
element the listener is bound to (`el.dataset.tool`), deletes the one-level walk, and drops the implicit globals
(`tool_id`, `trs_url` were assigned without a declaration and leaked onto `window`).

Commits:
1. `28be3e5ae90` Fix GTN webhook tool links with formatted tool names - tool handler.
2. `626cdbdc772` Read the TRS URL from the bound GTN workflow element - same change applied to the sibling workflow
   handler. The PR body describes this ("gets the same change for consistency"), so the PR does not do more than it
   says. Both commits belong; nothing unrelated.

## Findings

No blocking findings. Ranked:

1. **Fix is the right shape** (`script.js:141-143`, `script.js:160-162`). Reading the bound element is equivalent to
   `e.currentTarget` and strictly better than a `closest("[data-tool]")` walk: the listener is attached only to
   elements matched by `span[data-tool],a[data-tool]`, so `el` always carries the attribute regardless of nesting depth.
   The old one-level climb handled direct children but failed at depth >= 2; any depth works now.
2. **Sibling consistency** - tool and workflow handlers now match. Grep confirms no other code in the webhook read the
   leaked `window.tool_id` / `window.trs_url` globals, so dropping them is safe. `encodeURIComponent` is kept on both
   router pushes.
3. **Overlap with #23949** (same author, same file, same `load` handler; adds a document-level click listener that opens
   off-GTN links in a new tab). Hunks are disjoint: `git merge-tree` of the two heads merges clean. The two are
   semantically compatible - #23949 explicitly skips links inside `[data-tool],[data-workflow]` via `closest()`, so it
   does not interfere with these handlers. Either merge order is fine.
4. (Pre-existing, out of scope) Neither handler calls `preventDefault()`. If GTN ever emits `a[data-tool]` with a real
   `href`, the iframe would also navigate. The PR body reports the iframe does not navigate in current markup; not a
   regression here, just noting.
5. (Theoretical, ignore) A `data-tool` element nested inside another `data-tool`/`data-workflow` element would fire
   both listeners. GTN markup does not produce this.

**Tests:** none added. Webhooks are plain IIFE scripts under `config/plugins/webhooks/` with no unit-test harness. The
only coverage is `lib/galaxy_test/selenium/test_tutorial_mode.py`, which just opens the overlay, skips when the `gtn`
webhook is absent, and needs a same-origin proxied GTN to exercise click handlers. A test is not feasible without new
infrastructure; disproportionate for a +6/-18 backport fix. The author's manual static-page harness (11 cases) is
reasonable evidence.

**Reuse:** nothing to reuse; the change removes code rather than adding helpers.

## Draft review (unposted)

Verdict: Approve.

```
*Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*

Looks good. Reading `el.dataset.tool` / `el.dataset.workflow` from the bound element handles any nesting depth (the
listener is only attached to elements matched by `[data-tool]` / `[data-workflow]`), and dropping the implicit
`tool_id` / `trs_url` globals is a nice cleanup - nothing else in the webhook read them.

Checked against #23949: the hunks are disjoint and the two branches merge cleanly, and #23949's document-level link
handler already skips anything inside `[data-tool],[data-workflow]`, so the two don't interact.
```

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).
