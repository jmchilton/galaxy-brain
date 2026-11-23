# Implementation debrief

**STATUS: READY** (CI not yet seen). Revision: John asked for a docs rewording (2026-11-23). The previous debrief, with the full hardening summary, is in [earlier_drafts/3/](earlier_drafts/3/implementation_debrief.md) and otherwise still applies.

```
created .../differential-review/snapshots/20261123T203851Z-revision-d355bf5a0702.json
  revision @ d355bf5a0702 vs origin/dev (merge-base e7a3f2254c07)
  since 20261115T014228Z-revision-349c6fd7abcc:
    commits: 28 same, 2 rebased, 1 changed, 0 new, 0 dropped
    hunks:   56 carried, 1 changed, 0 new, 0 dropped
    changed 5f08197faedc Strip $PATH_TO_IMAGES/ from RST help image targets of non-shed tools (1 differing hunk)
```

## This revision

The XSD Images section said the `$PATH_TO_IMAGES/` prefix "is ignored". Followed by the "Before Galaxy 27.0…" caveat, that read as if the branch broke tools using the prefix. It doesn't:

- Installed shed tools: `dev` strips the prefix in `set_image_paths`; the branch strips it in `make_image_paths_relative`.
- Local tools: `dev` leaves it literal, so the image is broken; the branch strips it (X1).

The text now reads: "RST targets may keep the Tool Shed's legacy `$PATH_TO_IMAGES/` prefix; it works for local and Tool Shed tools alike. Galaxy releases before 27.0 support relative image paths only in RST help of tools installed from the Tool Shed."

- Folded into the X1 commit (`5f08197faed`). Head is now `d355bf5a070` (31 commits, same base), force-pushed to `jmchilton`.
- `xmllint` is clean. It's a docs-only change, so no tests were rerun.
- [Normal review 4](subagents/normal_review_4.md) found the wording accurate; nothing acted on.

## Follow-ups

- The legacy `${static_path}/images/X` targets in tools-iuc are being fixed in the tools themselves rather than with a Galaxy lookup fallback: tools-iuc #9030 (rp2paths), #9031 (dnabot), #9032 (weblogo3) and #9033 (fasta_clipping_histogram). On usegalaxy.eu, snpfreqplot and interval2maf already return 200; tasmanian 1.0.7 returns 400, but its help on tools-iuc `main` no longer references an image.
- The other follow-ups are unchanged; see the [previous debrief](earlier_drafts/3/implementation_debrief.md#follow-ups-not-in-scope).
