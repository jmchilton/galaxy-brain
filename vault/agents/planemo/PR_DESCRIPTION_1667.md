## Summary

Fixes #1667.

Apply Click's normal type conversion to option values supplied by Planemo's global configuration, declared defaults, and profiles. These values previously bypassed path resolution and validation because they were introduced after Click had already processed the option.

- Share a small conversion helper between default blending and profile blending, delegating validation, `multiple`, and `nargs` handling to Click.
- Treat an omitted repeatable option's empty tuple as unset, allowing its configured default to be used.
- Accept scalar strings for repeatable configuration options as a single value, including `default_docker_extra_volume`.
- Remove the unused `resolve_path` plumbing.
- Make the existing enum option converter accept already-typed enum defaults.

CLI/environment precedence over profiles, and profile precedence over global configuration/defaults, are preserved. Profile-only internal settings without a corresponding Click option remain untouched. CLI/environment values are not converted twice, and existing outer callbacks see converted defaults.

## Compatibility

No declared option defaults change. Configured paths now follow the same rules as CLI paths: relative paths resolve from the invocation directory (including symlink resolution), and invalid paths fail with a normal option-specific usage error instead of failing later. Other configured types are also validated by Click. Default report paths become absolute but still refer to the same files; the default port is converted from `"9090"` to `9090`.

## Testing

The regression tests use real Click parsing, temporary YAML configuration files, and real on-disk profile loading—no mocks, Galaxy servers, containers, or external services. Coverage includes all value sources, symlinks, missing/wrong-kind paths, scalar/list repeatable paths, `nargs` conversion and validation, precedence, legacy config keys, outer callbacks, single conversion, enum defaults, booleans, and unset paths. The actual Docker extra-volume option is exercised without launching Docker.

- Initial regression run: 22 failures and five passing controls before the implementation fix.
- Expanded configuration tests and related CLI, metadata, profile, job-config, database-selection, and Galaxy-config tests: 106 passed, three Galaxy-launch tests skipped. Existing tests run with an isolated global workspace and permission for local socket binding.
- Real `cwltool` execution/report generation and cache-reuse tests: two passed, without containers.
- Changed-file Black, isort, Ruff, and whitespace checks pass.

The unrelated unused `dependencies_script_options()` cleanup is intentionally left out.
