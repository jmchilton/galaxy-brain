# pulsar-mq-pull

Status: `author_work`. Base: `dev`. [PR #9911](https://github.com/galaxyproject/galaxy/pull/9911) (open).

Polls for Pulsar MQ jobs missed by normal event handling.

[Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live PR #9911 conflicts in jobs/__init__.py, runners/__init__.py and runners/pulsar.py. This old runner integration requires semantic reconciliation; left branch untouched.

## TICK — 2026-10-12

Live draft remains conflicting with actual dev `6831f768a637d148d941a3477db0a14e21573c1d`. Read-only merge-tree confirms substantial conflicts in `lib/galaxy/jobs/__init__.py`, `lib/galaxy/jobs/runners/__init__.py`, `lib/galaxy/jobs/runners/pulsar.py`. These require design or behavior reconciliation beyond the automatic small/mechanical-conflict scope. No worktree files, branch refs or PR settings changed; remains author work.
