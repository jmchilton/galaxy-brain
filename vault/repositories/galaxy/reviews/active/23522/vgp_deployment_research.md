# VGP deployment research (usegalaxy.org)

Source: `galaxyproject/usegalaxy-playbook` @ `4d5276f6` (2026-10-20), `galaxyproject/infrastructure-playbook` origin/HEAD. Researched 2026-10-28.

## Confirmed

- VGP is a separate host, `galaxy-vgp.tacc.utexas.edu` (`galaxy_host_codename: main_vgp`), with its own web processes (nginx `usegalaxy_vgp.j2` → 127.0.0.1:8080/8081) and its own `job_conf.yml` (`env/main/host_vars/galaxy-vgp.tacc.utexas.edu/vars.yml`).
- VGP job conf: `default: vgp`, VGP-specific runners (`vgp_jetstream2`, `vgp_stampede3`, `vgp_bridges2`) and TPV files (`environments_vgp.yaml`, `tools_vgp.yaml`, `roles_vgp.yaml`). Main hosts set no `galaxy_job_conf_default_handler`; their handlers are in the `job-handlers` pool (`host_vars/galaxy-web-0{3,4}`).
- All hosts use `assign: [db-skip-locked]` (`env/common/templates/galaxy/config/job_conf.yml.j2`).
- Shared Celery broker and queue: neither main nor VGP sets `celery_conf.broker_url`, so Galaxy falls back to `amqp_internal_connection` (`lib/galaxy/celery/__init__.py:264`). Both use `galaxy_config_amqp_internal_connection` = `amqp://…@mq.galaxyproject.org:5671//main_internal`. Default task queue is the same `DEFAULT_TASK_QUEUE`, and neither routes `queue_jobs` elsewhere. So a `queue_jobs` task sent by VGP's web process can be consumed by a main-host Celery worker, which loads main's job conf (no `vgp` default, main TPV).
- `enable_tool_requests: false` on both main (`group_vars/all/galaxy_config_vars.yml:352`) and VGP. The client then submits via legacy `/api/tools` (`client/src/components/Tool/submit/index.ts`), so normal UI tool runs take the sync path and aren't affected. The flag is client-side only; `POST /api/jobs` still works server-side, so direct API clients hitting `/api/jobs` on vgp.usegalaxy.org do take the async path.

## Not confirmed

- Which hosts run Celery workers. `gravity_config` isn't defined in this repo (likely role defaults or vault). If VGP also runs workers, misrouting would be intermittent, depending on which worker picks up the task.

## Implications for the review

- The PR's premise holds for usegalaxy.org: shared broker and queue, different job conf per host.
- P2 3 (`KeyError` under `db-preassign`/`db-self`) doesn't affect usegalaxy.org (`db-skip-locked`), but it's still a real hazard for other deployments.
- P3 1 matters here: the forwarded value for VGP is the `vgp` default tag, so forwarding `default_handler_id` is exactly what the VGP fix needs.
- With `enable_tool_requests: false`, the bug only hits API clients calling `/api/jobs` directly, unless the flag is flipped.
