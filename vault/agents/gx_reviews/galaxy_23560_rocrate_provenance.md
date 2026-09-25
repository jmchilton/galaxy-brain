# PR #23560 — Initial RO-Crate/provenance review

PR: https://github.com/galaxyproject/galaxy/pull/23560

Reviewed head: `c5384b3eb3fcae051a9d273aaf7aa657d8028e0e` (base `dev`).

Initial verdict: useful direction, with one reproduced export regression to address before merging and a smaller integrity-labeling inconsistency. This is a draft review, not a request to finish every limitation already documented by the author.

## CI approval / first-time-contributor scan

Statically inspected all 13 changed files before executing Python or tests. No changed workflows or dependency manifests; no added subprocess/shell/eval/exec hooks, credential/environment reads, downloads, obfuscation, or exfiltration paths. New file IO reads exported primary/composite payloads for checksums and writes export-directory README/metadata files; the added tests use synthetic data, mocks, and temporary object stores/directories. Imports are normal Galaxy/rocrate modules, and test-local numpy imports. Upstream validator calls may resolve public RO-Crate contexts/profiles; that is an existing testing path, not a new contributor download hook.

The coordinator independently checks workflow events, permissions, checkout credentials, secrets, and runners. This code scan found no reason to withhold ordinary fork-PR CI approval for this exact head; it is not a guarantee of safety or an approval of future changed commits. No GitHub CI approval was performed by this agent. Focused unit execution started only after the coordinator cleared the workflow/static checks.

## 1. P1 — Ancestor jobs from another invocation can crash invocation export

Location: `lib/galaxy/model/store/ro_crate_utils.py:954`, in `_add_step_execution_provenance`; provenance discovery starts in `lib/galaxy/model/store/__init__.py:2667`.

The new discovery walks creating jobs of workflow inputs, so `included_jobs` intentionally contains more than the exported invocation's jobs. But execution linking treats a cached workflow-step definition as proof that the job's invocation is included:

```python
how_to_step = self.step_cache.get(workflow_step.id)
...
self.engine_actions[invocation_step.workflow_invocation_id].append_to("object", control_action)
```

Workflow-step IDs identify the workflow revision, not a particular run. If invocation B consumes an output from invocation A of the same workflow revision, the old job resolves to the same cached `HowToStep`, but A has no entry in `engine_actions`. The result is a `KeyError` and no completed export. The previous builder did not walk/link these contextual ancestor jobs in this way.

Reproduced with real model-store fixtures, not just a mock of the dictionary access: two invocation records use workflow revision 1; the second invocation's input and job-input association point to the first invocation's output. Exporting the second invocation produced:

```text
invocations 1 2 same workflow 1 1
REPRODUCED: invocation export KeyError KeyError(1)
included invocation ids [2]; included jobs [2, 1]
```

Minimal recommendation: before constructing a workflow `ControlAction`, require that the job's effective invocation has an entry in `engine_actions` (and use that entry). Keep the ancestor's standalone `CreateAction`/dataset lineage in the crate; simply don't pretend it was orchestrated by an exported invocation. Include two executions of the same workflow revision connected by data lineage in a regression test. There is no need to recursively export every ancestor invocation to fix this.

Kind comment seed:

> The separation between exported data and contextual provenance is really helpful. I found one edge case in that expanded context: exporting a run that consumes the output of a previous run of the same workflow revision currently raises `KeyError` in `_add_step_execution_provenance`. Both jobs resolve to the same workflow-step ID, but only the requested run has an `engine_actions` entry. Could we check that the job's invocation is present before adding its `ControlAction`, retaining older jobs as standalone provenance actions? A two-run, same-workflow fixture would exercise this without broadening export scope.

## 2. P2 — Recorded hashes are also emitted as unqualified checksums for metadata-only data

Location: `lib/galaxy/model/store/__init__.py:3228–3247`, `_dataset_ro_crate_properties`, and `_attach_dataset_checksum` at line 3266.

`_dataset_ro_crate_properties` initializes `_galaxy_sha256` from a valid database hash even when `source_path` is absent. Consequently, metadata-only datasets receive a checksum property named `SHA-256`, using the same representation as a newly calculated checksum of embedded bytes. `_attach_dataset_metadata` separately emits the appropriately qualified `Recorded source checksum (SHA-256; not verified against exported bytes)` property. The README/body deliberately distinguish those two concepts, but the graph supplies both for the same unverified record.

Reproduced an `include_files=False` dataset export with a database hash of 64 `f` characters. No payload was hashed; the graph nevertheless contained both labels for that value. The additional association entity repeats the qualified recorded hash, which is reasonable; the issue is the unqualified property on the metadata-only dataset.

Recommendation: populate `_galaxy_sha256` only when it was computed from the embedded source file. Keep database/source hashes exclusively in the already implemented recorded-checksum properties for metadata-only records. Add a metadata-only fixture asserting there is no unqualified `SHA-256` property while the qualified recorded hash remains. This is a small labeling fix, not a reason to prohibit useful historical hashes or reconstruct missing bytes.

## Design / coverage observations

- Existing model-store selection and rocrate-py are reused rather than replaced. Constants moved to a shared module remove the previous duplicate export filenames/version definition. The exact ID/version lookup plus explicit “not an execution-time snapshot” qualification is a good seam.
- Toolbox-less Celery uses the existing opt-in source-store initialization, rather than loading a full toolbox or evaluating dynamic tool options. Index fields have defaults, and the schema hash derives from the Pydantic model, so changed persisted schemas are invalidated. Repopulation is already documented by the author; it isn't a newly discovered blocker.
- Do not ask this draft to provide a public/anonymized export mode: it explicitly warns that payloads, workflow definitions, and Galaxy re-import attributes are unsanitized. Neither exact definition snapshots nor uniform full-tool/index port enrichment is promised.
- Checksums add complete reads of exported primary/composite bytes, not arbitrary network downloads. The semantic builder is large, but a broader refactor or checksum caching policy is not needed to resolve the two concrete findings above. If split later, a dedicated shared crate-metadata builder would be more reusable than more conditional branches in the generic model-store serializer.
- Added tests meaningfully check exact lookup, unavailable payloads, copy/history context, stable IDs, scientific fields, withholding boundaries, actions/connections, nested exports, and required-level upstream validation. They strengthen assertions rather than remove checks to hide failures. Existing helper assertions were corrected for execution timing/versions, and the previously xfailed collection case now runs. The missing resource-requirement round-trip and missing completed tool-workflow browser export are acknowledged in the description; they are reasonable follow-up coverage, not original review findings.

## Verification

- Worktree initially clean and verified at the reviewed head.
- `git diff --check`: clean.
- Focused unit selection: **51 passed** (`-k ro_crate`). That filter excludes the supporting index/Celery tests.
- Unfiltered run of all five touched unit-test files: **116 passed** (83 model-store, 5 Celery, 4 populator, 9 SQLite source-store, and 15 index-entry tests). This also checks the existing non-RO-Crate model-store import/export regressions; the two new reproducer scenarios are not in that suite.
- Two full synthetic model-store export reproductions above, run with disposable directories and existing read-only Python 3.13 unit dependencies. Initial scratch-fixture construction needed a distinct first user's email to avoid the intentional DB uniqueness constraint; this was corrected before the successful export reproductions.
- No server/browser/integration tests, private data, tool execution, source-code changes, remote pushes, or posted review comments.
- Scratch reproducer: `/tmp/galaxy-23560-review.uZ9pnF/reproduce.py`. Optional file-source loader warnings in that standalone process come from the borrowed environment's `pkg_resources` shim, not the PR. Focused pytest execution passes.
