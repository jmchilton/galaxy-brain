# Normal review: deck polish (P2, P4, P10)

A normal review subagent read stage 2's three deck-polish commits (compact table snapshots, image snapshots sized to the card body, a halo round each card) and stage 3's rebase of them. I acted on the bug it found: an image card's preview was 2px taller than the card body, so the preview became a scroll container. In browsers with classic scrollbars that put a scrollbar in every image card and narrowed the image. The image box now subtracts the preview's border, and the card's preview is clipped rather than scrolled, which also stops a long table from scrolling inside a static card. I also strengthened the E2E checks, moved them after the refit wait, and took the halo colour from `--background-color`.

Not acted on:

- **Connectors now paint over the start of their step's border** (they sit at z-index 101, over the halos). With the 20px layout gap nothing else is crossed, so it's cosmetic; starting the path 2px to the right would move the connector's join, which the E2E checks to within 2px.
- **Card headers wrap long labels while a grown step's label truncates.** Unchanged, since the card header predates this work; it's a decision for John if it matters.

<details>
<summary>Full review</summary>

1. **Medium: image snapshots overflow by 2px, so the preview scrolls.** `calc(100cqh - 1rem)` subtracts the `.card-body` padding but not the BCard's 1px borders, and `.invocation-output-preview` is `overflow: auto`. Rebuilt in headless Chromium: snapshot 134px tall, scrollHeight 136; with classic scrollbars a 15px scrollbar appears and the image narrows to 223px, which would also fail the new `> 0.9 × card width` check. Fix: `overflow: hidden` on the preview inside snapshots, and subtract the borders. **Fixed.**
2. **Low-medium: the image E2E check is weak.** Under `object-fit: contain` the `<img>` box is always 100% wide. Suggested: image bottom inside the card, image height over ~0.6 of the card, and no overflow on the preview. **Fixed:** all four are checked in one script.
3. **Low: size checks ran before the refit** and measured each rectangle in a separate call. **Fixed:** both checks run after the refit wait, each in one script.
4. **Low: connectors draw over steps,** not only over halos, because cards, nodes and connectors share one stacking context. Cosmetic. **Not changed.**
5. **Nit: halo hard-coded `$white`.** **Fixed:** `var(--background-color)`.
6. **Nit: card headers wrap long labels; the grown step's label truncates.** **Not changed.**
7. Nits on stage 3's comments and test helper names. **Fixed** on stage 3.

Checked and found fine: the rebase kept every stage 2 rule (moved into `InvocationOutputSnapshot.vue`); container query units resolve against the snapshot, and GTable's inline-size container isn't an ancestor of images; the compact rules beat GTable's scoped styles by specificity ((0,4,2) against (0,3,2)); the halo can't cover neighbouring steps given the 20px gap, and `overflow: hidden` doesn't clip a card's own box-shadow; edges (z-index 80) still pass under cards; `_rows_shown == 5` discriminates (1 row showed before).

</details>
