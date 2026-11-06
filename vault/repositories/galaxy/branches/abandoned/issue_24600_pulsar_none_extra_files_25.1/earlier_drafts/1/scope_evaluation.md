Run via Opus at low effort.

# Scope evaluation: issue_24600_pulsar_none_extra_files_25.1

**Recommendation: expand modestly.** Keep the code fix as implemented, and add the `job_conf.sample.yml` comment fix to the branch. That fix is in the issue's own Proposed Approach and is a few comment lines in `secure_pulsar_rest_dest`: the stale "Uncomment the following statement" wording, the action list (drop `http`, add `transfer`, `rewrite`, `remote_transfer_tus`, `remote_object_store_copy`, `remote_rsync_transfer`, `remote_scp_transfer`), and the `galaxy_infrastructure_url1` typo. It costs nothing to review, and it covers the issue completely, so the PR can close #24600. Don't pull in the incubating `none` + `remote_metadata: true` set_meta bug or the `$__tool_directory__` → unstaged `tool_files` bug. Both have a different root cause (Pulsar rewrites job-directory paths to its staging dir and then skips staging under `none`), sit in different code (`queue_job` / metadata configuration / Pulsar client staging), and probably need a design decision or a Pulsar-side change. Keep them as their own issue. When merging forward to dev, add the proposal's Directory test (`dataset_path` index 1), because the Directory callers in `tools/runtime.py` exist only on dev.

## Possible Decompositions

The branch is about 184 added lines: 10 in `pulsar.py`, and the rest are tests and a test job conf.

- **Option 1: two PRs (baseline, then fix).** (a) `f728652f009` "Baseline tests", with the trimmed fakes and the transfer test removal from `4d18da26fee` squashed in. That leaves the rewrite-action unit test. (b) The fix, the `-> str` annotations, the unchanged-`rewrite` unit test, the new `none` + local-metadata integration module and conf, and the sample conf comments if added. (b) lands on (a).
- **Option 2: single PR.** Everything above in one PR against release_25.1. Squash `4d18da26fee` into the two earlier commits as `test_challenges_debrief.md` describes.
- **Option 3: split the docs out.** Options 1 or 2 for the code, plus a docs-only PR for the sample `job_conf` comments, against release_25.1 or dev. It can land in either order.

## Scopes considered

### 1. As implemented

When Pulsar returns no rewrite, the extra-files hooks fall back to `dataset.extra_files_path`. The branch also adds a unit test for the unchanged-`rewrite` case and a new `none` + `remote_metadata: false` integration module running `composite` and `composite_output_tests`.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes every 25.1 caller (`wrappers.py` `extra_files_path` / `files_path`).</li><li>After merge-forward it also covers dev's Directory and data-manager callers, with no caller changes.</li><li>Matches the primary-path fallback (`get_file_name()`).</li><li>Small and low risk. Both reviews agreed with the `str` contract.</li></ul> | <ul><li>Leaves out the part of the issue's Proposed Approach that fixes the sample conf, so the issue is only partly closed.</li><li>The Directory case from the issue reproduction isn't tested on 25.1, since the code path doesn't exist there.</li></ul> |

### 2. As implemented + sample job_conf comment fix (recommended)

Scope 1, plus fixing the drifted comments in `lib/galaxy/config/sample/job_conf.sample.yml` under `secure_pulsar_rest_dest`, and the nearby `galaxy_infrastructure_url1` typo.

| Pros | Cons |
| --- | --- |
| <ul><li>The issue explicitly proposes it.</li><li>Only comments change, so there's no behaviour risk.</li><li>Admins copying the sample no longer get `none` without being warned it assumes a shared filesystem.</li><li>Removes the nonexistent `http` action.</li></ul> | <ul><li>Docs change in a bug fix PR, which slightly widens the diff.</li><li>The action list must match the pinned Pulsar's action types. Check it against `action_mapper.py`.</li></ul> |

<details><summary>Detail</summary>

