# PR #1783 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `431a1bf542a221ef58d5750d4802de3e97511d19`
- PR: [galaxyproject/planemo#1783](https://github.com/galaxyproject/planemo/pull/1783), "Add `--test_data_mirror` to fetch remote test data from hash-addressed mirrors" (mvdbeek)

## Verdict

Small, well-scoped, well-tested feature. No correctness bugs that block merge. The main concern is structural: the PR re-implements galaxy-tool-util's job traversal rules (which Files get hashes, records, composites, `location` vs `path`, name derivation) in planemo, when planemo already sits on the exact point where those rules have been applied: the fetch payload in `PlanemoStagingInterface._post`. Rewriting there would be smaller and couldn't drift from galaxy-tool-util. The 8 new tests pass locally (galaxy-tool-util 26.0.1).

## Findings

### P2 1: Rewrite the fetch payload in `PlanemoStagingInterface._post` instead of re-walking the job file

`HashMirrors.rewrite_job` / `_rewrite_item` / `_rewrite_file` (`planemo/galaxy/test_data_mirrors.py`) copy galaxy-tool-util's `galactic_job_json` traversal from `galaxy/tool_util/cwl/util.py`. Each rule is hand-copied with a comment ("same choice as galaxy-tool-util's staging", "the dataset name galaxy-tool-util would derive", "records and composite data are staged without their hashes"):

- `location` vs `path` choice (`value.get("location") or value.get("path")`);
- name defaulting (`properties.get("name") or _file_path_to_name(file_path)` in `staging.py`);
- records are uploaded through `upload_file(record_value["location"], None)` without hashes;
- composite Files send hashes on a `src: composite` element whose items carry no hashes.

There are already small divergences. `to_elements` recurses on `collection_type`, not on the element's `class`, so a nested collection element without `class: Collection` gets staged but not rewritten. A File with `galaxy_id` (staged as `src: hda`) still gets a HEAD request and a rewrite. If galaxy-tool-util changes any of these rules (for example, starting to send hashes for record Files), the two copies drift apart without any error.

`stage_in` also has to re-read the YAML and swap `job_path=` for `job=`/`job_dir=`, which repeats what `StagingInterface.stage()` already does with `job_path`.

planemo already overrides `_post` (`planemo/galaxy/activity.py:177`). Every upload that Galaxy will hash-check goes through it as a `tools/fetch` payload whose element has `src: "url"`, `url`, `hashes` and the final `name`, which galaxy-tool-util has already derived from the original URL. Rewriting `element["url"]` there, for elements with `src == "url"` and `hashes`:

- applies only to elements Galaxy will verify, by construction. Records (no hashes), composite (`src: composite`), `galaxy_id` (never posted), local paths (`src: files` or `file://`) and the legacy upload API (never calls `tools/fetch`) all drop out without special cases;
- removes the `use_fetch_api` guard, the YAML re-load, the `job`/`job_dir` swap and the name-derivation code;
- leaves `HashMirrors.mirror_url` (hash selection, digest validation, HEAD cache) as the reusable piece.

Suggested shape: pass the `HashMirrors` (or `None`) into `PlanemoStagingInterface.__init__`. In `_post`, when `api_path == "tools/fetch"`, walk `payload["targets"][*]["elements"]` and replace `url` with `mirror_url(element["hashes"])` when there is a hit. Most of the tests carry over. The `test_rewrite_job` cases turn into payload-level cases and stop depending on a copy of galaxy-tool-util's rules.

### P3 1: One transient HEAD failure turns the mirror off for the rest of the process

`_is_available` adds the mirror to `_unreachable` on any `requests.RequestException`, including a single read timeout (10s) or a connection reset. `hash_mirrors()` is an `lru_cache`d process-wide singleton, so in a long `planemo test` run over many workflows (the IWC CI case the PR is aimed at), one blip sends every remaining input back to Zenodo, which brings back the 429s the feature exists to avoid. The fallback is safe but quiet: one `info` line.

Options: only mark a mirror unreachable on `ConnectionError` (DNS failure, refused connection), not on `Timeout` or other errors, or after N consecutive failures; or mount a `requests.adapters.HTTPAdapter(max_retries=Retry(total=2, backoff_factor=...))` on the session. Optional.

### P3 2: Expected-output `location:` downloads (sibling path) still go to the origin

`planemo/test/_check_output.py::_get_location` downloads expected outputs given as `location:` URLs with a bare `requests.get(location, stream=True)` (no timeout). It is not routed through the mirror, even when the test declares hashes for the output. The PR lists this as a follow-up. It is worth tracking, because IWC workflow tests with remote expected outputs will still hit Zenodo and still fail on 429. Once the mirror is in place, `HashMirrors.mirror_url` can be reused there directly, and planemo could verify the hash itself because no Galaxy is involved. Optional for this PR.

### P3 3: Reuse galaxy-util's hash function names

`HASH_FUNCTIONS` keys repeat the Galaxy names as string literals. `galaxy.util.hash_util.HashFunctionNameEnum` (galaxy-util is already a planemo requirement, `>=26.0`) defines `MD5`, `SHA-1`, `SHA-256`, `SHA-512`. Keying the table on the enum ties planemo's list to Galaxy's and gives typing. Nit.

## Notes (not findings)

- Imports are all at module top (`yaml` in `activity.py`, `requests`/`re`/`functools` in the new module).
- Digest validation (`[0-9a-f]{len}` fullmatch after `.lower()`) correctly keeps arbitrary values out of the URL path. The trust argument holds: hashes go to Galaxy on the same fetch element, and Galaxy verifies them.
- `--test_data_mirror` with `multiple=True` and `use_env_var=True`: click splits a multiple-option env var on whitespace, so `PLANEMO_TEST_DATA_MIRROR="a b"` behaves as documented. An unset option yields `()`, which is falsy.
- The tests mock `PlanemoStagingInterface` for the `stage_in` wiring. Acceptable given the manual end-to-end run described in the PR. An automated Galaxy-backed test would need a local mirror server and doesn't seem worth asking for.
- Weak assertion: in `test_mirror_url_none_if_no_mirror_has_file`, the second assert (`SHA-3`) passes without making any request. Harmless.
