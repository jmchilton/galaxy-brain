# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `pulsar_mq_status_poll` (`0fc2b40fbc7`, rebased onto dev 2026-10-06, no conflicts) — Description: Opt-in `status_poll_interval` asks Pulsar MQ to resend lost job statuses; stops double finishes (revives #9911); blockers: Pulsar #532 release + pin bump; mypy reds (`test_pulsar_runner.py` list annotations) fixed at `0fc2b40fbc7`; fork CI on `0fc2b40fbc7` otherwise green except unrelated Client Unit (`focusOrder`/`GPopover`, red on dev base `4fe00d9e7ab`, fixed on dev by `d9074b78886`) and packages (social-auth); integration `test_status_poll_recovers_lost_complete_status` times out (job stuck running) — expected until #532 ships, since released 0.15.15 sends status requests to the `setup` queue; [debrief](implementation_debrief.md).
