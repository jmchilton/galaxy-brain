# faqs/galaxy/analysis_concatenate.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `df4f3b65424` (`faq_server.sh main`, stock config).
Not embedded by any tutorial at the pinned commit.

## GTN

- Tool 1 checks out: `cat1` is named **Concatenate multiple datasets or collections** in 26.2.
  Ran it with list A (a1, a2) as the first input, list B (b1, b2) in the first repeat and a single
  dataset in the second: the output is a list of 2, `a1b1single` and `a2b2single`, as the FAQ says
  (nth with nth, single recycled).
- Tool 2 (`tp_cat`, "Concatenate datasets tail-to-head (cat)") isn't on a stock server; its
  claims are unverified here.
- Could add: to give a collection to tool 1, switch the field to **Dataset collection** (folder
  icon) first; in the default single-dataset mode collections aren't offered.

## Galaxy

- `cat1` map-over is well covered by API tests (`test_tools.py`).
- **gxui / `tool_form_fill` bug:** a collection hid for a dataset field matched nothing, kept the old
  selection, and `tool-fill` still said "filled 3 fields". `tool_form_fill` now switches the field
  to collection mode and fails if the field doesn't show the hid (`db9151e2597`, with
  `test_tool_form_fill_maps_over_collection`, red before the fix).
- gxui: `tool-describe` reads the API build, not the page, so it can't confirm a fill; docstring
  says so now (gxui tip `df4f3b65424`).
- gxui gap: no verb shows a collection element's content (`dataset-peek` only reaches visible
  items); read via `gxui call api_get` for this run.
