Fix 🎯 #24550 - direct-download URLs from `aws_s3`, `generic_s3` and `cloud` stores live 24 h instead of the documented ~1 h.

A presigned URL is a bearer link: anyone holding it can fetch the object until it expires, and revoking dataset access in Galaxy doesn't revoke it. The sample config promises about an hour, but half the stores that support `enable_direct_download` sign for a day, and no store lets an admin choose.

| Store type | Lifetime on `release_26.2` | With this PR |
| --- | --- | --- |
| `boto3` | 1 h (hardcoded) | `direct_download_expires_in`, default 1 h |
| `azure_blob` | 1 h (hardcoded) | `direct_download_expires_in`, default 1 h |
| `aws_s3` / `generic_s3` | **24 h** (hardcoded) | `direct_download_expires_in`, default 1 h |
| `cloud` | **24 h** (hardcoded) | `direct_download_expires_in`, default 1 h |

***Behavior change: with direct download on, `aws_s3`, `generic_s3` and `cloud` URLs now expire after 1 h by default instead of 24 h. Admins who relied on the longer window can set `direct_download_expires_in: 86400` on that store.***

***Only stores with `enable_direct_download: true`, an opt-in setting new in 26.2, are affected; streamed downloads are unchanged. Targets 26.2 because direct download first shipped there (#22895) with this mismatch; the new key is optional and the API schema is unchanged.***

<details><summary>Implementation</summary>

- `ConcreteObjectStore` reads `direct_download_expires_in` (seconds, default 3600) beside `enable_direct_download`, rejects non-integer or ≤ 0 values at startup with an error naming the key, and includes it in `to_dict()`.
- XML configs parse both direct-download settings through one `parse_direct_download_config_from_config_xml` helper (s3, boto3, azure; cloud via s3's parser).
- Each backend's `_get_object_url` signs with `self.direct_download_expires_in` instead of a literal.
- `object_store_conf.sample.yml` documents the option and the revocation caveat.
- Not added to `ConcreteObjectStoreModel`, so no API schema change on a release branch.

</details>

## Risks

One small one-way door: a new per-store config key, `direct_download_expires_in`, and a shorter default lifetime for three store types.

<details><summary>Risk Details</summary>

- Deployments using direct download on `aws_s3`, `generic_s3` or `cloud` get 1 h URLs after upgrading; clients that hold a URL for hours before fetching will see provider expiry errors.
- The key name and its seconds unit become admin-facing config that later releases must keep.
- No upper bound is enforced; S3 SigV4 caps presigned URLs at 7 days and Galaxy doesn't check.

</details>

<details><summary>Risk Review Advice</summary>

Check that 1 h is an acceptable default for 26.2 deployments of `aws_s3`/`cloud` with direct download on - it matches what the sample config already told admins. Also check the key name fits alongside `enable_direct_download` and can sit under #24484's per-call `expires_in` when that merges forward (intended: per-call value wins, store value is the fallback).

</details>

## Context

Builds on 🔀 #22895, which first shipped direct downloads in 26.2. Related to 🔀 #24484 (on `dev`), which adds a per-call `expires_in`; once it merges forward, that value should take precedence with this per-store value as the fallback. Alternative kept on 🌿[issue_24550_direct_download_expires_in_26.2_alt_original_scope](https://github.com/jmchilton/galaxy/tree/issue_24550_direct_download_expires_in_26.2_alt_original_scope) - parses the two XML settings with separate classmethods at each store instead of one shared helper. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: issue's preferred fix (per-store setting) with one shared XML parse helper.</summary>

- Declined a 7-day cap: it's specific to S3 SigV4, wrong as a global ceiling.
- Minimal alternative (change two constants to 3600, no config) discards the issue's preferred fix.
- Other `_get_object_url` lifetimes (axel, irods, pithos, rucio, onedata) aren't client-facing direct downloads.
- Per-call override (#24484) and API-model exposure stay out of a release-branch PR.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24550_direct_download_expires_in_26.2/scope_evaluation/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Ship: follows the <code>enable_direct_download</code> pattern; no code changes made.</summary>

- Value owned by `ConcreteObjectStore`, validated once, round-tripped in `to_dict`, consumed by each backend's signer.
- Not acted on: inlining the now single-caller `parse_enable_direct_download_from_config_xml` (public classmethod; churn on a release branch), API model exposure (out of scope).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24550_direct_download_expires_in_26.2/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All 11 branch tests kept; the 8 new ones fail on the base at their assertions.</summary>

- Tests assert the lifetime each SDK signing call receives (boto3, boto, Azure SAS, cloudbridge), plus config parse and `to_dict`.
- Mocks only at the SDK boundary, matching existing direct-download tests.
- API/E2E not applicable: presigned URLs need real cloud credentials.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24550_direct_download_expires_in_26.2/test_challenges_debrief/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Reviewed the sample config, `objectstore/__init__.py`, `azure_blob.py`, `cloud.py`, `s3.py`, `s3_boto3.py` and `test_objectstore.py`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24550_direct_download_expires_in_26.2/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No refactoring of the base branch was performed.</summary>

Hoisting the XML helper or a lifetime constant ahead of the fix would be churn: base values differ by backend (1 h vs 24 h), so no behavior-preserving constant exists.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24550_direct_download_expires_in_26.2/baseline_refactor/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [John's Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All items pass.</summary>

- [x] What does the user see when it fails? Admins get a startup `ValueError` naming the key for non-integer or non-positive values; users following an expired URL get the provider's own expiry error.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert the lifetime each SDK signing call receives, plus `to_dict()` and rejection of `0` and `1h`, for default and configured values in XML and YAML.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The first commit pins the old lifetimes; the fix commit moves s3/cloud expectations to 3600.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24550_direct_download_expires_in_26.2/pr_checklist/). Run via Claude Opus 5.5 at medium effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
