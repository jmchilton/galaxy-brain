Run via Claude Opus 5.5 at low effort.

# frame_index_range polish debrief

Polished `5cf1f5d6` (base `origin/main` `61d5e632`). No code changes.

- Description mirrors the gxformat2 `frame_index_range` framing and the #227 predecessor; gxformat2 PR is a `#GXFORMAT2_PR` placeholder.
- Fixture drift check: gxformat2 branch moved `baaac08` -> `3530ea0`, but only `_format2.py` and `test_comments.py` changed; fixtures byte-identical, no re-sync needed.
- Strengthening (one in-session critical read, no subagent): nothing to add. Branch covers ints, digit strings, negatives, huge digit strings, non-integers, label precedence; reviews clean. Misreadings answered in bold (labels win over indices) and "Not in this PR".
- Gate not rerun (no code changes); implementation recorded green.

## Questions for John

- Replace `#GXFORMAT2_PR` once the gxformat2 PR opens (and `#TS_PR` in the gxformat2 description).
