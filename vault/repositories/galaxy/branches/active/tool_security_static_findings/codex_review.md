# Codex review

Not run, as in the first hardening pass. The Claude Code auto-mode permission classifier denies sending branch diffs to Codex (`codex exec -s read-only`), so this re-harden did not attempt it. Run `/codex-review` against `origin/dev` once that is allowed.
