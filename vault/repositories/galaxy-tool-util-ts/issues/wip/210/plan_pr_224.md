# Plan: fold our #210 branches into PR #224

[#224](https://github.com/jmchilton/galaxy-tool-util-ts/pull/224) (draft, "Check workflow test datatypes and collection shapes") comes from a first-time contributor and covers the same ground as [`issue_210_test_kind_checks`](../../../branches/active/issue_210_test_kind_checks/index.md). It has one commit, `e82bc455`, on `origin/main` `68451c8e`, from the fork branch `denzasikora-lab:fix/validate-workflow-test-metadata`. **"Allow edits by maintainers" is off**, so we can't push to the branch directly. The plan is to open a PR into their branch, so the work lands under their PR and they keep the credit.

Written 2026-11-10.

## Decisions (John, 2026-11-11)

- Everything goes into one PR into their branch, the datatypes snapshot included. Nothing goes to `main` ahead of #224, so step 1 below is dropped and the snapshot commits are picked onto their head.
- Bring the whole set from step 2, the English rewrite of their Russian comments included.
- Severity defaults weren't revisited; the step-2 work uses the ones listed under "Decisions for John".

## Progress (2026-11-11)

Steps 0, 2 and 3 are done: [`pr_224_kind_checks`](../../../branches/active/pr_224_kind_checks/index.md) `eb283dd8`, with [verification](../../../branches/active/pr_224_kind_checks/verification.md). Step 2 went to ten commits, ~1,000 changed lines outside the generated snapshot (tests are most of it), against the 600–800 estimated. Step 4 is drafted and waits for John.

## Same design, different details

Both branches make the same five checks and even use the same diagnostic keywords: `workflow_input_kind`, `workflow_input_collection_type`, `workflow_input_format`, `workflow_output_kind` and `workflow_output_collection_type`. Both resolve output shapes through the connection graph from the local tool cache, and both use `CollectionTypeDescription` and `DatatypesMapperModel` from `workflow-graph`.

| | #224 | ours |
|---|---|---|
| Datatype hierarchy | Optional `--datatypes <file>`; without it, no filetype check | Committed usegalaxy.org snapshot (Phase A branch), always on |
| Input filetype mismatch | Error | Warning |
| `class: Collection` on a data input | Error (`workflow_input_kind`) | Warning (`workflow_input_collection_map_over`): Galaxy maps the workflow over it |
| Collection that maps over a collection input (`list:paired` into `list`) | Error | Warning (map-over) |
| Output checks when a job maps over | Still run | Skipped, since resolved shapes assume the declared inputs |
| `element_tests` / `elements` without `class` | Treated as a dataset assertion | Treated as a collection assertion, as planemo does |
| Output shape resolution | Inline in a CLI module (`workflow-test-shape.ts`); dropped for every output when any connection is invalid | `resolveWorkflowOutputCollectionTypes` in `connection-validation`, using a graph `outputMap`, resolved per output |
| Input type aliases | Hard-coded `data`/`File`/`collection` | `DATA_INPUT_TYPES` / `COLLECTION_INPUT_TYPES`, derived from the schema |
| Report shape | Errors only | `severity` on diagnostics; `warnings[]` in `validate-tests` and `validate-tests-tree` reports |
| Output `ftype` (ask 3) | **Done** (`workflow_output_datatype`), from `ChangeDatatypeAction` or a fixed format in cached, macro-expanded XML | Deferred |
| Evidence | 3 IWC workflows, 28 hand-made cases | Galaxy `lib/galaxy_test/workflow` (53 pairs) and IWC (115 pairs, 612 outputs resolved): 0 new errors; egapx repro |

Our [verification](../../../branches/active/issue_210_test_kind_checks/verification.md) explains the warning choices. Our first cut was close to #224's design. It produced 9 false `workflow_input_kind` errors on Galaxy's own passing workflow tests (`class: Collection` bound to `data` inputs), and 24 false `workflow_output_kind` errors on IWC (`element_tests` without `class`). #224 should hit both of these.

### What #224 has that we should keep

- The output `ftype` check, which is the issue's third ask, together with its `ChangeDatatypeAction` and fixed-XML-format resolution. Galaxy's test runner checks `ftype` exactly, so making it an error fits our rule that errors are what Galaxy's runner fails on.
- Splitting comma-separated `format` strings (`"fasta,fastq"`). Our `asStringList` doesn't split them.
- Skipping `multiple` and array-typed inputs.
- Two `connection-validation` fixes with tests:
  - an explicit `collection_type: null` stays null instead of defaulting to `list`;
  - outputs of a subworkflow step that has no connections now resolve.
- `--datatypes`, kept as an override of the snapshot, for private Galaxy servers.

### What we bring

- Map-over handling: the warnings, and skipping output checks when job shapes diverge.
- The `severity` field and `warnings[]` in reports, plus a text-output line for each warning.
- The `element_tests`/`elements` collection form.
- Output resolution moved into `connection-validation` and resolved per output. The resolver would be extended to return each output's format along with its collection type, so #224's `outputFormat` moves there too.
- The committed snapshot as the default mapper, with `producesAcceptableDatatype` (the predicate the editor uses) and a message for unknown datatypes.
- Schema-derived input type aliases, and shared `coerce.ts` helpers.
- Tests: `cross-check-kinds.test.ts`, the `mapped_subworkflow_outputs` fixture, `validate-tests-tree` tests, and docs (`docs/packages/cli.md`, `docs/skills/gxwf-cli/SKILL.md`).
- Two Russian code comments rewritten in English. The repository's comments are in English.

## Steps

0. **Measure #224 first.** Run the same corpus sweeps (`validate-tests-tree --auto-workflow --json`, `main` vs `e82bc455`) and the egapx repro. That turns "we think these are false positives" into counts we can put in front of the contributor. If the counts show #224 doesn't hit them, revise the rest of this plan.
1. ~~**Land the datatypes snapshot on its own.**~~ Dropped 2026-11-11: the snapshot commits go into the PR into their branch instead. [`issue_210_datatypes_snapshot`](../../../branches/active/issue_210_datatypes_snapshot/index.md) touches none of #224's files: it changes `workflow-graph`, `Makefile` and `scripts/`, and adds no behaviour. Open it as our own PR against `main` and merge it, then ask the contributor to rebase, or include the rebase in our PR into their branch. This keeps 5k lines of generated JSON out of their PR.
2. **Build `pr_224_kind_checks` from `e82bc455`.** Rewrite our work as deltas on their code rather than rebasing ours; the two branches conflict in every shared file. Use one commit per change, so each can be reviewed or dropped on its own:
   1. map-over warnings, the `severity` field and `warnings[]`, and skipping output checks when shapes diverge;
   2. the `element_tests`/`elements` collection form;
   3. output shape and format resolution moved into `connection-validation`, per output;
   4. the snapshot as the default mapper, with `--datatypes` as an override and filetype mismatches as warnings;
   5. type aliases, shared helpers and English comments;
   6. our tests, fixtures and docs, with the two changesets merged.

   Their tests stay, with expectations changed only where a case moves from an error to a warning. Rough size is 600–800 changed lines on top of theirs.
3. **Re-verify the combined head.** Re-run the corpus sweeps and egapx, and record the results the same way as `verification.md`.
4. **Deliver.** Open a PR from `jmchilton/galaxy-tool-util-ts:pr_224_kind_checks` into `denzasikora-lab/galaxy-tool-util-ts:fix/validate-workflow-test-metadata`. Draft a comment for #224 explaining why each change was made, with the step-0 numbers and an agent marker. Show the comment to John before posting it.
5. **Retire our branch.** Move `issue_210_test_kind_checks` to `branches_reference`, or abandon it, once their PR carries the work. #210's record then tracks #224.

## Decisions for John

1. Should the snapshot be a separate PR on `main` first (recommended), or go into #224?
2. Should we deliver through a PR into their fork branch (recommended; their commits and authorship stay intact), or ask them to enable maintainer edits so we push to their branch directly?
3. Should we bring the whole set from step 2, or only the correctness changes (2.1–2.4) and leave the rest as review comments for the contributor?
4. Severity defaults, carried over from our polish and now including their check:
   - input filetype: warning;
   - map-over: warning;
   - output `collection_type`: error, though planemo ignores it;
   - output `ftype`: error.

`issue_212_udt_expression_paths` doesn't overlap #224 and isn't affected.
