# galaxy#23810 - [26.1] fix naming of deferred datasets

- Author: bgruening. Head `bgruening:deferred_naming` @ `74aecb7fed1`, base `release_26.1`.
- Fixes #20742 (deferred inputs show `Unnamed dataset` as name/`element_identifier` in tool commands).
- Worktree: `~/projects/worktrees/galaxy/pr/23810`.
- CI at review time: nearly all GH Actions pending; CircleCI `get_code_and_test` red (not inspected; looks infra, nothing in the diff touches client/CircleCI paths).

## Change

`lib/galaxy/model/deferred.py:239` - in `DatasetInstanceMaterializer.ensure_materialized`, the non-`in_place` branch
builds a fresh `HistoryDatasetAssociation(create_dataset=False, history=history)` then calls
`copy_from(replacement_dataset or dataset_instance, ...)`. `HistoryDatasetAssociation.copy_from`
(`lib/galaxy/model/__init__.py:6182`) intentionally doesn't copy `name` (it's used in job finishing where the output keeps
its own name), so the new HDA fell back to `name or "Unnamed dataset"` (`model/__init__.py:5456`). PR adds
`materialized_dataset_instance.name = dataset_instance.name` after `copy_from`.

Plus one assertion in `test/unit/data/test_dataset_materialization.py::test_deferred_hdas_basic_detached`.

## Layer / coverage

- Right layer. Changing `copy_from` to copy `name` would break job-output semantics (`tools/__init__.py:3532`,
  `model/__init__.py:1835`, `:7943`). Fixing in the materializer covers every non-in-place entry point:
  - tool evaluation (`tools/evaluation.py:322,339`, detached) - the path in #20742 (multi-data param ->
    `DatasetFilenameWrapper.element_identifier` falls back to `self.name`, `tools/wrappers.py:422-425`);
  - collection element materialization (`model/deferred.py:386`) - DCE identifier was already preserved, name now also right;
  - API `materialize` (`managers/hdas.py:197`, attached, not in_place) - new history item no longer "Unnamed dataset".
- `in_place=True` path untouched and already fine (same object).
- Replacement-dataset path: name is set after `copy_from(replacement_dataset)`, so the deferred HDA's name wins over the
  replacement's. Correct.
- Base: bug since 25.0; `release_26.1` fine, and the hunk is identical on `dev` so forward-merge is clean.

## Findings

1. **(Minor, test) Attached / API path has no assertion.** The one-line assertion is in the detached unit test only.
   The user-visible API case (`POST .../materialize`, new HDA at hid 2) is covered by
   `test/integration/test_materialize_dataset_instance_tasks.py::test_materialize_history_dataset`, which already fetches
   `new_hda_details` - adding `assert new_hda_details["name"] == deferred_hda["name"]` there is the cheapest
   end-to-end guard. Or at least mirror the unit assertion into `test_deferred_hdas_basic_attached`.
2. **(Follow-up, not blocking) Other identity fields still dropped on detached materialization.** `copy_from(...,
   include_tags=attached)` means tool-evaluation materialized inputs lose tags, so `$input.groups` /
   `get_datasets_for_group` (`tools/wrappers.py:391-395, 618`) see nothing for deferred inputs. `hid` is also unset.
   Same bug class as #20742 ("tool sees a different dataset than the history shows"). Not asked of this PR; worth an
   issue. If fixed later, a small "carry HDA identity (name, tags, hid?) onto materialized instance" step in the
   materializer is a better home than more one-off assignments.

## Tests

- Assertion is meaningful: fixture `deferred_hda_model_store_dict` names the HDA `"my cool name"`
  (`model/unittest_utils/store_fixtures.py:320`), so it isn't comparing two defaults.
- Red-to-green verified locally (main clone venv, `PYTHONPATH=lib`): with the `deferred.py` hunk reverted,
  `test_deferred_hdas_basic_detached` fails; with it, full `test_dataset_materialization.py` passes (24 passed).
- Commit history is honest red-to-green (`ab22d8efbb4 add failing tests` then fix). Nothing weakened.

## Verdict

Approve. Correct, minimal, right layer. Optional ask: one integration assertion on the API materialize path.

## Draft review (unposted)

> **Posted by Claude (AI assistant) on behalf of jmchilton.**
>
> Yes, it is that easy - `HistoryDatasetAssociation.copy_from` deliberately doesn't carry `name` (job-output
> semantics), so setting it in the materializer is the right layer, and it covers tool evaluation, collection
> elements, and the API `materialize` endpoint in one place. Name is assigned after `copy_from(replacement_dataset)`
> too, so the deferred HDA's name wins in the dedup case. Confirmed the new assertion fails without the fix.
>
> Optional: the API path (new history item used to show "Unnamed dataset") could get a one-liner in
> `test/integration/test_materialize_dataset_instance_tasks.py::test_materialize_history_dataset`:
>
> ```python
> assert new_hda_details["name"] == deferred_hda["name"]
> ```
>
> Related, not for this PR: detached materialization also drops tags (`include_tags=attached`), so `$input.groups` /
> `get_datasets_for_group` are empty for deferred inputs. Probably worth a separate issue.
>
> Approving.
