# galaxy#23928 - [26.1] Fix Safari workflow connection drags

- PR: https://github.com/galaxyproject/galaxy/pull/23928 (mvdbeek), base `release_26.1`
- Fixes: #22175 (first connection drag after editor load selects text in Safari)
- Reviewed head: `296e110e9ce14f7ebad31f796f57ac4c15fe77aa` (merge-base `fcbf06253ef`)
- Verdict: **approve**. Correct, minimal, scoped to the only element that needs it.

## Change

`client/src/components/Workflow/Editor/NodeOutput.vue:485-487` adds
`-webkit-user-select: none; user-select: none;` to `.output-terminal`.

## Analysis

- **Root cause matches.** The output terminal is the editor's only native HTML5 drag
  source. `DraggableWrapper` gets `:draggable="!readonly"` and `:prevent-default="false"`
  (`NodeOutput.vue:426-429`). The flag has to stay false: `useDraggable.js:28-29`
  would otherwise `preventDefault()` the `pointerdown`, and the native `dragstart` that carries
  `dataTransfer` (`Draggable.vue:83-104`) would never fire. Because the default is left alone,
  Safari runs its drag-or-select heuristic on mousedown and can start a text selection
  first. Making the handle non-selectable is the standard WebKit fix. It leaves the drag
  payload and drop handling untouched.
- **Siblings need nothing.** Input terminals (`NodeInput.vue:216-232`) are drop targets
  only, with `@drop`/`@dragenter`/`@dragover` and no drag source. Step nodes and comments
  use pointer-based dragging with the default `preventDefault: true`, so selection is
  already suppressed. A grep for `prevent-default="false"` or `draggable=` in
  `components/Workflow/Editor` finds only `NodeOutput.vue`. The step card header is
  already `.unselectable` (`Node.vue:19`).
- **Reuse (optional, non-blocking).** The global `.unselectable` class exists
  (`client/src/style/scss/base.scss:70-72`, built on the `user-select` mixin in
  `style/scss/mixins.scss:8-14`) and `Node.vue:19` already uses it in this editor. Adding
  `unselectable` to the terminal's class list (`NodeOutput.vue:422`) would reuse it. The
  inline CSS keeps the reason next to the terminal styles and stays visible on a
  `release_26.1` backport, so either choice is fine. This is not worth a round-trip.
- **Tests.** No automated test is feasible. Galaxy's Selenium and Playwright suites run
  Chromium, which doesn't reproduce the bug. The author's manual Safari verification is
  the right evidence.

## Risks

Risks are minimal. This change doesn't lock Galaxy into a choice that is hard to change
(a two-way door). It is one CSS rule on a small icon handle, and the workflow labels
around it stay selectable.

## Draft GitHub review (unposted)

```
*Posted by Claude (AI assistant) on behalf of jmchilton. Not authored by jmchilton personally.*

Looks good. The output terminal is the editor's only native HTML5 drag source, and it has to run with `prevent-default=false` so `dragstart` and `dataTransfer` fire. That leaves Safari free to pick text selection on the first mousedown, so `user-select: none` on the handle is the right fix. Input terminals are only drop targets, and steps and comments use pointer dragging with `preventDefault`, so nothing else needs this.

Optional and non-blocking: the global `.unselectable` class (`style/scss/base.scss`, already used on the step header in `Node.vue`) would do the same if added to the terminal's class list. The inline rule with its comment works fine too.

No automated test is feasible here since CI browsers are Chromium. The manual Safari check covers it. Approving.
```
