Risks are low and this is a two-way door: the change is pattern prose, regenerated casts and one new verification workflow, all revertible, with one lasting effect to weigh: workflows built on the new "use built-in `pick_value`" advice need Galaxy 26.1 or later and can't be recalled by reverting the page.

<details><summary>Risk Details</summary>

- The built-in `pick_value` module first shipped in Galaxy 26.1 (earliest containing tag `v26.1.0`). "Mapped branches" recommends it for new work without stating that minimum, so a workflow written from the page won't run on an older server.
- The page now gives two signals. The intro, which this branch doesn't touch, says the shapes use the Tool Shed tool and that the built-in "will generally be preferred in the future"; the new section says to use the built-in now. `conditional-transform-or-pass-through` still says the corpus and that page use the Tool Shed tool. An agent could pick either spelling.
- The recipe for different collections rests on narrow evidence. The `Cannot match collection types` failure comes from one throwaway run of the built-in on arms of different lengths. The Tool Shed spelling, and arms of equal length with different identifiers, were not run, so the rule in the map-of-content page ("different collections filter and merge") is broader than what was tested.
- Filter-then-merge loses the exclusivity check that `the_only_non_null` and `pick_style: only` provide. If both booleans are true, it holds both arms' elements rather than failing, and a shared identifier resolves silently under `keep_first`. The committed test only turns one side on at a time.
- The new map-of-content sentence reaches eight casts through `galaxy-conditionals-patterns`, so a revert needs a recast, which is mechanical.
- CI hasn't run. `verification-workflows.yml` runs `planemo lint` on every workflow, and the debrief reports that command exiting 2 locally on both the new and the existing workflow. The first PR run settles whether that step behaves differently there.
- The two zero-count assertions depend on a workaround: `element_count: 0` is skipped upstream, so the test merges in `right_samples` and asserts 3. If Planemo fixes the skip, the test stays valid but the README note goes stale.

</details>

<details><summary>Risk Review Advice</summary>

The decision worth a human's attention is whether "built-in first" is the right default today, given that all 63 corpus steps use the Tool Shed tool. If it is, consider stating the Galaxy 26.1 minimum and reconciling the page's intro with the new section.

Also check that the different-collections rule is worded no more broadly than its evidence, and whether the recipe should warn that it doesn't detect two live arms. The new workflow itself needs little scrutiny beyond confirming that the first CI run passes.

</details>
