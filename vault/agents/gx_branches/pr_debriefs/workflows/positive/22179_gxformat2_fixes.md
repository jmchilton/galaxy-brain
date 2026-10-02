# #22179: [26.0] Fixes for gxformat2

https://github.com/galaxyproject/galaxy/pull/22179. Merged. +81/-2 across 3 files.

## What happened

- **2026-03-19 10:41:** opened. The body is two sentences: "Preserve workflow comments while converting and allow tool
  state without string encoding the whole blob - which I learned this week Galaxy supports."
- **11:02 (21 minutes later):** mvdbeek approved with **"That is just awesome!"**
- **14:22:** mvdbeek merged it. Open to merge was about 3.5 hours.
- The diff is a gxformat2 pin bump (0.21.0 → 0.23.0) plus 79 lines of API tests in `test_workflows.py`. The real
  fixes are in gxformat2.

## Why it landed well

- The change is tiny and already proven. Galaxy only takes a version bump, and the tests show the new behavior at the
  API.
- It fixes things users lose: workflow comments disappeared on conversion. Nobody needs convincing that comments
  should survive.
- It targets a release branch ([26.0]) and is labelled as a bug fix, so it was easy to slot in.
- John's admission ("which I learned this week Galaxy supports") reads as honest discovery, not advocacy.

## Reusable signal

- **Fix it upstream, then land a thin Galaxy PR.** When the logic lives in a library John controls (gxformat2), the
  Galaxy PR shrinks to a pin bump plus API tests. That form gets reviewed in minutes. #20880 and #22756 follow the
  same pattern.
- A terse description was fine because nothing was contested. The tests carried the evidence.
