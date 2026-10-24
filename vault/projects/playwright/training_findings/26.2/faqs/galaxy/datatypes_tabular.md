# faqs/galaxy/datatypes_tabular.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `936d7155f34`. No tutorial embeds it. Replay: `datatypes_tabular.gxui.sh`.

- `tabular-datatypes-tab` (main): Edit Attributes tabs are Attributes, Datatypes, Permissions
  (26.1 too), so **Datatypes** is the 2nd tab, not the 3rd. A plain `tabular` has no column fields on
  **Attributes**; after changing to `interval`, Attributes shows Chrom/Start/End/Strand/Name column
  selects. So change the datatype first, then assign columns.

Galaxy: datatype change is tested (24fa0702f6d); setting interval column metadata isn't. gxui has
no verb that just opens the Attributes tab, so the replay reaches it with `dataset-rename`.
