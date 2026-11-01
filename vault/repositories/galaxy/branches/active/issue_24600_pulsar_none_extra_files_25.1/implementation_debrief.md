# Implementation debrief

**STATUS: READY.** Hardened twice: a first round, a re-scope, then a second round. The second scope evaluation recommends keeping the branch as implemented.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24600_pulsar_none_extra_files_25.1/differential-review/snapshots/20261101T151406Z-hardening-bf1ec9728a60.json
  hardening @ bf1ec9728a60 vs origin/release_25.1 (merge-base 32317280ecb5)
  since 20261101T145843Z-implementation-bf1ec9728a60:
    commits: 5 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   7 carried, 0 changed, 0 new, 0 dropped
```

## Final implementation (base `release_25.1`, head `bf1ec9728a6`)

1. `f728652f009` **Baseline tests.** Unit tests for `PulsarComputeEnvironment` extra-files rewrites. Commit 3 later trimmed them.
2. `bf8723a0b9d` **Fix.** When Pulsar returns no rewrite for the dataset path (`none`, a per-path `none`, or a `rewrite` that leaves the path unchanged), `input_extra_files_rewrite`/`output_extra_files_rewrite` return `dataset.extra_files_path` and record nothing to stage. Also adds the integration module `test_pulsar_embedded_none_local_metadata.py` and its job conf: `none` with `remote_metadata: false`, running `composite` and `composite_output_tests`.
3. `0f3ed112d3f` Annotates both hooks `-> str`.
4. `4d18da26fee` Test challenges: trims the unit tests to the two `rewrite`-action cases and replaces the `SimpleNamespace` fakes with dataclasses.
5. `bf1ec9728a6` **Re-scope.** Sample job conf docs. In the YAML sample, `#default_file_action: none` is commented out again, matching its "Uncomment ..." text and the XML sample. Both samples' per-path action lists are corrected. The `galaxy_infrastructure_url` typo is fixed.

## Key choices

- **Return the local path, not `None`.** This departs from the issue proposal. Every extra-files hook and caller on 25.1 expects a `str`. On merge-forward, dev's Directory (`tools/runtime.py`) and data-manager (`_bundle_path_rewrite`) callers then work unchanged. It also mirrors the primary-path fallback (`dataset.get_file_name()`). Codex suggested falling back to `local_path_config` instead; I refuted that ([codex round 1](earlier_drafts/1/codex_review.md)).
- **New integration module rather than extending `test_pulsar_embedded_none.py`.** That module's conf uses `remote_metadata: true`, and under `none` remote `set_meta` never runs, so composite outputs fail there for an unrelated reason. That bug and a `$__tool_directory__` staging gap under `none` are queued in `issues_incubator/incubating/pulsar_none_remote_metadata_unstaged/`.
- **Scope.** The sample conf fix was added on the first scope evaluation's recommendation. The original scope is kept as the alt `issue_24600_pulsar_none_extra_files_25.1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)). The second evaluation says keep as is.

## Validation

- Unit tests: 2/2 pass with the fix. Without it, the unchanged-`rewrite` test fails with the `TypeError`. `test_job_configuration.py` still passes.
- New integration module: 2/2 pass with the fix and 2/2 fail without it (verified in both rounds). The existing `test_pulsar_embedded_none.py` still passes.
- `make format` makes no changes; mypy is clean on the changed files.

## For polish / PR

- **Fold the test-challenge commit.** `4d18da26fee` should be folded into the baseline commit (fake changes, dropped transfer test) and the fix commit (dropped `none` unit test) before opening the PR. Otherwise the split-out baseline PR adds a test the fix deletes. I couldn't rewrite history because force pushes aren't permitted in this session.
- On merge-forward to dev, consider adding the issue's Directory reproduction (`dataset_path` test index 1) to the new module. Those callers only exist on dev.
- Known, untested quirk: with `none` and `outputs_to_working_directory: true`, the primary output path already ignores the local false path. Extra files now match that behavior.
- Hardening debriefs: [test challenges](test_challenges_debrief.md), [codex](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md), [scope](scope_evaluation.md), [normal review](subagents/normal_review.md), [re-scope review](subagents/rescope_review.md), [re-scope](implementation_rescope_debrief.md), round 1: [earlier_drafts/1/](earlier_drafts/1/).
