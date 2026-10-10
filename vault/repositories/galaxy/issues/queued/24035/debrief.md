# Debrief: gbutton_tooltip_in_accessible_name

## Research

- Source: the BUGS_FOUND row "Tooltip text joins the accessible name" (play lane, GButton).
- dev sha: `20f365a2654751ba0f390733f261199ceb3f272d`. Scratch worktree: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/8085a6b3-fc13-41f7-b964-fa636a69fe53/scratchpad/F/wt`.
- Repro: `client/src/components/BaseComponents/GButtonTooltipName.test.ts` in the worktree, untracked. On dev: 2 red (GButton name `Cancel Workflow Cancel scheduling of workflow invocation`, GLink name `Jupyter Notebook Open Interactive Tool`), 2 green (icon-only GButton/GLink guards). Uses jest-dom `toHaveAccessibleName`/`toHaveAccessibleDescription` (dom-accessibility-api 0.6.3, a transitive dep), already in the vitest setup. Description on dev, checked separately: `Cancel scheduling of workflow invocation`.
- The row's "Create page / Create a new page" example is not in `client/src` (it is the story args in `GButton.stories.ts` on `vitest_story_play`). The issue uses real call sites instead: `WorkflowInvocationState.vue` (cancel), `InteractiveTools.vue` (tool name link, external link), `FormListElementOperations.vue` ("move up").
- Origin: the nested GTooltip in GButton arrived with `b15ed486e2b` ("remove wrapping span") in 🔀 #19946 (merged 2025-04-08). GLink was added in 🔀 #20063 with the same nesting and TODO. It has been broken since it was introduced; it's not a regression.
- The TODO's "in Vue 3" precondition is already met: client is on vue/@vue/compat 3.5.43.
- Existing abstraction: GPopover `relocate()` moves the floating element to `target.closest("dialog") ?? document.body` (`5b9014402b2`, 🔀 #21959). Teleport-to-body would break inside GModal, which uses a native `<dialog>` with `showModal()` and so sits in the top layer.
- Other GTooltip nesters: `DatasetState.vue` (inside a non-interactive span, so no name problem, but the text is in the reading flow); `StatelessTags.vue` and `ExportIncludeOptions.vue` (siblings, fine).
- Call-site counts come from a regex scan and are approximate: about 74 tooltip GButton/GLink with visible text, about 90 with no text and no aria-label (about 20 of those pass `icon-only`), 8 with aria-label.
- Fix sketches, applied temporarily and then reverted. Diffs are in `scratchpad/F/fix_sketch{,2,3}.diff`.
  - Sketch 1: Teleport-to-body in GButton. The GButton cases went green, with no regressions in 84 files. Rejected because of the GModal top layer.
  - Sketch 2: relocate inside GTooltip plus a fallback in GButton only. Superseded: it never ran the icon-only GLink case, and it left the hidden tooltip as `sr-only` orphan text in `body`.
  - Sketch 3 (the one the proposal describes): GPopover-style relocate in GTooltip (hidden host span, `closest("dialog") ?? body`), `:hidden="!isShowing"` on the tooltip, and an inline `aria-label` fallback (text check on mount+nextTick and on update) in both GButton and GLink. All 4 repro cases went green. Two guard tests also went green (dialog containment; a hidden tooltip is `hidden`, not visible, and still gives the description). They are saved at `scratchpad/F/GTooltipFixGuards.test.ts`. 116 files ran: 115 pass, and the only failures are GTooltip.test.ts's 3 tests. Those read `wrapper.attributes("style")`/`classes()` from what is now a placeholder root. Retargeted to `document.querySelector("[role=tooltip]")` (5 lines), all 3 pass, so the behaviour is unchanged. Flag this: the fix edits existing test code by changing the lookup only, not the assertions.
  - The fallback check has to run after the tooltip has moved (nextTick). If it runs on mount, it still sees the tooltip's text.
  - The `aria-hidden` alternative, checked on dev: adding `aria-hidden="true"` to the nested tooltip turns the text cases green, description included, and turns both icon-only cases red (empty name). This matches what the alternative says.
- The Context claim is verified: on `jmchilton/vitest_story_play`, `GButton.stories.ts` has `labelled(label, tooltip)` returning `^label( tooltip)?$`, with a comment describing this bug.
- Duplicates: gh search issues+PRs for "GTooltip accessible name", "tooltip sibling Vue 3", "GButton tooltip aria", "tooltip accessible name button", "GTooltip teleport", "GButton screen reader tooltip", "GTooltip", "GButton tooltip", "tooltip accessibility", "accessible name tooltip", "tooltip screen reader", "aria-describedby tooltip", "tooltip a11y". The search hit the rate limit partway, and I reran the last four after the reset. No duplicate found. Related but distinct: #21962 (v-g-tooltip), #22920 (GButton disabled-title), #23924.
- Possible separate issue, not in this one: `v-g-tooltip` `updateContent` sets `aria-label = content` on any non-toggle element, even one with visible text. On dev, `<button v-g-tooltip title="Cancel scheduling…">Cancel Workflow</button>` is named "Cancel scheduling of workflow invocation", so the tooltip replaces the visible label (a WCAG 2.5.3 label-in-name failure).
- Unverified: the input-group clipping. `GButton` sets `position: relative; overflow: hidden` in `.input-group-append`/`.input-group-prepend`, which should clip a nested absolutely positioned tooltip, e.g. in `DelayedInput.vue`. I did not check this in a browser. It is cited only as a CSS condition in the Alternatives section.
- Unverified: real screen-reader output. The "typical announcement" row is derived from accname (name, role, description); I did not record it from NVDA or VoiceOver.

## Review round (subagent)

- Repro is byte-identical to the issue snippet; on dev 20f365a2654 it gives 2 red and 2 green guards. Call sites and code claims verified, including that GModal really uses the top layer (`showModal()`) and GPopover's `relocate()`.
- Fix sketch 3 plus the guard tests pass in 87 files (631 tests). `GTooltip.test.ts` needs its tooltip lookup changed (assertions untouched); the issue now says so in its own bullet. The `aria-hidden` alternative was checked: it fails both icon-only cases, as claimed.
- Origin refined: #19946 (25.0) started the tooltip as a sibling in a wrapping `<span>`, and `b15ed486e2b` moved it into the button under Vue 2's single-root limit. Verified #20063 and #21959.
- Tightened the approach paragraph, corrected the clipping wording (the control's own `overflow: hidden`), and cross-referenced #24031.

## Leftover

- Input-group clipping is a CSS argument only; not checked in a browser.
- The "typical announcement" row comes from accessible-name rules, not a recorded screen-reader run.
- Separate unfiled finding (verified on dev): `v-g-tooltip` sets `aria-label` from tooltip text even on buttons with visible text, so the tooltip replaces the visible label in the name. #24031 doesn't cover it. Candidate for its own issue, or fold into the #24031 directive fix.
