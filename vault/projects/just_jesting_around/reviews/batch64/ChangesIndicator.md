# ChangesIndicator — batch 64

All four original cases and 11 assertions remain: status-region semantics and unsaved markup, saved visibility at 1500ms, dismissal with no timer when new changes arrive, and no scheduled feedback after unmounting an in-flight flash. The original exposed flashSavedIndicator API calls remain because they represent the documented parent boundary.

Native inferred mount removes fabricated public-instance/wrapper casts. Each mount owns an attached DOM target for happy-dom visibility; automatic unmount precedes cancellation of remaining fake timers and restoration of real timers, followed by owned target removal. Required visible/text lookups use get; absence checks retain find. The explicit in-flight unmount scenario remains unchanged.

Before/after shuffled640101 passes four cases; 13files/68covered source locations match exactly. Repository file hooks pass. Integrated full types will check the native exposed API inference. No production/shared/supporting changes or new guidance needed.
