Fix 🎯 #24529 - API-key requests that need a dataset conversion (FASTA custom builds, `converted/{ext}`, feature search) 500 because they have no current history.

| Request (API key, no current history) | `release_26.0` | This PR |
|---|---|---|
| `PUT /api/users/{id}/custom_builds/{key}` from a FASTA dataset you own | 500 | 204, `len` conversion runs in the FASTA's history |
| same, FASTA in someone else's history | 500 | runs in your own history, or 400 if you have none and it isn't converted yet |
| `GET /api/datasets/{id}/converted/{ext}` needing a new conversion | 500 | 200 |
| same, while a dependency converter (e.g. bgzip before tabix) is still queued | 500 | 202, retry later |
| `GET /api/datasets/{id}/converted/{ext}` with the conversion already present, no history at all | 200 | 200 (id now encoded once) |
| feature search on a dataset that needs `fli` | 500 | 400 "not available" until `fli` finishes, then 200 |

***Only API-key callers (scripts, BioBlend, MCP agents) hit these 500s; browser sessions always have a current history.***

***`converted/{ext}` and feature search fail the same way as #24529's custom builds, so all three share one new helper; genomes, dbkeys and errored-dependency polling are left for dev.***

***New conversions go into a history the requester owns: the dataset's own history, else their current history, else their most recent one. Deleted and archived histories are skipped, and an admin's conversion never lands in another user's history.*** If no such history exists, the request gets a 400 instead of a 500.

<details><summary>Changes</summary>

- `HistoryManager.get_converted_dataset` (new, `managers/histories.py`): returns an existing conversion as is, and otherwise picks the target history as above before calling the model. Ownership compares `user_id`, so no admin bypass. Anonymous users only use their session's history.
- `api/users.py` (custom builds) and `services/datasets.py` (`converted/{ext}`, feature search) call it.
- `converted/{ext}` raises `AcceptedRetryLater` (202) when the model returns `None` for a pending dependency, as DRS in the same service already does. It also stops double-encoding ids: the serializer encoded them and the `AnyHDA` response model encoded them again.
- Backport of `a3cb32cd95d` from 🔀 #24229: dependency converters get the caller's `history` and `target_context`. Without the history half, the bgzip dependency of a tabix conversion has nowhere to run under an API key.
- A unit test pins the ownership rule for admins and anonymous users (red with `is_owner()`).
- Two leading refactor commits (populator helpers, the pass-through `HistoryManager` method) make no behavior change.

</details>

## Risks

Mostly a two-way door: it turns 500s into 200/202/400 and picks where new conversion datasets appear. The one visible choice is which of the user's histories receives them, and that also changes placement for some session requests.

<details><summary>Risk Details</summary>

- Conversions now appear in the user's most recent history when the dataset lives in a history they don't own and they have no current one. Previously the request failed.
- Session requests on a dataset in another history the user owns now put the conversion in that history instead of the current one. The custom builds UI only offers current-history FASTAs and the client doesn't call `converted/{ext}` or feature search, so this mostly affects visualizations such as Trackster searching a dataset from another history.
- `converted/{ext}` returns ids encoded once. A client that decoded twice to work around the bug would break. The double-encoded ids couldn't be used with any other endpoint, so this is unlikely.
- A dependency converter that keeps failing is re-queued by the model on every poll and keeps returning 202. That re-queue is pre-existing model behavior and differs on 26.2.
- Merge-forward to 26.2 conflicts with 🔀 #24229's `261d166f2ab`: there the tabix conversion queues behind bgzip and the first call returns 200. The backported unit test and the 202 test need adjusting or dropping on merge.

</details>

<details><summary>Risk Review Advice</summary>

Check the history-selection order and ownership test in `HistoryManager.get_converted_dataset`, especially the anonymous and admin cases. Also check that this is the right policy for a release branch rather than requiring an explicit `history_id`.

</details>

## Context

Backports part of 🔀 #24229. Alternative kept on 🌿[`issue_24529_custom_build_fasta_history_26.0_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24529_custom_build_fasta_history_26.0_alt_original_scope) - fixes FASTA custom builds only, with the history choice inline in `add_custom_builds`. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 6 items pass; failures become 400s or a 202 with <code>Retry-After</code> instead of 500s.</summary>

