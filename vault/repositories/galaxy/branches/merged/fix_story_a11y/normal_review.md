Acted on both review findings: restored native keyboard selection for manual pairing and scoped option hover hints to one selection control. Removed the obsolete multiselect state helper. Source review approved.

<details>
<summary>Independent review</summary>

# Normal correctness review

Reviewed the production and test diff in `fix_story_a11y` against dev commit `b406ead2e4eb55b94d1ba437af8f60ebe4983947`. This is an independent source review; the coordinating agent owns executing the strict Storybook harness and focused unit checks.

## Findings and follow-up review

**Resolved P1: Restore keyboard selection for manual dataset pairing.** The initial implementation removed the row's keyboard affordance and rendered its replacement button only for `hasActions`, making `PairCollectionCreator.vue:478` choices mouse-only. Follow-up source review confirms that `notEditable && !hasActions` now produces a native whole-row button with dataset text as its accessible name, `type="button"` and pressed state. This preserves native Enter/Space activation without nesting rename/remove controls. A focused unit regression test covers these pairing props and emitted selection.

**Resolved P2: Render the FormSelectMany hover hint only once.** Follow-up source review confirms that `.option-row` owns layout/highlight styles and `.option-button` owns native-button presentation/focus. Hint pseudo-elements now apply only to `.option-row:not(.with-custom-label) .option-button`, with a matching highlighted-state override. The outer row and custom label actions no longer receive duplicate selection hints, and removing row-level space-between avoids pushing custom label content to the far edge.

## Other reviewed areas

- The vue-multiselect patch places combobox state on the searchable input, retains combobox state on the non-searchable root, drops closed/unmounted option references, removes positive tabindex from remove controls, and prevents remove clicks from activating selection. Its native removal controls need actual keyboard regression coverage beyond synthetic click tests; the existing positive-tabindex path already had focus restoration limitations.
- Tooltip naming now preserves visible text and explicit label/labelledby attributes and avoids invalid labels on generic containers. The tests cover visible-name changes and explicit-name preservation. The implementation still checks textContent rather than the full accessible-name algorithm, so it should not be described as a comprehensive naming solution for inputs with externally associated labels or dynamically replaced explicit labels.
- Label associations are direct, and newly generated IDs are instance-local. The fixed installation-settings input ID follows its already fixed datalist ID and single-dialog usage; no new duplicate-ID scenario was found in the changed usage paths.
- FormSelectMany separates custom label actions from option-selection buttons, preserves option button IDs used for arrow movement and focus restoration, and prevents duplicate click handling. The updated collection/test selectors follow that structural change without weakening assertions.
- Folder opening now uses a single native button and stops selection-row click propagation; dropdown buttons no longer contain GButton children.
- ScrollList keeps footer content outside the list and exposes the scroll container to keyboard navigation. Progress-bar names are on BProgressBar elements that carry the actual progressbar role.
- No test was removed or materially weakened in the reviewed diff. No production Storybook suppression or rule disabling was added.

Both review findings are resolved. Normal source review is approved with no remaining actionable regression findings; the coordinating agent remains responsible for completing the strict suite, focused unit checks and browser keyboard probes before delivery. This review alone does not establish complete WCAG conformance.

</details>
