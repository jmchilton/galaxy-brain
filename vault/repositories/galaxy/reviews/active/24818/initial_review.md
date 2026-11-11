# Initial review: galaxyproject/galaxy#24818

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `efa3e7bbdaf10581dc1ffb037ec762d879dd8869`
- Diff: `git diff origin/dev...HEAD` (7 commits, 19 files, +521/-4)

## Summary

The PR adds an opt-in `secondary_files: true` on YAML `data` / `data_collection`
inputs. When set, each dataset the job receives gets a CWL-style
`secondaryFiles` list built from its index metadata files (`bam_index`,
`bam_csi_index`, `cram_index`, `bcf_index`, `tabix_index`). Each datatype declares
`secondary_file_suffixes`, and `Bam` reads the index's magic bytes to recognize a
CSI that `set_meta` stored in `bam_index`. The metadata path goes through
`compute_environment.input_metadata_rewrite`, so Pulsar stages it. Both the
runtimeify path (tool requests) and the legacy `to_cwl` path (`/api/tools`) are
covered.

The design is sound. The datatype-level `secondary_file_suffixes` map plus the
`secondary_file_suffix()` hook is a small abstraction other code can reuse,
rather than a special case in the evaluator. It reuses the existing Pulsar
metadata-rewrite path that XML tools already depend on for
`$input.metadata.bam_index`. Test coverage is good: API tests compare real index
bytes over both submission paths, plus multiple, collection and map-over; unit
tests cover the CSI-in-`bam_index` and dedup cases, which would be hard to set
up through the API; an embedded-Pulsar integration test covers staging. I found
no blockers. The findings below are about the contract at its edges and the
docs.

## Findings

### P2 1 — Opt-in is decided per dataset, not per input, contradicting the documented contract

`UserToolEvaluator._datasets_with_secondary_files` collects a *set of datasets*
from inputs that set `secondary_files`. `setup_for_runtimeify.adapt_dataset` and
`to_cwl` then attach `secondaryFiles` to any input whose dataset is in that set.
So if the same HDA is passed to two inputs, one with `secondary_files: true` and
one without, both get a populated `secondaryFiles`. The "converted" step widens
this further: any job input that is an implicit conversion of a selected dataset
is included, whatever parameter received it.

`authoringHelp.yml` states: "`secondaryFiles` is also empty for an input that
doesn't set the option." The `test_run_secondary_files_empty_unless_asked_for_and_indexed`
test passes only because it uses different datasets for `not_asked` and
`not_indexed`. The practical impact is small, since the extra list only adds an
index the job has already staged. Still, the documented behavior is not what the
code does, and how a tool behaves depends on what the user picked.

Fix: either key the decision on the parameter (the runtimeify callback already
receives per-parameter `extensions`, so it could receive the parameter's
`secondary_files` flag too; `to_cwl` walks by input name), or soften the doc
sentence to say the list may appear when the same dataset also feeds an input
that asked for it. Keying on the parameter is cleaner and makes the
implicit-conversion set unnecessary.

### P3 1 — `secondary_files: true` on an input that can never be indexed is accepted silently

Per the review focus on not keeping never-working input alive: an input such as
`{type: data, format: txt, secondary_files: true}` validates and always yields
`[]`. When an input declares formats and none of them (or their subclasses) has
`secondary_file_suffixes`, rejecting the tool at creation or lint time would
catch author mistakes early. Mixed lists like `[bam, sam]` stay valid, as the PR
description intends, and inputs without a declared format can't be checked.
This is optional; the runtime behavior is documented.

### P3 2 — Missing-index failure goes down the "unexpected exception" path

`secondary_files_json` raises `RequestParameterInvalidException`. In
`BaseJobRunner.prepare_job`, only `ParameterValueError`, `ExpressionTemplateError`
and `InsufficientPermissionsException` are treated as rejections
(`log.info` + `fail(..., exception=False)`). Everything else is
`log.exception("Failure preparing job")` with `exception=True`. A dataset whose
metadata failed is a user-data condition, not a server fault, so this logs a
server traceback for each affected job (and for each element when mapping over).
An HTTP request exception type is also an odd fit for code that runs in the job
handler. Consider raising `ParameterValueError` (it is already the
"job rejected while preparing" type and would add the parameter name to the
message), or a small dedicated exception that `prepare_job` handles the same way.

### P3 3 — PR description still uses the pre-rename key

The last commit (`efa3e7bbdaf`, "Name the runtime index list secondaryFiles, as
CWL does") renamed the runtime value. The PR description's example and prose
still say `$(inputs.bam.secondary_files[0].path)` / "lists its index under
`secondary_files`". The code, help and agent prompt use `secondaryFiles`. Anyone
copying the example from the PR or its squash message gets an expression that
evaluates to `undefined`. Update the description.

### P3 4 — `secondary_files_json` returns untyped dicts though a model exists

`SecondaryFileInternalJson` was added to `tool_util_models.parameters`, but
`secondary_files_json` returns `list[dict[str, Any]]`, so the shape is checked
only when `DataInternalJson` validates it on the runtimeify path and never on the
`to_cwl` path. Building `SecondaryFileInternalJson` instances and dumping
`by_alias` where `to_cwl` needs dicts would keep both paths on one checked shape.
This is optional.

## Notes (not findings)

- `Bam.secondary_file_suffix` opens the metadata file on the Galaxy host at job
  build time to read 4 bytes. That is cheap and correct, and the PR description
  explains why `set_meta` stays unchanged.
- `BaseDataToolParameter` now reads `secondary_files` for XML `<param>` too. It is
  inert there, because only `UserToolEvaluator` consults it.
- Deferred datasets return `[]` rather than raising. This matches their
  source-URI semantics and is documented in the docstring.
