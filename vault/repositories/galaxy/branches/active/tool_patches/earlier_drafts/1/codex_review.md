# Codex review

Not run. The Claude Code auto-mode permission classifier denied the `codex exec -s read-only` call (it sends the branch diff to a remote model), and the hardening run did not work around it. Run `/codex-review` on `tool_patches` against `origin/dev` once that is allowed. The normal reviews (`subagents/review_phase_ab.md`, `subagents/review_phase_cd.md`), the test challenges and the thermo-nuclear review stand in for now.
