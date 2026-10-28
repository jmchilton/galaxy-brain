# Scope evaluation (second, post-rescope)

**Recommendation: expand (small).** In `DatasetsService._get_or_create_converted`, which the branch already touches, also handle the two remaining 500s on `GET /api/datasets/{id}/converted/{ext}`. First, the release_26.0 model returns `None` while a dependency conversion is pending: interval/BED→tabix waits on `bgzip`. That `None` reaches `serialize_to_view` and becomes a 500 for every client, not just API-key ones. Raise `AcceptedRetryLater` (202, which the same service already uses for DRS) instead. Second, an errored dependency raises a bare `ConverterDependencyException`. Map it to a 4xx `MessageException`. That is about 6 lines and one red→green API test. The first-call 202 should be deterministic without htslib, because `bgzip` is only queued, never run. Confirm when implementing. Without this, the commit that says it fixes the `converted/{ext}` 500 leaves it in place for any target with `depends_on`. The cherry-picked a3cb32cd95d then fixes nothing visible on this branch's endpoints: it only moves the API-key 500 from `assert history` to the `None` serialization. Everything else stays as implemented: keep the helper, the three routed callers, the backport and `encode_id=False`. Contract nothing. Per the workhorse process, a scope change on a second evaluation parks the branch as BLOCKED for John's decision rather than re-scoping again.

## Possible Decompositions

The branch adds 224 lines and removes 20 across 8 files. About 55 lines are non-test code. The rest is tests and populators. The commits already follow the seams. Bottom to top:

1. `a5de02c79cf` adds the custom build populator helpers. It is a test-only refactor.
2. `f7603faeb1f` adds a pass-through `HistoryManager.get_converted_dataset` and routes 3 callers through it. Behaviour is unchanged.
3. `897eabb92b3` is the a3cb32cd95d backport: the model dependency kwargs and the unit test.
4. `bb3f23dc1c9` adds `encode_id=False` to `converted_ext`. It has no tests of its own.
5. `0a6c27e2cae` is the fix for #24529: the history resolution plus all the new API tests.

| Option | PRs (landing order) | Notes |
|---|---|---|
| A. Single PR | 1–5 (+ expansion) | Matches how the branch is built and keeps the fix together. The PR body must call out the `converted/{ext}` fixes and the response id change |
| B. Split out the backport | (i) 3 alone, as "backport a3cb32cd95d to 26.0"; (ii) 1, 2, 4, 5 (+ expansion) | Lets a maintainer reject or approve the upstream backport on its own. Merge-forward conflict handling then sits in one small PR. Without (i), the history kwarg is lost in dependency recursion, so (ii)'s tabix path would 500 on `assert history` for API-key clients. Land (i) first or accept that |
| C. Refactor first | (i) 1+2 refactor-only; (ii) 3; (iii) 4; (iv) 5 (+ expansion) | Gives the smallest reviewable units. (iii) needs a test moved out of 5's `converted/{ext}` tests (the `id`/`history_id` assertions), or it lands untested. Four PRs is a lot for a release fix |
| D. Custom builds vs converted endpoint | (i) 1, 2 and the `users.py` part of 5, with test_users tests; (ii) 3, 4 and the `datasets.py` part of 5 (+ expansion), with test_datasets tests | Splits by user-facing endpoint. (i) closes #24529 on its own. (ii) is the "same bug, another endpoint" follow-on. It means splitting commit 5 by file, and the shared `_history_for_conversion` lands in (i) |

## Correction to the first evaluation

The first evaluation said the a3cb32cd95d backport was needed because "without it, `converted/tabix` still 500s on the `bgzip` dependency." That was only half right. On release_26.0 the model also *returns `None`* while any dependency is pending. Both the rescope debrief and the test challenges debrief confirm that the first `converted/tabix` call still 500s with the backport in place. The backport routes the `bgzip` job into the right history and context. The visible tabix fix still needs the `None` handling below. On 26.2, 261d166f2ab removed the `None` return.

## Scope: as implemented

`HistoryManager.get_converted_dataset` returns an existing conversion as-is. Otherwise it runs the conversion in the user's owned active history: the dataset's history, then the current one, then the most recent, or 400 if there is none. Custom builds, `converted/{ext}` and feature search use it. The branch also backports dependency kwarg passthrough and fixes double-encoded ids on `converted/{ext}`.

| Pros | Cons |
|---|---|
| Fixes #24529 and the same API-key 500 on `converted/{ext}` and `fli` search | `converted/{ext}` still 500s for any target with `depends_on`, for every client: first call or pending dependency (`None`), and errored dependency (`ConverterDependencyException`). The fix commit message claims the endpoint is fixed |
| Reusable helper; reviews (normal, rescope, thermo-nuclear, codex) came back clean | The backport is mostly dead weight for this PR's endpoints without `None` handling. Its only remaining effect is target_context for tool-run dependency conversions |
| History has already been rewritten into clean, reviewable commits | Merge-forward conflict in the model hunk (take 26.2) and a re-added unit test to drop |

## Scope: small expansion (recommended)

In `_get_or_create_converted`, raise `galaxy_exceptions.AcceptedRetryLater("Conversion dependencies are pending", ...)` when the result is `None`. Catch `model.ConverterDependencyException` and raise a 4xx `MessageException` with its message. Add an API test: `converted/tabix` on a BED dataset gets 202 on the first call (red: 500 on head).

