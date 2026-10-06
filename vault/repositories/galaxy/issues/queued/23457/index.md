# galaxy#23457 — Reuse Pulsar's GCP Batch resource parsing and machine-sizing helpers

[Issue](https://github.com/galaxyproject/galaxy/issues/23457)

Galaxy's native GCP Batch runner and Pulsar's co-execution client parse CPU/memory and pick machine types independently and have diverged enough to choose different VMs for identical requests, with Galaxy capping at 128 vCPUs instead of rejecting unsupported shapes; next: decide where the shared helper lives before moving code.
