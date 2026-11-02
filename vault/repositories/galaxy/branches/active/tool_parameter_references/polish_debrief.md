# Polish debrief: `tool_parameter_references`

2026-11-01, run from the factory session at John's request ("grand rebase and polish"). Head `245a9103f73` → `0b79ffc8921` on `jmchilton/tool_parameter_references`; base dev `269efa7af5b`. [Earlier polish (2026-10-02)](earlier_drafts/1/polish_debrief.md).

## Decision

John, 2026-11-01: merge now. The doc describes dev as it is, with inline **Open:** notes linking the issues and PRs that would change it. Supersedes "stays draft until the rough edges are fixed".

## Steps

- Rebase onto dev: 2771 commits, no conflicts (docs only).
- Fact-check: fresh Opus subagent, [reverification_2026-11.md](reverification_2026-11.md). 11 stale findings, 1 new silent trap, 7 open-work notes, gaps table updated.
- Refresh, four commits:
  1. `509ea5a8f61` type_source (#23890), linters (#23919), rename (#23918), editor `when` parsing, "Galaxy 26.2" wording.
  2. `810addd1103` YAML class-based dialects and sections (#24365); warning removed; two gaps closed.
  3. `9430df04c7d` YAML tool tests drop section values (verified in `yaml.py` `_flatten_parameter`); new silent trap + gap row.
  4. `0b79ffc8921` intro note on #23444 and **Open:** notes for #23884/#24524, #23888, #23891, #23902, #23895, #23981.
- Checklist: fresh Sonnet subagent, [pr_checklist.md](pr_checklist.md). One fail (#24524 note read as merged) fixed in commit 4.
- Sphinx: minimal `sphinx-build -n` (sphinx 9.1.1, myst-parser 5.1.0, Galaxy's heading-anchor config) with `tool_state.md` and a stub `user_defined_tools_authoring.md`: 0 warnings from this doc. Full `make docs` not run.
- Strengthening round: skipped; the fact-check covered it.
- [PR description](pr_description.md) rewritten; [titles](pr_titles.md) without `[WIP]`; [tags](pr_tags.md) add `area/workflows`.

## Snapshot

```
created .../differential-review/snapshots/20261101T231006Z-polishing-0b79ffc89213.json
  polishing @ 0b79ffc89213 vs origin/dev (merge-base 269efa7af5be)
  first snapshot: 12 commits, 2 files, 2 hunks
```

## Left for John

- #23891 and #23902 branches disagree on the profile gate (27.0 on #23891's head vs. 26.2 on #23902, built on an older #23891 commit). The doc's notes avoid naming a profile.
- The new section-drop trap has no issue yet.
- Update PR #23877's body from `pr_description.md` (after `human_review.md`), retitle, undraft.
