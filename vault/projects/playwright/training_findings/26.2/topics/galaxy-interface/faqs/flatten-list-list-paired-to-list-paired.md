# topics/galaxy-interface/faqs/flatten-list-list-paired-to-list-paired.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `0eee83da68e`. Replay: `flatten-list-list-paired-to-list-paired.gxui.sh` (passed twice).

No GTN findings: the columns (A outer, B inner, C paired), menu names, Paired-end Indicator / List Identifier(s)
definitions, Save and Run Tool all match 26.2; output is a list:paired (`batch1a`, `batch1b`).

- Galaxy test: `TestLoggedInToolForm.test_run_apply_rules_flatten_list_list_paired_from_menus`. Earlier Apply Rules tests set
  rules through the JSON source view; this one drives the menus as the FAQ does.
- gxui: `call` JSON-decodes `{...}` args, so `rule_builder_set_source` gets a dict; a leading space keeps it a string.