| Pros | Cons |
|---|---|
| Closes the last 500s on the endpoint this branch already claims to fix, in a function it already edits. It is about 6 lines | Adds a scope change on the second eval, so the branch is BLOCKED for John's decision |
| Makes the a3cb32cd95d backport actually pay off: API-key `converted/tabix` goes 202, then 200, instead of 500 | 202 with an error body on a `-> AnyHDA` route is unusual. The DRS endpoint in the same service has the same shape, so there is precedent |
| Helps browser sessions too, since the `None` bug isn't API-key specific | On 26.2, 261d166f2ab means the model no longer returns `None`, so the 202 branch is dead there. The new test's 202 expectation must become 200 when merging forward. Note it for the merger |
| The first-call test should be deterministic, because `bgzip` is only queued, not run, so htslib isn't needed. The implementer should confirm that the red failure comes from the `None` path | The errored-dependency mapping is hard to test without a `bgzip` that is known to fail. It could ship untested, or with a model-level unit test |

<details><summary>Details</summary>

- Path on head: `get_converted_dataset(tabix)` runs the `bgzip` dependency, which returns a queued HDA, so `state != OK` and it returns `None`. `_get_or_create_converted` then calls `get_converted_files_by_type("tabix")`, which finds no association yet and returns `None`, and `serialize_to_view(None)` raises a 500. A second call while `bgzip` is still running takes the same path. Once `bgzip` is OK, tabix queues and the call returns 200.
- An errored `bgzip` raises `ConverterDependencyException(Exception)` at `model/__init__.py:5583`. The only place it is caught is the model's `convert_dataset` (trackster). Through `converted/{ext}` it is an uncaught 500. Suggested mapping: `RequestParameterInvalidException("Conversion not possible", ...)` to match the existing NoConverter branch, or `ToolInputsNotOKException`. Either is fine; this is John's choice.
- `HistoryManager.get_converted_dataset` doesn't need to change. Callers that tolerate `None` (`_search_features`'s `if converted_dataset`) are unaffected. Custom builds use fasta→len→linecount, which has no `depends_on`.

</details>

## Scope: backport 261d166f2ab (+ 4ad94757003) instead

Make 26.0 queue converters on pending dependencies, as 26.2 does, so the model never returns `None`.

| Pros | Cons |
|---|---|
| Removes `None` at the source, and fixes tool runs that hit pending dependencies | It doesn't apply cleanly to 26.0. On its own it causes the regression that 4ad94757003 fixes (conversions paused forever behind a failed dependency), so both must come |
| The model hunk would then match 26.2 byte for byte, with no merge-forward conflict | Changes converter semantics for every tool run on 26.0. Upstream (#24229) deliberately targeted 26.2. Not modest. Rejected |

## Scope: remaining `get_converted_dataset` callers (re-checked)

The first evaluation deferred these. Re-checked now that the helper exists:

| Site | Still deferred because |
|---|---|
| `visualization/genomes.py:321,322,400` (`/api/genomes/{id}`, API-key reachable) | Unresolved policy: the dbkey's FASTA may belong to another user, so it's unclear whose history should get the `twobit` job. `Genomes` has no `HistoryManager` |
| `visualization/data_providers/registry.py:114,115` (+ `get_converted_dataset_deps`, which drops `history`) | It would need `get_data_provider` to take a history, or a service-locator `app.history_manager` call, which the thermo-nuclear review steered away from. Trackster calls `converted_datasets_state` first, so the registry usually finds existing conversions |
| model `get_datasources` / `convert_dataset` (`?data_type=converted_datasets_state`, API-key reachable) | The cheapest of the group: add a `history=` kwarg to two model methods and have the service pass `_history_for_conversion(...)`, possibly `None`, which is regression-free because the model only uses it when converting. But it adds more model hunks next to the backport conflict, and the path is trackster-only, driven by browser sessions. A good follow-up, and the first one to pick up if John wants more |
| `managers/dbkeys.py:146` | `add_custom_builds` already creates the `len` conversion up front, so this is rarely reached |

| Pros (fix all) | Cons |
|---|---|
| Closes the whole bug class | Per-site signature threading plus a policy decision for genomes. Larger and riskier for 26.0. Mostly browser-session trackster paths |

## Scope: contract

Candidates were dropping the backport (897eabb92b3) or `encode_id=False` (bb3f23dc1c9).

| Pros | Cons |
|---|---|
| Dropping the backport removes the merge-forward conflict and the test to drop | Without it, API-key tabix 500s at `assert history` during the `bgzip` dependency, before `None` handling can help. It is also needed for the recommended expansion |
| Dropping `encode_id` makes the PR's public response change smaller | The ids are unusable today (48 hex chars), and no client calls this. Splitting it out loses the test's `id` assertions. Keep it |

Not recommended.

## Review items with scope impact

- **Codex's P2 race** (a conversion finishes between the pre-check and the model call): this is a correctness nit, not a scope question. Narrowed, and no change.
- **The `current_history` branch is untestable via the API**: accepted in test challenges. No scope impact.
- **Sibling #24313** (`custom_build_no_converter_400_26.0`) is a draft PR on the same `add_custom_builds` block. Whichever lands second rebases. The expansion only touches `services/datasets.py`, so it doesn't add to that overlap.
- **Merge-forward**: take 26.2's model hunk, drop the re-added `test_dependency_conversion_receives_target_context`, and, with the expansion, change the new tabix test's 202 to 200 on 26.2 (or drop the dead `None` branch there).
