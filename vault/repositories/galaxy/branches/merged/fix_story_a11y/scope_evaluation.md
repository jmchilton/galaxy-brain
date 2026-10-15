Retained the requested repairs across all audit component families on dev. No scope change recommended; visual baselines and migration infrastructure remain separate.

<details>
<summary>Independent review</summary>

# Scope evaluation

**Recommendation: retain the implemented scope of production accessibility repairs across all audited component families, on a separate dev-based branch.** The user explicitly requested batching the existing audit's issues for subagents; shared control repairs and dependent call-site fixes belong together. Keep the Storybook migration pipeline, screenshot baselines, broad component-library replacement and unrelated accessibility discoveries outside this branch.

## As implemented: all audit families, shared repairs first

Repair accessible names, associated labels, native interaction semantics, valid list/combobox ownership, contrast and target sizing in the production components identified by the 121 story exceptions. Validate against the prototype's story fixtures in a disposable strict harness, while retaining production unit checks and keyboard regression coverage where semantics change.

| Pros | Cons |
| --- | --- |
| • Fulfills the user's full batch request.<br>• Fixes repeated findings at shared component/dependency boundaries.<br>• Dev-based production changes can be reviewed independently of the test migration. | • Touches many component families.<br>• Strict axe checks cover rendered states rather than complete accessibility.<br>• Layout changes require visual inspection alongside test results. |

## Contracted: names and labels only

Limit the branch to label associations, progress-bar names, modal close names and tooltip naming. Defer the multiselect patch, native interaction restructuring, contrast and target-size repairs to subsequent branches.

| Pros | Cons |
| --- | --- |
| • Smaller individual review.<br>• Lower interaction and layout risk. | • Leaves most audited categories unresolved.<br>• Delays shared fixes needed by several batches.<br>• Does not match the explicit request to tackle all audit issues. |

## Split delivery: one independently reviewable branch per batch

Deliver the completed shared controls, collection interaction, and form/content repairs as separate dev-based branches with focused validation. This is a possible review/publication strategy after the consolidated implementation is verified, rather than a reason to stop ongoing repairs.

| Pros | Cons |
| --- | --- |
| • Smaller reviews and clearer ownership.<br>• Individual component fixes could land sooner. | • Shared tooltip/multiselect dependencies span batches.<br>• Repeated validation and cherry-pick coordination.<br>• Risks splitting a shared repair from its dependent call sites. |

## Expanded: repair every discovered accessibility issue

Add systematic keyboard and screen-reader testing for all Galaxy component states, including pre-existing focus restoration and external-label naming cases beyond the original exception inventory. These are useful follow-ups, but would turn a bounded audit repair into an ongoing accessibility program.

| Pros | Cons |
| --- | --- |
| • Finds issues axe cannot establish.<br>• Provides broader confidence for assistive-technology users. | • No bounded completion criterion from the current audit.<br>• Requires additional fixtures and human assistive-technology review.<br>• Would delay the requested concrete production repairs. |

## Expanded: migrate controls and establish visual baselines

Replace BootstrapVue/vue-multiselect controls wholesale, wire production Storybook accessibility CI and add screenshot capture/baseline acceptance. These are separate migration and testing projects; the previous pitch explicitly treats visual comparisons as a future option.

| Pros | Cons |
| --- | --- |
| • Could improve long-term UI consistency and regression coverage. | • Expands beyond fixing the known exceptions.<br>• Couples this branch to active migration lanes and baseline infrastructure.<br>• Requires different review, maintenance and potentially service decisions. |

The normal review's manual-pairing keyboard regression and duplicate FormSelectMany hover hints were necessary corrections within the implemented scope, and both are resolved. Removing the abandoned useMultiselect helper completes the shared-state simplification and is already done; none of these findings justify expanding the project.

</details>
