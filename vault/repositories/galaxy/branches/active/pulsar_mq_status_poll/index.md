# pulsar_mq_status_poll

Status: `branches_implemented_needs_ci`. Base: `dev`.

Opt-in `status_poll_interval` asks Pulsar MQ to resend lost job statuses; stops double finishes (revives #9911).

[Implementation](implementation_debrief.md) · [review](review.md) · [Tracking history](tracking_history.md)

Depends on [Pulsar #532](https://github.com/galaxyproject/pulsar/pull/532) being released and the Galaxy pin being bumped.

## TICK — 2026-10-11

Current-head integration status-recovery case still times out, matching the recorded unreleased Pulsar dependency blocker. Client-unit focusOrder/GPopover and social-core package failures are unrelated but do not remove that blocker; no promotion.