Whether to leave `default_file_action: none` uncommented in the sample, or comment it out to match the text, is a small judgement call. Commenting it out is safer for admins who copy the sample: `none` silently assumes a shared filesystem, and with `remote_metadata: true` it hits the incubating bug. Changing the comment to describe the line as it stands, without changing any value, is the least controversial option. Either works. Lean toward commenting the line out to match the text, since that matches the sample's original intent.
</details>

### 3. Also fix `none` + `remote_metadata: true` (set_meta never runs)

Make `none` work with remote metadata. Either stage or rewrite the metadata directory regardless of the default action, or point the metadata command at Galaxy's local metadata dir. Then switch or extend `test_pulsar_embedded_none.py` to run `composite_output_tests`.

| Pros | Cons |
| --- | --- |
| <ul><li>Same `none` setup and same integration-test family.</li><li>Without it, the existing #21566 `none` module still can't run tools that check metadata.</li><li>A config-time warning alone would be a cheap partial step.</li></ul> | <ul><li>Different root cause and different code (`queue_job`, `__build_metadata_configuration`, Pulsar client `staging/up.py`).</li><li>The fix may belong in Pulsar.</li><li>Open design question: is `remote_metadata: true` + `none` supported at all?</li><li>Not yet checked on dev or 26.x, where the metadata handling has been reworked.</li><li>Would turn a 10-line fix into a cross-repo design change.</li></ul> |

### 4. Also fix `$__tool_directory__` → unstaged `tool_files` under `none`

Under `none`, keep `tool_directory()` local (or always stage the tool's `required_files`), so tools that read files from their own directory work.

| Pros | Cons |
| --- | --- |
| <ul><li>Same configuration.</li><li>Affects real tools (`markdown_report_extra_files`) that use `$__tool_directory__`.</li></ul> | <ul><li>Unrelated to the extra-files hooks.</li><li>The remote tool dir comes from `remote_job_config` / `queue_job` and Pulsar's staging of `tool_directory_required_files`, not from `PulsarComputeEnvironment`'s dataset hooks.</li><li>Its root shape matches scope 3, so it should be fixed alongside scope 3, not here.</li></ul> |

### 5. Proposal's caller-side `None` design (contract alternative)

The hooks return `None`, and each caller falls back: `wrappers.py` gets an `or extra_files_path`, and on dev `_bundle_path_rewrite` returns `None`.

| Pros | Cons |
| --- | --- |
| <ul><li>Keeps the primary hooks' "`None` means no rewrite" convention.</li></ul> | <ul><li>More files on 25.1.</li><li>Every merged-forward caller on dev has to handle it, and `_bundle_path_rewrite` is typed `str` and would crash.</li><li>Both reviewers and the implementer rejected it. Not recommended.</li></ul> |

### 6. Also handle `none` + `outputs_to_working_directory: true`

Under `none`, honour the local compute environment's false path for primary and extra-files outputs.

| Pros | Cons |
| --- | --- |
| <ul><li>Removes a quirk the normal review flagged.</li></ul> | <ul><li>It's a pre-existing primary-path behaviour, and nobody has reported a failure from it.</li><li>The fix would change primary output routing in a release branch.</li><li>The branch already makes extra files consistent with the primary path.</li><li>Not recommended. At most, note it in the PR.</li></ul> |

### 7. Contract: fix only, no new integration module

Drop the `remote_metadata: false` integration module and rely on the unit tests.

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller diff, and one fewer Galaxy-instance test module in CI.</li></ul> | <ul><li>The integration test is the only end-to-end red/green, and test challenges dropped the `none` unit test in favour of it.</li><li>`remote_metadata: false` + `none` is the common shared-FS setup and had no coverage.</li><li>Not recommended.</li></ul> |

## Merge-forward note

On dev, `tools/runtime.py` calls the same hooks for Directory inputs and outputs, and so does the data-manager `_bundle_path_rewrite`. The `str` fallback covers them with no changes. When merging forward, add the Directory reproduction from the issue (`dataset_path` index 1, in a `none` module) so the dev-only callers get tested.
