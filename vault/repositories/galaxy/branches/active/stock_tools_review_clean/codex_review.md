**Codex review: still blocked (re-harden, 2026-11-27). There was no review, so nothing was acted on.**

The host is unchanged since the first attempt (`earlier_drafts/1/codex_review.md`):
- Codex CLI is 0.169.0.
- There is no `bwrap` on PATH.
- `kernel.apparmor_restrict_unprivileged_userns = 1`.

The first attempt showed that Codex's bundled bubblewrap fails at start-up in this state (`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`), so Codex can't read the worktree. I didn't rerun it.

Unblocking it needs a host change, which is John's call:
- install Ubuntu's `bubblewrap` package (it ships an AppArmor profile); or
- add a profile for Codex's bundled `bwrap`; or
- relax the sysctl, which is a host-wide security change.

The branch still needs an independent review by a model other than Claude.