- [x] What does the user see when it fails? API callers get a 400 "A history is required to convert the dataset." (no usable history) instead of a 500, and `converted/{ext}` returns 202 "Conversion dependencies are pending." with `Retry-After` instead of a 500.
  <details>Unconvertible targets keep the existing 400 "Conversion from 'X' to 'Y' not possible". Browser sessions always have a current history, so the UI flow doesn't hit the new 400. No client code calls `converted/{ext}`, so the new 202 only affects API consumers. All three messages are asserted in the new API tests.</details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Most new coverage is API tests that assert behavior: which history gets the conversion outputs, status codes, and error messages (the feature search test now also pins the first call's 400 "not available" while fli is queued).
  <details>`test_history_for_conversion_requires_ownership` (3929a42f347) calls the private `_history_for_conversion` directly but asserts outcomes with real users/histories, no mocks: owner gets the dataset's history, an admin gets their own current history rather than user2's, anonymous gets only the session history or None. It is red against an `is_owner()` implementation, so it pins the admin rule rather than mirroring code. `test_dependency_conversion_receives_target_context` mocks `convert_dataset` and asserts kwargs passthrough by identity. That is close to the implementation, but it is a byte-identical backport of upstream `a3cb32cd95d`, and only it covers the `target_context` passthrough. Drop it on the 26.2 merge-forward.</details>
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. Every new API test fails on base with a 500 at its first status assertion; the `_history_for_conversion` unit test targets a helper added in `814c879279f`, so it can't precede the fix. The test-only helper refactor (`a5de02c79cf`) leads the branch as its own commit.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24529_custom_build_fasta_history_26.0/pr_checklist/). Run via Claude Opus 5.5 at high effort; re-checked after 3929a42f347 at medium effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: it fixes every no-history conversion failure reachable from the endpoints it touches.</summary>

- Expanded twice from the #24529-only fix: `converted/{ext}` (including the 202 for pending dependencies) and feature search share the same helper.
- Left out: stopping errored dependencies from re-queuing, which needs a model change that diverges from 26.2 and is better done on dev.
- Left out: genomes, dbkeys and the data-provider registry. They aren't API-key paths for this bug and need a policy decision on whose history to use.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24529_custom_build_fasta_history_26.0/scope_evaluation/).

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression; the history choice was rewritten as explicit steps.</summary>

- Acted on: the history-choice loop became explicit steps with one `usable()` predicate, and the converter check uses the existing `can_convert_to`.
- Not acted on: the pre-check that duplicates the model's conversion lookups is kept so existing conversions need no history; it's cheaper than a model-level change next to the backport.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24529_custom_build_fasta_history_26.0/thermo_nuclear_review/).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Every new test fails on <code>release_26.0</code> at its first status assertion (500); no changes were needed.</summary>

- The 202 test also fails with only the model half of the backport reverted, so it covers the dependency history passthrough.
- The backported unit test covers the `target_context` passthrough, which no API caller reaches. It is kept byte-identical to upstream.
- E2E was declined: browser sessions always have a current history.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24529_custom_build_fasta_history_26.0/test_challenges_debrief/).

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, fixed: the current-history fallback now requires the requester to own it.</summary>

An admin can set another user's history as current. Before the fix, a conversion of a dataset in that history skipped it as the dataset's history and then picked it again as the current history.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24529_custom_build_fasta_history_26.0/codex_review/).

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Two leading behavior-preserving commits: custom build populator helpers and a pass-through <code>HistoryManager.get_converted_dataset</code>.</summary>

Later fixes were folded into the fix commit; the 202 change is its own commit on top.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24529_custom_build_fasta_history_26.0/baseline_refactor/).

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details>

API tests in `test_datasets.py` (`converted/{ext}` in the dataset's history, without a history, archived/deleted fallbacks, pending dependency 202, feature search) and `test_users.py` (owned and unowned FASTA custom builds). Each fails with a 500 on `release_26.0`. `test_HistoryManager.py` covers the history choice for admins and anonymous users. The unit test in `test_actions.py` is the backport's own.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
