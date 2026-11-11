# Open PR and branch queue

Snapshot: 2026-11-07.

## Open galaxy-tool-util-ts PRs — ready from our side (`ready`)

- [`issue_202_fill_defaults`](active/issue_202_fill_defaults/index.md) — Optional `gxwf fill-defaults` preserves sparse-state validation and connections (#202). [#207](https://github.com/jmchilton/galaxy-tool-util-ts/pull/207).
- [`issue_288_draft_cycles`](active/issue_288_draft_cycles/index.md) — `validateDraft` rejects step dependency cycles, incl. self-loops (gxformat2#288 port). [#228](https://github.com/jmchilton/galaxy-tool-util-ts/pull/228).

## Open galaxy-tool-util-ts PRs — needs attention (`attention`)

None yet.

## Draft PRs — ready to undraft (`draft_ready`)

None yet.

## Draft PRs — waiting for CI (`ci_wait`)

- [`issue_225_frame_labels`](active/issue_225_frame_labels/index.md) — `gxwf lint`/`convert` reject unknown frame `contains_steps`/`contains_comments` labels; empty-frame warning (#225). Draft until John reviews. [#227](https://github.com/jmchilton/galaxy-tool-util-ts/pull/227).
- [`issue_216_concrete_errors`](active/issue_216_concrete_errors/index.md) — `draft-validate --concrete --json`: top-level `concrete_errors`, step `label` on results (#216). Draft until John reviews. [#226](https://github.com/jmchilton/galaxy-tool-util-ts/pull/226).

## Draft PRs — author work (`author_work`)

None yet.

## Branches — implemented (`branches_implemented`)

- [`pr_224_kind_checks`](active/pr_224_kind_checks/index.md) — #224 plus our #210 work: map-over warnings, datatypes snapshot, per-output resolution. PR targets #224's branch. [Open PR](https://github.com/denzasikora-lab/galaxy-tool-util-ts/compare/fix/validate-workflow-test-metadata...jmchilton:galaxy-tool-util-ts:pr_224_kind_checks).

## Branches — needs polish (`branches_need_polish`)

- [`issue_232_workflow_diff`](active/issue_232_workflow_diff/index.md) — `diffWorkflows` + `gxwf diff BEFORE AFTER`: structural Format2/draft diff (gxformat2#295 port, #232). [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_232_workflow_diff).

## Branches — ready for final review (`branches_ready_for_final_review`)

- [`issue_212_udt_expression_paths`](active/issue_212_udt_expression_paths/index.md) — UDT checks: `inputs.*` paths in templates and output labels vs Galaxy's job runtime model (#212). [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_212_udt_expression_paths).
- [`issue_210_datatypes_snapshot`](active/issue_210_datatypes_snapshot/index.md) — Committed usegalaxy.org datatypes snapshot + `snapshotDatatypesMapper()` in workflow-graph (#210). [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_210_datatypes_snapshot).
- [`issue_210_test_kind_checks`](active/issue_210_test_kind_checks/index.md) — validate-tests checks collection shape; datatype warnings (#210 asks 1+2). [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/issue_210_datatypes_snapshot...issue_210_test_kind_checks).

## Branches — need PR (`branches_need_pr`)

None yet.

## Branches — need decision (`branches_need_decision`)

None yet.

## Branches — reference (`branches_reference`)

None yet.
