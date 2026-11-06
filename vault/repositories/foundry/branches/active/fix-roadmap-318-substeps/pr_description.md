Fixes the `test` job, which is red on `main` and on every PR.

#668, #670 and #678 were labelled `roadmap/substep` and made sub-issues of #318 today, but `content/meta/roadmap.md` doesn't list them. `validate:roadmap` fails on that, and because it runs early in the job, every later step is skipped.

This adds a `**Substeps**` section to #318's entry, with the three issues under it. No other line changes, and it adds nothing to `revised` or `revision`, matching `e4e5ff1a`, the same fix for #672.

## Evidence

- Before: `validate:roadmap` reports the same 4 errors as CI.
- After: `roadmap agrees with galaxyproject/foundry: 22 mains, 17 substeps`.
- `make -k check` passes everything except `check-vendored`, a known failure on this machine.

## Heads up

This can happen again. The validator reads live labels, so labelling a substep on GitHub turns every PR red until the roadmap catches up. This PR doesn't change that.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
