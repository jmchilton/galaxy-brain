# pulsar #416 — Damaged job metadata causes endless monitor failures

[Issue](https://github.com/galaxyproject/pulsar/issues/416) · Open, unassigned. Checked 2026-10-11.

Nate [requested fix-a-thon attention on October 7](https://github.com/galaxyproject/pulsar/issues/416#issuecomment-6039600684). His [correction](https://github.com/galaxyproject/pulsar/issues/416#issuecomment-6039672405) says both the original traceback and the recent incident concern `final_status`, despite the issue title naming `launch_config`. An empty metadata file after disk exhaustion leads to repeated JSONDecodeError and manual active-job removal/requeue.

Next: reproduce a zero-length `final_status`, define terminal/recovery behavior that preserves an actionable failure reason, and consider `launch_config` separately because damage there may block startup. Check existing atomic metadata-write/recovery abstractions before adding another path. No implementation started in this sweep.
