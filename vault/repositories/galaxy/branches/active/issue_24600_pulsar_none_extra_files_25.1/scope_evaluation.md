Run via Opus at low effort.

**Recommendation: keep as implemented.** The branch at `bf1ec9728a6` now covers every part of #24600 that exists on release_25.1. The extra-files hooks fall back to `dataset.extra_files_path`, which fixes both 25.1 callers (`wrappers.py` `extra_files_path`/`files_path`) and, once merged forward, dev's Directory and data-manager callers too, with no caller changes. The sample job conf drift from the issue's Proposed Approach is fixed in both the YAML and XML samples. So the PR can say "Fixes #24600". I checked the other `None`-returning hooks in `PulsarComputeEnvironment` (`input_metadata_rewrite`, `unstructured_path_rewrite`, the version path): they already handle `None`, so no sibling bug sits in the touched code. The remaining candidates are the incubating `none` + `remote_metadata: true` set_meta bug and the `$__tool_directory__` → unstaged `tool_files` bug. Both have a different root shape: Pulsar rewrites a job-directory path to its staging dir and then skips staging under `none`. That puts them in staging/queue_job code or in Pulsar, where they need a design call on whether the combination is supported. They stay in their own issue (`issues_incubator/incubating/pulsar_none_remote_metadata_unstaged/`). The issue's Directory reproduction (`dataset_path` index 1) belongs in the dev merge-forward, because those callers don't exist on 25.1. Nothing new turned up that would justify a second re-scope.

## Possible Decompositions

About 194 added lines on the branch. 8 are production code in `pulsar.py`; 16 are comment lines in the two sample confs; the rest are tests and a test job conf.

- **Option 1: a single PR.** All five commits against release_25.1. When cutting the PR, squash `4d18da26fee` into `f728652f009`/`bf8723a0b9d`, as `test_challenges_debrief.md` describes.
- **Option 2: baseline tests, then the fix.** (a) `f728652f009` with the trimmed fakes from `4d18da26fee` squashed in, which leaves the `rewrite`-action unit test. (b) The fix, the `-> str` annotations, the unchanged-`rewrite` unit test, the `none` + `remote_metadata: false` integration module and conf, and the sample conf commit `bf1ec9728a6`. (b) lands on (a).
- **Option 3: split out the docs.** Option 1 or 2 for the code, minus `bf1ec9728a6`, plus a docs-only PR for the sample job conf comments. The docs PR has no dependency on the code (`origin/dev` has the same lines), so it can land in either order and target release_25.1 or dev.

## Scopes considered

### 1. As implemented (recommended)

