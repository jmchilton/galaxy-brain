# Polish debrief

Wrote `pr_description.md`, `pr_titles.md`, `pr_tags.md`. One strengthening round: applied all misreading fixes (managed stays default, #582 stays open and why, smoke-workflow scope of the 1/1 pass, egapx still fails at import for a separate Galaxy reason, scope note moved up).

Not done: the suggested `planemo serve --extra_tools <galaxy>/lib/galaxy/tools/build_list.xml` run to replace the "untested" hedge on built-in collection tools. Skipped to avoid a Galaxy boot while other agents share the machine. It would let egapx-style workflows (which use `__BUILD_LIST__`, `__FILTER_NULL__`, `__APPLY_RULES__`, `__EXTRACT_DATASET__`) get a tested route.

Questions for John: close/retitle #582 now that the external route is documented? File the egapx nested-UDT import 500 (`IntegrityError workflow_step.workflow_id`) on Galaxy? planemo#1757 and #1758 look like duplicates.
