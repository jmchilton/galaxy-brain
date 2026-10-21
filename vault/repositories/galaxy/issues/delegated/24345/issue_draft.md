# ColumnDataProvider median uses a float list index (numeric column stats always fail)

Source: found while preparing #24344 (comment_lines saved as string); see `repositories/galaxy/issues/delegated/24344/debrief.md`.

`lib/galaxy/visualization/data_providers/basic.py` `ColumnDataProvider.get_data` computes `middle_index = (count / 2) - 1`, a Python 2 leftover. In Python 3 it's a float, so `sorted_data[middle_index]` raises `TypeError` for any numeric column. Reached through `GET /api/datasets/{id}?data_type=raw_data&columns=[...]` on a plain tabular dataset (the default raw provider for `Tabular`, `registry.py`). Values that fail to cast are appended as `None`, so `sorted()` also fails, and `count` includes them, which skews `mean`. The odd-count index is also off by one (`count//2 - 1`). No API test covers a numeric column.