The code fix (the extra-files hooks return the local extra-files path when Pulsar doesn't rewrite), unit tests for the `rewrite` and unchanged-`rewrite` actions, a new `none` + `remote_metadata: false` integration module running `composite` and `composite_output_tests`, and the sample job conf comment fix (`#default_file_action: none` commented out again, the action list corrected in YAML and XML, the `galaxy_infrastructure_url` typo fixed).

| Pros | Cons |
| --- | --- |
| <ul><li>Covers the whole issue as it applies to 25.1, so the PR can close #24600.</li><li>Merges forward to dev's Directory/data-manager callers with no further changes.</li><li>8 production lines. Normal, re-scope, Codex and test-challenge reviews raised no blocking findings.</li><li>The docs commit is last and independent, so a reviewer can drop it cheaply.</li></ul> | <ul><li>The Directory reproduction from the issue isn't tested on 25.1, because the code path doesn't exist there.</li><li>`test_pulsar_embedded_none.py` (`remote_metadata: true`) still can't run metadata-checking tools. That is the incubating bug.</li></ul> |

### 2. Contract: drop the sample conf commit (= alt `_alt_original_scope`)

Go back to `4d18da26fee`, which has only the code fix and its tests.

| Pros | Cons |
| --- | --- |
| <ul><li>A pure bug-fix diff.</li></ul> | <ul><li>Undoes the first re-scope for no new reason.</li><li>Leaves the issue's Proposed Approach partly undone.</li><li>The sample keeps steering admins into `none` without any warning.</li></ul> |

### 3. Expand: fix `none` + `remote_metadata: true` (set_meta never runs)

Stage or rewrite the metadata directory regardless of the default action, or point the metadata command at Galaxy's local metadata dir. Then extend `test_pulsar_embedded_none.py` with `composite_output_tests`.

| Pros | Cons |
| --- | --- |
| <ul><li>Same configuration family and the same integration-test family.</li><li>It would make the existing #21566 module useful for tools that set metadata.</li></ul> | <ul><li>Different code: `queue_job`, `__build_metadata_configuration`, and Pulsar's `staging/up.py`.</li><li>Possibly a Pulsar-side change.</li><li>Open question whether the combination is supported at all.</li><li>Not checked on dev, where metadata handling was reworked.</li><li>Already queued as its own issue. The first evaluation rejected it, and nothing has changed since.</li></ul> |

### 4. Expand: `$__tool_directory__` under `none`

`PulsarComputeEnvironment.tool_directory()` returns Pulsar's `tool_files` staging dir unconditionally. Under `none`, the tool's required files are never copied there, so `markdown_report_extra_files` fails. The fix would return the local tool dir when the TOOL path action doesn't stage.

| Pros | Cons |
| --- | --- |
| <ul><li>It's in the class the branch touches.</li><li>It breaks real tools on the same shared-FS setup.</li></ul> | <ul><li>It isn't a `None`-handling bug. The remote tool dir is set from `queue_job` (`remote_tool_directory`) and must agree with what Pulsar stages and with the command line Pulsar builds.</li><li>A Galaxy-only fix needs the action mapper consulted for `path_type.TOOL`. That has the same root shape as scope 3 and needs the same "is `none` a supported staging mode for job-dir paths" decision.</li><li>It belongs in the queued follow-up issue.</li></ul> |

### 5. Expand: Directory reproduction test on 25.1

Add the issue's `dataset_path` index-1 test to a `none` module on release_25.1.

| Pros | Cons |
| --- | --- |
| <ul><li>Matches the issue's reproduction literally.</li></ul> | <ul><li>On 25.1 the Directory callers (`tools/runtime.py`) don't exist, so it wouldn't exercise the fix there.</li><li>The right place is the dev merge-forward.</li></ul> |

### 6. Proposal's caller-side `None` contract

The hooks return `None`, and `wrappers.py` and dev's `_bundle_path_rewrite` add fallbacks.

| Pros | Cons |
| --- | --- |
| <ul><li>Keeps "`None` means no rewrite" consistent with the primary hooks.</li></ul> | <ul><li>More files on a release branch.</li><li>Dev's `_bundle_path_rewrite` is typed `str` and would crash.</li><li>Every review rejected it.</li></ul> |

### 7. Handle `none` + `outputs_to_working_directory: true`

Honour the local false path for primary and extra-files outputs under `none`.

| Pros | Cons |
| --- | --- |
| <ul><li>Removes a quirk the normal review noted.</li></ul> | <ul><li>Pre-existing primary-path behaviour, and nobody has reported a problem.</li><li>Changes primary output routing on a release branch.</li><li>Extra files already match the primary path.</li><li>At most a sentence in the PR.</li></ul> |

<details><summary>Notes</summary>

- Sibling hooks checked on the branch (`lib/galaxy/jobs/runners/pulsar.py`). `input_metadata_rewrite` and `unstructured_path_rewrite` return `None` explicitly, and their callers handle that. The version path is guarded in `__init__`. `SharedComputeEnvironment`'s extra-files hooks always get a `str`. The only `dataset_path_to_extra_path` callers outside these hooks are in `set_metadata.py`, on local filenames. So there's no "related bug in touched code" left to fold in.
- Merge-forward to dev: add the Directory test (scope 5) and, optionally, `composite_output_tests` to a `none` module once the incubating issue is resolved.
- This is the second evaluation after a re-scope. It recommends no change, so there's no need to park.

</details>
