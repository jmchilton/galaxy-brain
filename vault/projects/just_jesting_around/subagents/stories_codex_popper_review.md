# Popper stories and DOM attachment review — c231ab38c4e

Independent read-only review approved without corrections. No recommendations were left unaddressed. Existing close-icon accessibility defect is recorded in BUGS_FOUND.md, outside component changes in this lane.

## Assertion mapping

All 12 cases and 31 original sites remain: title4; click/close3; outsideclick2; disabled1; arrowpresent/absent1each; mode2; placement1; livevisibility2; hoverdelay5; interactivehover4; insideinteraction5.

Four live setProps cases mount InputPopover directly. Its render forwards current attrs, preserving updates. Eight other cases select appropriate composed scenarios. Exact pre-delay, half-close and double-close advances remain. Core mocking and reverse teardown ordering are preserved.

Shared optional attachTo passes through without changing defaults. Body attachment preserves meaningful visibility checks. Stories supply useful text, exclude the harness, and disable Controls for initialization-only options. No component changes. Review was read-only; reported checks were not rerun.

## Validation

Targeted unit12/12 and removable Chromium3/3 probes passed. Full unit691 cases in86 files and browser334 cases in86 files passed. Type-check, formatting, lint and normal hooks passed. Shared helper prerequisite2ccc693ca12 preceded per-test commit.
