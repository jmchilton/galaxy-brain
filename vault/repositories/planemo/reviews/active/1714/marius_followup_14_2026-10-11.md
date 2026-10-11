# Companion PR #14: configured option error source

- Companion: https://github.com/jmchilton/planemo/pull/14
- Upstream: https://github.com/galaxyproject/planemo/pull/1714
- Reviewed head: `d70e2743a4978a6ab8b9ebd97ad9ae3ec7961f00`
- Reviewed base: `a9162611cac9b593e9cc7f8d88b8a3ee536c6396`
- Review date: 2026-10-11
- Recommendation: **approve companion PR #14 for merging into `config-option-conversion`**.
- Delivery: local review only; this reviewer did not merge, push, or post a GitHub review.

## Assessment

Marius's diagnostic finding is correct. Once #1714 validates configured values through Click, an obsolete configured path can cause a command to fail even though its invocation does not contain the named option. Naming the configuration file, selected profile, or declared default makes the error actionable.

The companion change uses the existing `convert_option_value` abstraction for every affected source. It catches and re-raises the same `click.BadParameter`, preserving its option/context metadata and usage-error exit behavior, while appending the source to its message. CLI/environment conversion paths remain unchanged. Global configuration diagnostics use the same `global_config_path` resolver that loads the configuration, and profile diagnostics use the selected profile name.

The test additions strengthen existing end-to-end Click parsing assertions for all three non-CLI sources and three invalid path cases. No assertions were removed or weakened. No merge blocker found in the companion diff or surrounding configuration/profile code.

## Validation

In isolated worktree `/tmp/planemo-marius-oct11/pr-14` at the reviewed head:

```sh
PYTHONPATH=$PWD /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest tests/test_config_options.py -q
git diff --check HEAD^ HEAD
```

Result: **35 passed** on Python 3.12.12; whitespace check passed. The three warnings concern existing Cheetah `cgi`, Galaxy `lib2to3`, and Click `MultiCommand` deprecations. This review did not run Galaxy/container tests; the companion only changes diagnostic wording.

## Remaining decisions and follow-ups from upstream #1714 review

1. **Release note for the behavior change.** Add a changelog entry to `HISTORY.rst` explaining that global-config/default/profile values now receive Click validation, so a stale configured path can reject a command that previously accepted it. Companion #14 supplies the source hint; it does not document the compatibility change. Marius explicitly called this changelog-worthy.
2. **Document `--tool_dependency_dir` accepting a directory to create.** The option no longer has `exists=True`; this change was already on the base, outside companion #14. `planemo/galaxy/config.py` calls `_ensure_directory(tool_dependency_dir)`, so accepting a missing directory is consistent with the consumer. State this deliberate loosening of CLI validation in the upstream PR description or release note.
3. **Document omitted repeatable-option precedence.** An omitted repeatable option's `()` now counts as unset rather than CLI-specified, allowing a selected profile to supply its value. This is consistent with the intended CLI/environment > profile > global config/default precedence; the current tests cover scalar/list configured repeatable paths. Make the behavior explicit in the upstream description rather than treating it as an unresolved bug.
4. **Optional context API cleanup.** `_setup_profile_options` calls `click.get_current_context()` and therefore needs an active Click invocation. The only production call is from the Click command wrapper, and no direct external caller was found in this checkout. This is a low-priority robustness decision, not a companion merge blocker. If direct library use should be supported, pass a `click.Context` explicitly; merely switching to `silent=True` without defining fallback conversion behavior would hide the contract.

No code modifications were made by this reviewer.
