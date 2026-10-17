- `kind/bug`
- `area/UI-UX`
- `area/tool-framework`
- `area/dataset-collections`

The bot would add `area/UI-UX` (client/src) and `area/tool-framework` (`lib/galaxy/tools/parameters/pagination.py`), probably also `area/testing/api` and `area/testing`. Leave out the testing labels, since the tests back the fix and aren't the point. `area/dataset-collections` is added by hand because map-over options are the subject of the change. `area/workflows` doesn't fit: only the workflow run form's option merge changes, not workflow execution.
