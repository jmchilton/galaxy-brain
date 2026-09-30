# PR 23577 — Add TensorBoard interactive tool

Reviewed: 2026-09-22  
Head: `bff6c749a5fcd30ccc466dc270c893bb34a3d5ec`  
Base: `release_26.1` at `92b30a63f8c1f42506a9509d161c3bcf59a95f66`  
Verdict: changes requested; collection staging can still assign the same directory to distinct elements, preventing TensorBoard from launching.

## Summary and effective scope

The TensorBoard-specific change is compact: it adds `tools/interactive/interactivetool_tensorboard.xml` and its icon. The tool accepts either one `tfevents` dataset or a flat list collection, stages each collection element as a separate run, and serves TensorBoard through the normal domain-based interactive-tool proxy.

The five-file GitHub diff is misleading because this branch merged the datatype work from #23553, creating two merge bases. Those inherited files are:

- `lib/galaxy/config/sample/datatypes_conf.xml.sample`
- `lib/galaxy/datatypes/binary.py`
- `lib/galaxy/datatypes/test/tensorboard.tfevents`

That exact datatype work subsequently landed separately in `release_26.1` through #23572 (`efe2bc7b728`). The shared datatype commit `a8bb5da9b84` is now a merge base of both sides, so it is not part of the effective change that this PR would add to the current release branch. I sanity-checked it in the combined checkout, but the substantive review target is the XML and icon. This also means the branch should not be judged as introducing a second datatype implementation; Git's merge will reconcile the already-shared commits.

## Findings

### 1. Blocking — collision fallback can itself collide and abort collection startup

File: `tools/interactive/interactivetool_tensorboard.xml:23-34`

The sanitizer correctly prevents path traversal, and the set catches the first sanitized-name collision. However, the fallback appends the collection index only once and does not check the resulting name again:

```python
if run_name in used_run_names:
    run_name = "%s_%d" % (run_name, i)
used_run_names.add(run_name)
```

Distinct, valid Galaxy element identifiers can therefore still map to one directory. For example, `x`, `x_2`, and `x?` become `x`, `x_2`, and `x_2`: `x?` first sanitizes to `x`, then its index-based fallback produces the already-used `x_2`. The second `ln -s` targets an existing `events.out.tfevents.galaxy`; because the commands are joined with `&&`, the job exits before TensorBoard starts.

Please make allocation guaranteed unique, for example by prefixing every sanitized name with the element index or by looping until a candidate is absent from `used_run_names`. This nontrivial collection branch has no automated coverage, and a focused command-rendering/helper test should include sanitizer collisions and collisions with generated fallback names such as the sequence above.

Suggested review comment:

> The one-shot collision suffix is not guaranteed unique. A collection with distinct identifiers `x`, `x_2`, and `x?` stages them as `x`, `x_2`, and `x_2`: the sanitized `x?` collides with `x`, then appending its index produces the already-used `x_2`. The second `ln -s` fails and TensorBoard never starts. Could we make run-name allocation unconditionally unique (for example, prefix each name with the element index, or loop until unused) and add a regression test for this sequence?

## Validation

- Confirmed the requested head exactly matches `bff6c749a5fcd30ccc466dc270c893bb34a3d5ec`; the worktree remained clean and the PR branch was not modified.
- `xmllint --schema lib/galaxy/tool_util/xsd/galaxy.xsd tools/interactive/interactivetool_tensorboard.xml`: **valid**.
- Reproduced the allocation logic with the distinct identifiers `x`, `x_2`, and `x?`; the third candidate duplicates `x_2`.
- Verified `quay.io/galaxy/tensorboard:2.21.0` exists. Its OCI index currently exposes a Linux/amd64 image (`sha256:fe1fea63d0a2e84bab5e9145db2a94cda56ef2c9dbfa4204d956fb5acd58989e`) and its config exposes port 6006 with `tensorboard` on `PATH`.
- A local datatype doctest run could not start because this disposable worktree has no `.venv` and the system Python lacks `defusedxml`. The inherited datatype's doctest is nevertheless covered by the green Python unit CI, and that code already landed separately through #23572.

## CI assessment

The current PR CI is overwhelmingly green, including Main tool tests, Python lint, Python unit tests on 3.10 and 3.14, tool framework tests, package tests, startup tests, API/integration tests, and browser suites.

The sole reported failure is the converter suite's `CONVERTER_picard_interval_list_to_bed6` test. It is outside this PR's TensorBoard/tool and datatype files and is unrelated. The author's earlier note refers to prior `Bad file descriptor` and SQLite-lock flakes; those are also unrelated, but they are not the failure shown by the current final check.

CI does not exercise a successful interactive TensorBoard session or the collection filename-allocation edge case above. The PR description records manual single-file and ordinary-list testing only.

## Non-findings / notes

- Existing inline discussion asked that the container be moved into `quay.io/galaxy`; the author did so. No existing reviewer has raised the collection collision, so the proposed comment is not duplicative.
- The allowlist sanitizer and single-quoted generated run paths prevent collection identifiers from injecting shell syntax or traversing outside `logs/`.
- `requires_domain="True"`, binding to `0.0.0.0:6006`, and routing through Galaxy's interactive-tool proxy follow the established interactive-tool pattern.
- Single-dataset staging is straightforward, and the `tfevents` input constraints match the datatype already present on `release_26.1`.
- I did not treat the image's amd64-only application manifest as a PR-specific blocker; much of the existing interactive-tool image ecosystem has the same deployment constraint.
