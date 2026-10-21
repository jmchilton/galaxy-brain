# Test challenges review — PR #24320

- Profile: gx_test_challenger
- Model: claude-opus-5-5, low effort (release-branch bug fix)
- Reviewed commit: a0dec1a30b446bb89dff99077e93feb7edc10df1
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Tests are well-placed: pure-function ordering tests plus a mock-free lineage test hitting the real bug site. No tests to drop or move to another layer; no E2E needed.

### P3 1: Explain the `1.8.1+2+galaxy0` entry in `TOOL_VERSIONS`

`TOOL_VERSIONS` must be sorted, but its first entry `1.8.1+2+galaxy0` sorts below `1.0`. That is right only because the string isn't valid PEP 440 and falls back to `LegacyVersion`, which sorts before every `Version`. A reader will likely think the list is out of order. Add a one-line comment, or move the case into its own named test such as `test_tool_version_invalid_pep440_sorts_first`.
