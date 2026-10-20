# Codex review

Codex (`codex exec -s read-only`, range `dbe4f2f7e41..13c7352f165`) found nothing, so I made no fixes and no commits. Codex's notes and my own read of the carry path did not turn up anything to act on.

## Not acted on

- None. Codex reported no findings.
- Codex did not run the new API tests (it said so in its coverage notes). The earlier re-scope run already covers them (see implementation_rescope_debrief.md).

## Verification

- Codex ran `test/unit/app/tools/test_data_parameters.py` and `test/unit/data/model/test_history_option_pagination.py`: 26 passed. I re-ran both in the worktree .venv and got 26 passed.
- Codex found no remaining Python callers of the removed `history_dataset_collections`, `active_visible_dataset_collections`, `match_collections` or `match_multirun_collections`.

<details>
<summary>Full Codex output</summary>

Brief: the backport of #23865 to release_26.1 plus follow-ups. Collection selects list only visible, non-deleted HDCAs from the current history. A hidden, deleted or other-history selection is carried as a `keep` entry and classified, so a map-over-only selection keeps `map_over_type`. Fixes #24219 and #22734.

Codex's closing note: "I haven't found a concrete regression in the changed paths. The carry code reuses the existing classifier, entry builder, and state-label helper. I also found no remaining Python callers of the removed methods."

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/managers/collections.py",
      "lib/galaxy/model/__init__.py",
      "lib/galaxy/model/dataset_collections/query.py",
      "lib/galaxy/tools/parameters/basic.py",
      "lib/galaxy/tools/parameters/dataset_matcher.py",
      "lib/galaxy/tools/parameters/pagination.py",
      "lib/galaxy/tools/parameters/meta.py",
      "lib/galaxy/tools/parameters/__init__.py",
      "lib/galaxy_test/api/test_jobs.py",
      "lib/galaxy_test/api/test_tools.py",
      "test/unit/app/tools/test_data_parameters.py",
      "test/unit/data/model/test_history_option_pagination.py",
      "test/functional/tools/collection_list_or_nested_list_input.xml",
      "client/src/components/Form/Elements/FormData/FormData.vue",
      "client/src/components/Form/Elements/FormData/variants.ts"
    ],
    "notes": "Reviewed the full diff and relevant surrounding paths. Focused parameter and model tests: 26 passed. Added API tests were reviewed but not executed."
  },
  "findings": []
}
```

</details>
