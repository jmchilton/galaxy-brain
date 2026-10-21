# Edit Attributes saves numeric text metadata (comment_lines) as a string

Source: playwright FAQ hardening loop (`vault/projects/playwright/`, faq `dataset_tool_errors_metadata`),
on `release_26.2`. Found while writing `test_history_dataset_auto_detect_metadata` (`galaxy_ui_driver`).

## Problem

On a BED, Edit Attributes > Attributes > **Number of comment lines** = 3 > Save. The API then returns
`metadata_comment_lines: "3"` (string). Auto-detect (or upload) stores int `0`. Observed via
`get_history_dataset_details`.

Cause: `lib/galaxy/webapps/galaxy/controllers/dataset.py` (`operation == "attributes"`) does
`setattr(data.metadata, name, spec.unwrap(payload.get(name) or None))`. `comment_lines`
(`lib/galaxy/datatypes/tabular.py:98`) has no `param`, so it gets the base `MetadataParameter`, whose
`unwrap` keeps the form's string.

Consumer that breaks: `lib/galaxy/visualization/data_providers/basic.py:80-84` (`ColumnDataProvider`,
the `column_with_stats` provider, reachable via `/api/datasets/{id}?data_type=raw_data&provider=column_with_stats`)
does `start_val < self.original_dataset.metadata.comment_lines`, so int < str raises `TypeError` (500)
after a user edits comment lines. Not reproduced end to end; inferred from the two facts above.
Possibly other int-like text metadata (`data_lines`?) behave the same way when exposed.

## Proposal

Give int-valued metadata an int-coercing param (a small `IntParameter`/`MetadataParameter` subclass
with `unwrap` -> `int`, empty -> `no_value`) and use it for `comment_lines`; or coerce in
`ColumnDataProvider` (`int(...)` before comparing). The first fixes the stored type for every consumer.

## Tests

- API/unit: PUT comment_lines through the attributes form path, assert the stored metadata is an int.
- `test_history_dataset_auto_detect_metadata` (`galaxy_ui_driver`) currently asserts
  `int(comment_lines_metadata()) == 3`; tighten to `== 3` once fixed.
