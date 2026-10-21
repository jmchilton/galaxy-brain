# Edit Attributes saves "Number of comment lines" as a string instead of an int

Saving a dataset's **Edit Attributes** form turns its `comment_lines` metadata from an int into a string.

| How `comment_lines` was set | API `metadata_comment_lines` |
| --- | --- |
| Upload / auto-detect | `0` (int) ✅ |
| Edit Attributes > **Number of comment lines** = 3 > Save | `"3"` (string) ❌ |

Seen on `release_26.2` through the UI on a BED dataset, then read back with `GET /api/histories/{history_id}/contents/datasets/{id}`. The same code is on current `dev`. The only server-side code that compares the value as a number then fails. For a `tabular` dataset, `GET /api/datasets/{id}?data_type=raw_data&columns=[0]` goes to `ColumnDataProvider`, which compares `start_val < metadata.comment_lines`. A string there raises `TypeError: '<' not supported between instances of 'int' and 'str'`, and an int returns the column. BED, GFF and VCF use their own raw providers, so they avoid this path. The repro below calls the provider directly. It was not run through the API.

<details><summary>Why</summary>

`DatasetInterface.set_edit` (`lib/galaxy/webapps/galaxy/controllers/dataset.py`, `operation == "attributes"`) stores each editable element as `spec.unwrap(payload.get(name) or None)`. `comment_lines` is declared on `TabularData` (`lib/galaxy/datatypes/tabular.py`) without a `param`, so it gets the base `MetadataParameter`. That class's `marshal`/`unwrap` return the form value unchanged. The form sends a string, so a string is stored. Typed elements such as `ColumnParameter` convert their values to ints in `marshal`, and `comment_lines` has no such step.

Across the sample datatype registry, only two editable elements have a numeric default and no `param`: `comment_lines` on 123 datatypes (every `TabularData` subclass, BED included), and `columns` on four R datatypes (`affybatch`, `eset`, `malist`, `rexpbase`).

</details>

<details><summary>Reproduction (no server; Galaxy venv on dev)</summary>

```python
import tempfile
from types import SimpleNamespace

from galaxy.datatypes.tabular import Tabular
from galaxy.visualization.data_providers.basic import ColumnDataProvider

spec = Tabular.metadata_spec["comment_lines"]
print(type(spec.param).__name__, repr(spec.unwrap("3")))  # MetadataParameter '3'

with tempfile.NamedTemporaryFile("w", suffix=".tsv", delete=False) as f:
    f.write("#a\n#b\n#c\nx\t1\ny\t5\n")
for comment_lines in (3, "3"):
    ds = SimpleNamespace(
        datatype=Tabular(),
        get_file_name=lambda: f.name,
        metadata=SimpleNamespace(comment_lines=comment_lines, columns=2, column_types=["str", "int"]),
    )
    try:
        print(repr(comment_lines), ColumnDataProvider(ds).get_data(columns="[0]")["data"])
    except TypeError as e:
        print(repr(comment_lines), "TypeError:", e)
# 3   [['x', 'y']]
# '3' TypeError: '<' not supported between instances of 'int' and 'str'
```

</details>

## Context

Bug found while writing a Playwright test, `test_history_dataset_auto_detect_metadata`, in the out-of-tree `galaxy_ui_driver` suite. The test has to assert `int(comment_lines) == 3` to get past it. Related to 🎯 #16303: its payloads show 23.1 began sending `"comment_lines": "0"` instead of `0`. The fix there, 🔀 #16304, addressed the single values wrapped in arrays, not this.

## Proposed Approach

Add a small `IntParameter(MetadataParameter)` in `lib/galaxy/model/metadata.py`. Its `marshal` returns `int(value)`, and `None` or `""` comes back as `None`. Declare `comment_lines` on `TabularData` with `param=IntParameter`.

<details><summary>Approach details</summary>

- `MetadataCollection.__setattr__` runs `unwrap` on every assignment, so the param covers datatype `set_meta` code as well as the form. `set_edit` unwraps once and `setattr` unwraps again, so `marshal` must be idempotent.
- `None` stays `None`. `Tabular.set_meta` stores `comment_lines = None` on purpose when it stops scanning a large file early, meaning the count is unknown. An empty form field already arrives as `None` (`payload.get(name) or None`). Mapping it to `no_value` (`0`) would change both meanings. `marshal` is a classmethod and can't see `spec.no_value` anyway.
- A non-numeric value should raise in `marshal`/`validate`, so the save fails rather than storing junk.
- Optionally use the same param for `columns` on the four R datatypes.
- Tests, red first:
  - unit (`test/unit/data/datatypes/`): `Tabular.metadata_spec["comment_lines"].unwrap("3") == 3`, `unwrap(3) == 3`, `unwrap(None) is None`;
  - API: save attributes with `comment_lines` through the edit path, then assert `metadata_comment_lines == 3` (an int) in the dataset details;
  - tighten `test_history_dataset_auto_detect_metadata` (`galaxy_ui_driver`) to `comment_lines == 3`.

</details>

## Alternative Approaches

Converting in `ColumnDataProvider` fixes the only server-side crash but leaves the API returning a string, while the client (e.g. `HistoryDatasetDisplay.vue`) types the field as a number. Converting every value in `set_edit` would need per-element type knowledge, and the metadata spec already holds that through `param`. A typed param fixes the stored value for every reader.

<details><summary>Alternatives In Detail</summary>

### Alternative: Convert in `ColumnDataProvider`

<details><summary>Description</summary>

#### Details

`int(self.original_dataset.metadata.comment_lines)` before the comparison.

#### Why the proposed approach is preferred

It hides the bad value in one reader. The API and any future reader still see `"3"` after an edit and `0` before one.

</details>

### Alternative: Convert in `set_edit`

<details><summary>Description</summary>

#### Details

Try `int()` on incoming values, or check `spec.default`'s type, in the controller loop.

#### Why the proposed approach is preferred

It guesses types from defaults in a controller. `MetadataParameter` subclasses are the existing place for "turn a form value into its stored form" (`ColumnParameter`, `SelectParameter`, `DBKeyParameter`).

</details>

</details>
