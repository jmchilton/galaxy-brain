Driver follow-through: cleanup findings are fixed and folded into originators at final pushed tip `e1f3ed5dce2da8ccd93324fd6b536db3269a8810`. Combined 35 tests, full client typecheck, targeted source coverage and commit hooks pass. Conditional gates below are satisfied.

Recommendation: retain the four originating test rewrites and the small JobState deferred-request cleanup, with no expansion to production, shared helpers, or E2E screenshots. This fits the authorized readability batch and preserves the distinct behavior contracts of all four files.

Reviewed committed JobState, WorkflowStorageConfiguration, ToolsListCard and GToast changes from batch base `5838667ee6e1d2f89bf995f9eb6fab0ebabd5472`, including toast worker commit `7d585a3d7de1043139f02a298edcb6555e164748` and canonical four-originator tip `e3568ff7a29acd492abb95ceec7d2115dbda7250`. Root is folding unconditional deferred completion into JobState; final validation remains required before push. This report evaluates scope, separately from correctness reviews.

## As implemented: four test originators

Keep typed native component mounts, scenario naming, existing helper reuse, unconditional component/host/timer cleanup, and all preserved assertions. JobState's terminal states become separately named cases; GToast adds root-host restoration checks to the existing modal-host scenario. These changes make existing contracts easier to maintain without altering application behavior.

| Pros | Cons |
| --- | --- |
| Four independently reviewable originators; no production behavior change | Combined validation must cover shared toast singleton and plugin setup |
| Existing `withPlugins`, `deferred`, data factories and auto-unmount utilities suffice | Each file retains its own small domain-specific mounting helper |
| Scope closes observed teardown gaps, including assertion-failure paths | Does not audit every sibling with similar historic cleanup patterns |

## Contract to mounting syntax only

Limit changes to replacing adapter options/casts and defer scenario names, terminal-state parameterization, toast-host recovery checks and cleanup. This would reduce the diff but leave concrete readability and isolation gaps encountered in the selected files.

| Pros | Cons |
| --- | --- |
| Smaller mechanical patch | Leaves leaked modal-host registrations and whole-body deletion risk |
| Fewer added assertions | Loses clearer terminal-state failure attribution and stronger required-target checks |

## Expand to shared cleanup helpers or sibling audit

Audit GPopover/GTooltip body fixtures, ToolForm singleton cleanup, and other component mounting patterns, then introduce shared lifecycle helpers if actual common setup emerges. Current evidence shows different ownership needs: one attached ToolsListCard host, toast registration and timer state, and a JobState HTTP gate, so this is a separate follow-up rather than a needed batch dependency.

| Pros | Cons |
| --- | --- |
| Could address broader historic isolation patterns | No demonstrated common abstraction beyond existing utilities |
| May discover additional failure-path cleanup gaps | Expands ledger/supporting-file scope and review burden without serving the four current contracts |

## Expand to E2E and screenshots

Record screenshots or add browser scenarios for the rendered controls and popovers. The selected changes affect only tests and introduce no new or modified UI, styling, screenshot captures, or user-facing behavior; existing local cases observe precise prop/event/latency and singleton contracts more directly.

| Pros | Cons |
| --- | --- |
| Could document existing UI appearance | No visual change to validate and no new feature requiring E2E coverage |
| Real browser can complement focus integration later | Would broaden infrastructure and execution cost beyond the readability change |

Screenshots not relevant for this change. Read GX_PROCESS_SCREENSHOTS and the vault E2E writing guidance; reviewed the actual four-file diff rather than relying on a tests-only label. No production Vue component, CSS, browser test or screenshot fixture changes are present. No screenshot recording, screenshot artifact, or browser-test modification is warranted for this batch.
