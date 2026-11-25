# Alt: render_recording

Branch `tool_security_review_spec_alt_render_recording` (jmchilton remote, head `16acb57c51a`), on top of
`5530db35200`.

A prototype that checks values while the templates render instead of refusing tools that read the dataset model
or the user object:
- `galaxy.security.render_recording` hands out recording views for `.unsanitized` and the unsanitized user object.
- The job check strict-checks the recorded strings after rendering.
- It also runs with `tool_evaluation_strategy: remote`: `JobIO` carries the settings, and the refusal is passed back
  to the handler.

It differs from the working branch, which keeps the static refusal of model and user-object reads.

It was reverted because:
- A review found ways around the recording.
- Lifting the static refusal also let templates read secrets and change model objects. A plainness check guards
  against injection only, not against those.
- A scan of tools-iuc found no tool refused by that block, so the prototype bought nothing there.
