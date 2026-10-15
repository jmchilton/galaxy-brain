# TypeScript alignment review — 2026-10-11

Reviewed gxformat2 [PR #219](https://github.com/galaxyproject/gxformat2/pull/219) at `773a20b975704689bd716a566cc8c6ed8017b2f7` against [galaxy-tool-util-ts main](https://github.com/jmchilton/galaxy-tool-util-ts/commit/eb7e4ea3a0e93048dae1c43a73eb47601575f233).

Verdict: the schema is aligned, but behavior and shared fixture coverage are not. Nine shared declarative cases fail after syncing PR-head fixtures and expectations. These are TypeScript catch-up work, distinct from the Python blockers in [review.md](review.md).

## What is aligned

- Draft schema YAML is byte-identical between the PR and TS vendored sources.
- TODO sentinel regex, four `_plan_*` fields, and draft class agree; sentinel drift check passes.
- Detection, validation, next-step, extraction, Mermaid, and Cytoscape implementations exist on TS main. [#100](https://github.com/jmchilton/galaxy-tool-util-ts/pull/100), [#105](https://github.com/jmchilton/galaxy-tool-util-ts/pull/105), [#146](https://github.com/jmchilton/galaxy-tool-util-ts/pull/146), [#156](https://github.com/jmchilton/galaxy-tool-util-ts/pull/156), and [#185](https://github.com/jmchilton/galaxy-tool-util-ts/pull/185) are merged.
- Cytoscape template, schema-rule catalog, and lint profile catalog match.

## Drift and reproduced failures

TS is missing 16 draft fixtures plus `synthetic-labeled-step-id-ref.gxwf.yml`. Seven expectation files differ: `cytoscape`, `detect_draft`, `extract_draft_subset`, `mermaid`, `next_draft_step`, `validate_draft`, and `validate_format2`. [TS #188](https://github.com/jmchilton/galaxy-tool-util-ts/pull/188) synchronized against gxformat2 main, where #219 is still absent.

| Category | Failing shared cases | Effect / location on reviewed TS main |
| --- | --- | --- |
| Unlabeled list step identities | `test_detect_draft_unlabeled_list_steps_index_paths`, `test_validate_draft_unlabeled_list_steps_resolve_by_index`, `test_draft_unlabeled_list_step_planned_node`, `test_draft_unlabeled_list_step_planned_class` | `iterateSteps` uses an empty-string fallback instead of index plus input count, merging anonymous identities and breaking numeric refs and planned overlays (`draft-checks.ts:259`). |
| List-form `in:` TODO handling | `test_next_draft_step_list_form_in_todo_is_work`, `test_validate_draft_list_form_in_malformed_todo` | Detection handles lists, but work items (`:892`) and malformed TODO validation (`:556`) inspect only dict inputs. Planning omits an unresolved input and validation accepts malformed sentinels. |
| Implicit subworkflow type | `test_validate_draft_implicit_subworkflow_allows_plan_fields` | `isToolStep` (`:616`) treats omitted types as tools instead of inferring subworkflows from `run:`, rejecting allowed planning metadata. |
| Slash-containing step labels | `test_extract_draft_slash_label_cascades` | `splitSourceRef` (`:316`) splits at the first slash instead of resolving known step labels; a consumer of removed `a/b` survives with a dangling `a/b/o` ref. |
| Deterministic extraction order | `test_extract_draft_mixed_case_codepoint_order` | `localeCompare` (`:1126`) disagrees with Python codepoint sorting for `Alpha` / `alpha`. |

## Verification

Isolated TS checkout `/private/tmp/gxformat2-219-ts`; PR-head Python checkout `/private/tmp/gxformat2-pr219-review`. Existing project checkouts and branches were left untouched.

```sh
pnpm install --offline --frozen-lockfile --ignore-scripts
GXFORMAT2_ROOT=/private/tmp/gxformat2-pr219-review make sync-workflow-fixtures sync-workflow-expectations
pnpm --filter @galaxy-tool-util/schema test
```

TypeScript typecheck passes. Full schema suite: **9 failed, 5081 passed, 5 expected failures, 79 skipped** (45 files, 44 passed). Every ordinary failure is a shared declarative case listed above. [Complete test output](typescript-parity.log). Sync checks pass after temporary synchronization; local-only TS fixture additions are allowed ([output](typescript-sync-after.log)). No implementation or assertion was changed.

The green TypeScript check on gxformat2 #219 runs that repository’s `./typescript` package. It does not run `galaxy-tool-util-ts` against these PR-head expectations, so it does not establish cross-repository parity.

Recommended next work: sync PR fixtures and expectations into TS and fix these behaviors; fix Python extraction preserving original IDs or remapping every source reference; rerun both suites and shared declarative cases before coordinated merge.
