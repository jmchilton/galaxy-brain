# happy_dom_datalist_list — implementation debrief

Branch `jmchilton:happy_dom_datalist_list` (`9131822c82b`), on dev `253a4cb0b9c`. Two commits.

## Why
Dependabot #22915 (happy-dom 20.6.2 → 20.8.9) and its successors can't merge, because dannon pinned happy-dom to exactly 20.6.2 in `5c13d421f09`. From 20.6.3, `HTMLInputElement.list` does an unescaped `querySelector("datalist#<id>")`, which throws on tool form ids containing `|`. Upstream is still unfixed at 20.14.5.

## What
- `FormText.vue` binds `list` only when the `datalist` prop is given. Previously every text input pointed at a `<id>-datalist` that usually didn't exist.
- happy-dom moves from the `20.6.2` pin to `^20.14.5`, picking up the 20.8.8/20.8.9 security fixes.

## Verification (node 22.20.0)
- Baseline dev: Form+Tool 314/314.
- happy-dom 20.14.5 alone: 3 red in `FormDisplay.test.js` (`not a valid selector` on `conditional_section|conditional_leaf-datalist` etc.).
- With the FormText fix: Form+Tool+Common 416/416; full client suite 546 files, 4196 passed, 1 skipped.

## Not done
- A datalist id derived from a piped parameter id (option 2, `useUid`) would still throw under happy-dom. No current test renders one, and real browsers are fine.
- Upstream happy-dom fix (`getElementById`/`CSS.escape` in the `list` getter) not filed.
- On merge, close #22915 as superseded.
