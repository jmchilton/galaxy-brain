# Scope evaluation

**Recommendation: expand (modest).** Move the owned-history resolution in `add_custom_builds` into a reusable `HistoryManager` method that takes the user, the dataset and the current history. Route two more callers through it. `/api/datasets/{id}/converted/{ext}` (`DatasetsService._get_or_create_converted`) is a public endpoint documented to create the conversion, and it 500s for API-key clients the same way, by code inspection. `_search_features` (`fli`) has the same shape. Also pass `history=` through the dependency recursion in model `get_converted_dataset`, a backport of the `history` half of a3cb32cd95d, which is already on release_26.2 and dev. Without it, `converted/tabix` still 500s on the `bgzip` dependency. Leave dbkeys, genomes, the data-provider registry and the model `convert_dataset` path as follow-up, with the per-site reasons below. Nothing should be contracted.

The branch is about 39 non-generated lines, under the 100-line threshold, so there is no "Possible Decompositions" section.

## Reachability check (basis for expanding)

For FastAPI requests, `trans` is a `WorkRequestContext` (`lib/galaxy/work/context.py`). Its `get_history(create=...)` just returns the stored history. For key or bearer auth with no `galaxysession` cookie, that history is `None` (`api/__init__.py` `get_session` → `get_current_history_from_session`). `_get_or_create_converted` calls `original.get_converted_dataset(trans, target_ext)` with no `history=`. From there it runs `datatype.convert_dataset(history=None)` → tool action `_collect_inputs` → `get_default_history_by_trans(create=True)` → `None` → `assert history` (`tools/actions/__init__.py:483`). That is the same path the issue reproduces for custom builds, and the same 500. No test in `lib/galaxy_test` hits `converted/`, and the only client reference is `schema.ts`, which is why it went unnoticed. Unchanged on dev (`services/datasets.py:984`).

## Scope: as implemented

`add_custom_builds` uses the FASTA's history if the user owns it and it isn't deleted or archived. Otherwise it falls back to `trans.history`, then the user's most recent active history, and returns 400 if there is none. It passes that history to both `get_converted_dataset` calls. One API test.

| Pros | Cons |
|---|---|
| Fixes #24529 exactly; small, release-safe | The resolution logic is inline in a handler, and the next caller will copy it or forget it |
| Ownership guard avoids writing jobs into shared/published histories | `converted/{ext}` keeps the same 500 for API-key clients |
| Reuses `HistoryManager.most_recent` | The normal review deferred the helper as "follow-up, not release_26.0". The scope process lists that reason as overridden |

## Scope: modest expansion (recommended)

Add a `HistoryManager` method, for example `history_for_conversion(user, dataset, current_history)`: owned and active dataset history → current history → most recent active → `None`. Use it in `add_custom_builds`, `_get_or_create_converted` and `_search_features`, and raise 400 when it returns `None`. Pass `history=` (and `target_context=`, mirroring a3cb32cd95d) through the dependency loop in model `get_converted_dataset`. Add a red→green API test for `GET /api/datasets/{id}/converted/{ext}` that uses an API key.

