# pulsar_mq_status_poll

Status: `branches_implemented_needs_ci`. Base: `dev`.

Opt-in `status_poll_interval` asks Pulsar MQ to resend lost job statuses; stops double finishes (revives #9911).

[Implementation](implementation_debrief.md) · [review](review.md) · [Tracking history](tracking_history.md)

Depends on [Pulsar #532](https://github.com/galaxyproject/pulsar/pull/532) being released and the Galaxy pin being bumped.
