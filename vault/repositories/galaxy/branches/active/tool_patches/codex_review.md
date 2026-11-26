# Codex review

Not run, as in the first hardening pass. The Claude Code auto-mode permission classifier denies sending the branch diff to Codex (`codex exec -s read-only`), so this re-harden did not attempt it. Run `/codex-review` on `tool_patches` against `origin/dev` once that is allowed.
