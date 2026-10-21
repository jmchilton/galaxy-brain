# Tabular `raw_data` column requests fail on any numeric column (median uses a float list index)

Requesting a numeric column of a tabular dataset through `raw_data` fails with a `TypeError` every time.

`GET /api/datasets/{id}?data_type=raw_data&columns=[1]` on a plain `tabular` dataset is served by `ColumnDataProvider`, which computes min/max/mean/median for each numeric column. On current `dev` and `release_26.2`:

| Numeric column values | Result |
| --- | --- |
| `1`, `5` | ❌ `TypeError: list indices must be integers or slices, not float` |
| `1`, `5`, `9` | ❌ same |
| `7` | ❌ same |
| `1`, `NA` (typed `float`) | ❌ `TypeError: '<' not supported between instances of 'NoneType' and 'float'` |
| header row `val` (no `#`), then `1`, `5` | ❌ `TypeError: '<' not supported between instances of 'int' and 'NoneType'` |
| any `str` column | ✅ values returned |

<details><summary>Why</summary>

The median code in `ColumnDataProvider.get_data` (`lib/galaxy/visualization/data_providers/basic.py`) was written for Python 2:

```python
sorted_data = sorted(response["data"][index])
middle_index = (count / 2) - 1
if count % 2 == 0:
    meta["median"] = (sorted_data[middle_index] + sorted_data[(middle_index + 1)]) / 2.0
else:
    meta["median"] = sorted_data[middle_index]
```

- `count / 2` is a float in Python 3, so the index always fails.
- Values that can't be cast (`NA`, a header row not starting with `#`, a short row) are appended to the column as `None`, so `sorted()` fails before the index is reached.
- Changing to `//` alone isn't enough: for odd counts of 3 or more, `count // 2 - 1` picks the wrong element (the median of 1, 5, 9 would come out as 1).
- `count` includes the `None` rows but `sum` doesn't, so `mean` is understated whenever a value fails to cast.

`raw_data` on a `Tabular` dataset with no `provider` uses `ColumnDataProvider` (`lib/galaxy/visualization/data_providers/registry.py`). The existing API tests (`test_raw_data_tabular_*` in `lib/galaxy_test/api/test_datasets.py`) cover only the 400 error paths, never a numeric column.

</details>

<details><summary>Reproduction (no server; Galaxy venv on dev)</summary>

Calls the provider directly with metadata from `Tabular.set_meta`; not run through the API.

```python
import tempfile
from types import SimpleNamespace

from galaxy.datatypes.tabular import Tabular
from galaxy.visualization.data_providers.basic import ColumnDataProvider


def run(content):
    with tempfile.NamedTemporaryFile("w", suffix=".tsv", delete=False) as f:
        f.write(content)
    ds = SimpleNamespace(
        datatype=Tabular(),
        get_file_name=lambda: f.name,
        metadata=SimpleNamespace(),
        has_data=lambda: True,
        get_size=lambda: len(content),
    )
    Tabular().set_meta(ds)
    try:
        return ColumnDataProvider(ds).get_data(columns="[1]")["meta"][0]
    except TypeError as e:
        return f"TypeError: {e}"


print(run("x\t1\ny\t5\n"))  # TypeError: list indices must be integers or slices, not float
print(run("x\t1\ny\tNA\n"))  # TypeError: '<' not supported between instances of 'NoneType' and 'float'
print(run("name\tval\nx\t1\ny\t5\n"))  # TypeError: '<' not supported between instances of 'int' and 'NoneType'
```

</details>

## Context

Bug found while preparing 🎯 #24344, which hits the same provider through the `comment_lines` comparison a few lines earlier. The median code dates from 2012, when Galaxy ran on Python 2. No caller was found in the client, `galaxy-visualizations` or `galaxy-charts`; their column requests use `provider=dataset-column` instead.

## Proposed Approach

Compute `mean` and `median` over the non-`None` values only, using the standard library's `statistics.median` (Galaxy has no stats helper of its own). Add API tests that request a numeric column of a small tabular dataset.

<details><summary>Approach details</summary>

- `values = [v for v in response["data"][index] if v is not None]`; `mean = sum(values) / len(values)` and `median = statistics.median(values)` when `values` is non-empty. `statistics.median` handles odd and even counts. `min`/`max` already skip `None`.
- Leave `meta["count"]` as the number of rows read (including uncastable values), so the response shape doesn't change.
- Tests, red first, beside `test_raw_data_tabular_*`:
  - `1\t2\n3\t4\n5\t6\n` with `columns=[1]` returns 200, with `min=2`, `max=6`, `median=4`, `mean=4`;
  - `1\t2\n3\t4\n` returns `median=3` (average of the middle two);
  - `1\t2\n3\tNA\n5\t4\n` returns 200, with `median=3`, `mean=3`, `count=3`.

</details>

## Alternative Approaches

Replacing `/` with `//` is a one-character fix that stops the crash but returns wrong medians for odd counts and still crashes on mixed columns. Removing the default `raw_data` → `ColumnDataProvider` path is reasonable since no caller is known, but that's an API change rather than a bug fix. Correct stats plus tests are small and safe.

<details><summary>Alternatives In Detail</summary>

### Alternative: `count // 2`

<details><summary>Description</summary>

#### Details

Change `/` to `//` and leave the rest.

#### Why the proposed approach is preferred

It returns the wrong element for odd counts of 3 or more and still raises on any column with an uncastable value, including a header row.

</details>

### Alternative: Remove or deprecate the provider

<details><summary>Description</summary>

#### Details

Return a 400 for `raw_data` on tabular datasets without `provider`, pointing callers to `dataset-column`.

#### Why the proposed approach is preferred

It changes the public API, and external callers can't be ruled out. It can still be done later.

</details>

</details>
