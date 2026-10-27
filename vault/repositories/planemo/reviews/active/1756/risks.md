Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Reviewed commit `ce1a2eb3`; profile generic_risk_assessment via Claude Opus 5.5 at low effort.
- Missing `.shed.yml` metadata fields under `--ensure_metadata` now warn instead of crashing with `KeyError`; with the default `--fail_level warn` such repos still exit non-zero, just cleanly.
- Empty fields now also suppress the "Found all shed metadata fields" info line; previously they warned but still claimed success. Only scripts grepping that message would notice.
- No config, API, or data-format change; a revert restores prior behavior exactly.

</details>
