# #21933: Fix workflow implicit mapping of flat collections over paired_or_unpaired

https://github.com/galaxyproject/galaxy/pull/21933. Merged. +107/-2 across 6 files.

## What happened

- **2026-02-25 19:20:** opened. The description opens on mvdbeek's own work: "This behavior was clarified/fixed in
  #21859 for the workflow editor. I think this fix is needed for that behavior to match the workflow runtime though."
  #21859 is mvdbeek's editor PR.
- The body then names the symptom ("The workflow engine failed to map flat list/sample_sheet collections over
  paired_or_unpaired tool inputs") and the root cause ("The API tool execution path worked because it explicitly
  translates ... The workflow path was missing both steps").
- It lists two fixes. One explicitly "mirrors basic.py:2675".
- **2026-02-26 08:52:** mvdbeek approved with **"Awesome! I'd have noticed this if I actually went ahead and used
  #21859"**. He merged it a minute later. Open to merge was about 13.5 hours.
- The testing checkboxes were left unticked, but the diff does add tests.

## Why it landed well

- **It finishes the reviewer's own feature.** He shipped the editor half, and this PR makes the runtime agree. His
  reply concedes he would have hit the bug himself.
- **It names the existing path to copy.** "The API path already does X; the workflow path was missing it; mirror
  basic.py:2675" gives a reuse argument and a correctness argument together. The fix is parity with existing code,
  not a new model.
- It is small and single-concern, and it describes a symptom, not an interpretation.

## Reusable signal

- **Frame the fix as making path A match path B, which already works, and cite the line.** That answers "reuse
  existing machinery" before he can ask.
- Linking to the reviewer's recent PR and showing a gap it exposed is welcomed, not resented. Keep the tone at
  "needed to match", not "your PR was wrong".
