# topics/galaxy-interface/faqs/flatten-list-list-paired-to-list-paired.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `cdbfecd0b71`. Replay: `flatten-list-list-paired-to-list-paired.gxui.sh` (passed twice).

No GTN findings: the columns (A outer, B inner, C paired), menu names, Paired-end Indicator / List Identifier(s)
definitions, Save and Run Tool all match 26.2; output is a list:paired (`batch1a`, `batch1b`).

- Galaxy test: `TestLoggedInToolForm.test_run_apply_rules_flatten_list_list_paired_from_menus`. Earlier Apply Rules tests set
  rules through the JSON source view; this one drives the menus as the FAQ does.
- gxui: `call` JSON-decoded every `{...}` arg, so `rule_builder_set_source` got a dict. Fixed: `call` converts by the method's
  annotations, and `rule_builder_set_source` takes JSON text or the rules object (callers dropped `json.dumps`).
