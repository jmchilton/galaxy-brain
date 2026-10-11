Follow-up to #1667 and #1714, prompted by [Marius’s review of #1704](https://github.com/galaxyproject/planemo/pull/1704#pullrequestreview-5478940924): `--galaxy_python_version 3` is rejected by the CLI, but the equivalent configured default bypasses the choice check.

### What is already covered

#1714 supplies a shared `convert_option_value()` helper using Click’s `Parameter.type_cast_value()` for global defaults, declared defaults, and profile values. This validates choices, paths, booleans, `multiple`, and `nargs`; it is broader than the path-specific title of #1667. It also reports the config/profile source on conversion errors. The Python-choice mismatch should be resolved when #1704 and #1714 are combined, so this issue should not duplicate that fix.

### Remaining gaps confirmed by research

Research used #1704 at `c38e6c179149baf424bd005f6fd400e96276c86d`, #1714 at `6a9c35a56c1e50c63163187a4afcc151cd67f4ac`, and Click 8.4.1. Small commands used real Planemo option blending, temporary YAML files, and on-disk profiles; no Galaxy or external services ran. The combined-choice check used #1714’s helper with #1704’s choice list, rather than claiming a full branch integration run.

- **File shape is unchecked.** [`read_global_config()`](https://github.com/galaxyproject/planemo/blob/6a9c35a56c1e50c63163187a4afcc151cd67f4ac/planemo/config.py#L172) returns `yaml.safe_load()` directly. Non-mapping roots such as `hello` or `- default_galaxy_python_version: '3'` were accepted and ignored by the probe. Decide how to handle empty files separately; they currently behave as an empty config through `PlanemoCliContext.global_config`.
- **Unknown keys are silent.** `default_galaxy_pyton_version: '3'` (a typo) produces no diagnostic. There is no whole-file configuration validation command.
- **Validation is command-local.** An invalid `default_galaxy_python_version: banana` is not checked by a command that only consumes `default_port`. This is reasonable for runtime defaults, but users have no explicit way to check the entire file without running each affected command.
- **Type conversion is not all CLI validation.** Global defaults pass through `planemo_option`’s outer callback, but [`_setup_profile_options()`](https://github.com/galaxyproject/planemo/blob/6a9c35a56c1e50c63163187a4afcc151cd67f4ac/planemo/cli.py#L157) inserts profile values after those callbacks. A small `planemo_option` callback rejecting `bad` rejects it from CLI/global config (exit 2), while the same value in an on-disk profile reaches the command (exit 0). This demonstrates the reusable mechanism’s remaining boundary; it is not a claim that every current option has a custom validator.

### Proposed direction and design questions

Provide an explicit, offline configuration lint/validation entry point, deriving option constraints from the existing Click definitions rather than maintaining a second hand-written list of choices and path rules.

- Reuse `planemo_option` metadata (`use_global_config`, `extra_global_config_vars`, declared defaults) and the existing [`cli_metadata` machinery](https://github.com/galaxyproject/planemo/blob/6a9c35a56c1e50c63163187a4afcc151cd67f4ac/planemo/cli_metadata.py#L118) to discover supported keys and their corresponding options. Keep actual Click parameter types authoritative for conversion; serialized metadata is not a complete executable validator.
- Include a small explicit contract for settings read outside generic option-default blending, such as `sheds`, `github`, and `lint_skip`, and for profile-generated/internal settings. Do not reject all non-`default_*` keys or keys absent from one particular command. Diagnose conflicting constraints if one shared key maps to different command options.
- Choose a policy for unknown keys (warning or strict-mode error), YAML shape/parse errors, aliases, and stale values. Diagnostics should identify the file/profile, key, and related option without printing credential values.
- Distinguish linting all stored settings from validating the effective options for a command. Preserve CLI/environment > profile > global config > declared default precedence; decide whether an invalid value shadowed by a higher-priority source should block execution or only be reported during whole-file linting.
- Define a reusable contract for pure validation versus callbacks with transformations or side effects. Re-running arbitrary `param.process_value()` after blending would also re-enter Planemo’s sourcing callback and can convert or execute callbacks twice. Consider extracting pure validators, or resolve sources before Click’s normal processing. [Click’s `Context.default_map`](https://click.palletsprojects.com/en/stable/commands/#overriding-defaults) is its standard config-default mechanism; [parameter callbacks](https://click.palletsprojects.com/en/stable/advanced/#callbacks-for-validation) provide further validation. Evaluate any migration against Planemo’s aliases, profiles, precedence, and supported Click versions.

### Acceptance evidence

Tests should cover mapping/scalar/list/empty/malformed YAML; typoed keys and valid legacy/nested keys; choice/path/bool/repeatable/multi-value conversion; profile callback parity; shadowed invalid values; and source-specific diagnostics. The validator should work without starting Galaxy, containers, databases, or making network calls, and should catch errors in settings not consumed by the current command.

This is a design follow-up to the conversion fix, with the exact command name and strictness policy left open.
