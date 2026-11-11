# Normal review 2 (post re-scope) — debrief

Verdict was ready, no bugs in `809d07fc8ad..1a32b46076d`. Acted on one nit (comment naming the two storage dumps the fixture parity test covers); folded into "Fix YAML text defaults dropped by to_internal()" (now `fba94da6222`).

Not acted on:
- Classless twin for the `basic.py` guard: class-less YAML tools are already refused before parameter building in Galaxy, so only the factory (tool_util consumers) can reach it; that case is tested.
- Latent factory vs `to_internal()` mismatches outside the fixtures (required text with no `value`: `""` vs `None`; text `area` not passed by factory; optional select `no_options` validators dropped by factory): pre-date the branch, no runtime path uses `to_internal()` for those types yet. Follow-up for #23888.
- `exclude_none` erases explicit `value: null`: real, low severity, out of scope. `lib/galaxy/agents/custom_tool.py:758` renders tool YAML for the editor with `exclude_none=True`, so an optional boolean with no default saves back as default `False`; `lint.py:349` lints a different dump than storage. Suggested fix: drop `exclude_none` (verified round-trips with `exclude_defaults` alone). Follow-up for John.
- pydantic mypy plugin lacks `init_forbid_extra`, which is why mypy accepted `default_value=`: info only.

<details><summary>Full review</summary>

See [normal_review_2_raw.md](normal_review_2_raw.md).

</details>
