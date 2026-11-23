Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: ef448e3cde0

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It only widens `Image.set_meta`'s error handling from `PIL.UnidentifiedImageError` to any exception (logged as a warning, metadata left unset) and adds a test fixture plus unit tests; no API, datatype registration, or tool/workflow-facing behavior changes, and reverting is a one-hunk revert.

Small things worth a human glance: the broad `except Exception` can now hide genuine bugs in this block as warnings, and an exception raised after `width`/`height` are assigned leaves metadata partially populated rather than empty.
