Profile: generic_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: `2ffe63c3c57f39bf649ec4ac29b3ec1c334c20c7`

Risks are mostly two-way: the linter is opt-in (`--security`) and INFO-only, so it can be revised or removed cheaply. The main one-way-ish commitment is the public surface it adds: the `--security` flag, the `security` skip name, and eight `Security*` class names users will put in `--skip` lists and CI configs.

<details><summary>Risk Details</summary>

- `--security`, the `security` module skip name, and the eight `Security*` linter class names become user-facing identifiers. Renaming or merging them later breaks users' `--skip` lists, because unknown skip names are rejected.
- `planemo/linters/security.py` is imported unconditionally in `tool_lint.py`, so its classes always appear in `Linter.list_linters()` and are accepted as skip names even without `--security`. That's harmless, but every `planemo lint` run now loads a ~1000-line module.
- The permissive-sanitizer check copies Galaxy's `ToolParameterSanitizer` preset semantics and imports `galaxy.util.mapped_chars`. If Galaxy changes its sanitizer, findings may silently drift from real behaviour, and an internal Galaxy import can break at import time.
- Messages recommend `safe_element_identifier` (Galaxy 26.2+, galaxyproject/galaxy#23735). If that accessor's name or availability changes before release, the advice is wrong.
- A regex/heuristic Cheetah scanner gives users a "clean" signal that's only as good as its heuristics. False negatives could leave people falsely confident about tools that are actually exploitable. This is a perception risk, not a code risk, since the linter is advisory.
- Being INFO-only means a later move to WARN/ERROR would be a behaviour change for anyone who runs `--security` with `--fail_level info`.

</details>

<details><summary>Risk Review Advice</summary>

Settle the naming before merge, since that's the part that's hard to walk back: are eight separately skippable classes the right granularity, and should the flag be `--security` or something more specific? Also check whether the sanitizer-modelling code could reuse Galaxy's `ToolParameterSanitizer` directly instead of re-implementing its preset resolution. That would remove the drift risk and the internal `mapped_chars` coupling.

Reviewers should treat the command-scanner heuristics (quoting detection, `re.sub`/`shlex.quote` mitigations, comment and directive handling) as best-effort. The help text and docs should make clear that a clean result isn't a security guarantee.

</details>
