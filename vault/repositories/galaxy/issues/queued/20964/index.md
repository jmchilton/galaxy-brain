# galaxy#20964 — Invocation report - use table headers

[Issue](https://github.com/galaxyproject/galaxy/issues/20964)

`history_dataset_as_table(show_column_headers=True)` has no effect because tabular doesn't set `column_names` (Delphine-L); mvdbeek suggests a client option to read headers from the file; next: add that option.