| Pros | Cons |
|---|---|
| Builds the reusable piece and routes the issue's case through it, which Galaxy reviewers prefer | Grows the diff to roughly 80–120 lines across `histories.py`, `users.py`, `services/datasets.py` and `model/__init__.py` |
| Fixes a second user-visible 500 on a documented public endpoint, in the same layer, with `HistoryManager` one `depends()` away | The dependency-loop hunk will conflict on merge-forward into 26.2/dev: 261d166f2ab rewrote the loop and a3cb32cd95d already passes `history`. Resolve toward dev |
| Shrinks the `users.py` hunk, which reduces conflict with sibling `custom_build_no_converter_400_26.0` (#24313) | Changes placement for owned datasets in browser sessions on `converted/{ext}`: output goes to the dataset's history, not the current one. Outputs are hidden implicit conversions, so the impact is low |
| Without the dependency hunk, `converted/tabix` on interval data still 500s via `bgzip` | Needs one more API test |

<details><summary>Details</summary>

- Helper location: `HistoryManager` already owns `most_recent` (`managers/histories.py:275`). The same pattern is in `services/histories.py:368`. `DatasetsService` and `FastAPIUsers` both use DI, so adding a dependency is a one-liner. Don't use `is_owner` (admins pass) or `trans.get_history(most_recent=True)` (legacy only).
- The issue title and labels only cover custom builds. This expansion goes past them deliberately, under "outside the original issue": the same root cause in the same API family. The PR title and body should say it fixes the `converted/{ext}` 500 too.
- Dependency recursion: on release_26.0 the loop calls `self.get_converted_dataset(trans, dependency, use_cached_job=...)` and drops `history` and `target_context`. fasta→len→linecount has no `depends_on`, so #24529 itself doesn't need it. Anything with `depends_on` reached through the new `converted/{ext}` route does: the stock sample has interval→tabix with `depends_on="bgzip"`. Upstream fixed this in a3cb32cd95d (merged via #24229, `[26.2]`). It is not on 26.0 or 26.1. Option: backport only the kwarg change (about 3 lines), or document the dependency limitation and skip it. Backporting is recommended. Also consider `get_converted_dataset_deps` (line 5547), which drops `history` the same way. Its callers are registry and trackster paths, so it can stay with the follow-up group.
- `_search_features` is reached via `GET /api/datasets/{id}?data_type=features` (trackster). It is a single call, and once the helper exists the fix costs one line, so it is included for consistency.

</details>

## Scope: central fallback in model `get_converted_dataset` / tool action

When `history` is `None`, resolve the target history inside `DatasetInstance.get_converted_dataset`, or in the tool action's default-history logic. That fixes every caller at once.

| Pros | Cons |
|---|---|
| Covers dbkeys, genomes, registry and `convert_dataset` with no per-site work | Puts ownership and history policy in the model layer, which can't use `HistoryManager` cleanly |
| No future caller can forget | Changes where outputs land for every browser-session caller, which is risky on a release branch |
| | A tool-action fallback would also change tool-run semantics for API callers. Rejected for release_26.0 |

## Scope: also fix the remaining callers

Route every other `get_converted_dataset` caller that omits `history=` through the helper.

| Site | API-key reachable? | History-capable manager at hand? | Verdict |
|---|---|---|---|
| `managers/dbkeys.py:146` | Indirect: during tool param/job setup with custom-build hack flag | No (`GenomeBuilds` manager) | Follow-up. The `len` conversion is normally created up front by `add_custom_builds`, which now succeeds |
| `visualization/genomes.py:321,322,400` | Yes, via `/api/genomes/{id}`. The `twobit` conversion is not pre-created | No | Follow-up. It needs a policy decision: the dbkey owner may be another user, so whose history gets the job? |
| `visualization/data_providers/registry.py:114,115` | Yes, via `/api/datasets/{id}?data_type=data` (trackster) | No; would need a signature change on `get_data_provider` | Follow-up |
| model `convert_dataset:5787` / `get_data_sources` | Yes, via `?data_type=converted_datasets_state` | No (model layer) | Follow-up. It needs `history` threaded through model APIs |

| Pros | Cons |
|---|---|
| Closes the whole bug class | Each site needs its own signature threading or policy decision, a much larger and riskier release diff |
| | Mostly trackster/visualization paths driven by browser sessions, which already have a current history |

## Scope: contract

Nothing worth dropping. The ownership guard and the 400 for "no history" are small and both are needed. The API test is the red→green proof.

## Normal-review items with scope impact

- **Reusable `HistoryManager` helper**: included in the recommended expansion. Deferring it was the overridden "follow-up" reason.
- **Other callers omitting `history=`**: `converted/{ext}` and `_search_features` are in. The rest are follow-up, with the reasons in the table above.
- **Dependency recursion drops history**: in, as a backport of a3cb32cd95d's kwarg (already on 26.2/dev).
- **Admin acting for another user**: outputs go to the admin's own history, the same as before the fix. The build references the HDA by id, so it still resolves. No scope change.
- **Deleted `trans.history`**: browser sessions switch history when the current one is deleted. The helper could filter it out for free. Optional.
- **Sibling #24313 conflict**: both branches edit the same `add_custom_builds` block. Moving the resolution into a helper reduces the overlap. Whichever lands second rebases.
