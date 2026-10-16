# Retro sweep

Run only when John asks. Recommend changes; don't apply them.

1. Read the date in `LAST_SWEEP.md`.
2. Gather what happened since then:
   - John's messages to Claude agents: `uv run claude_scraping_user_messages.py --since <date>`. Claude-only; other agents' sessions reach us through `sessions_for_retro/`.
   - Branch records under `vault/repositories/*/branches/`: new `earlier_drafts/`, entries sent back from final review, and `branches_need_decision` notes.
   - Upstream reviewer comments on PRs the factory opened.
3. Group what you find into patterns. Recommend a fix only for a pattern seen at least twice; list one-offs without a fix.
4. Name one target file per recommendation. Prefer the review-stage processes (`_shared/GX_PROCESS_*`, PR checklists) over implementer `AGENTS.md` files, and prefer deleting or clarifying an instruction over adding one. Ideas for mechanical checks go in `STATIC_CHECK_IDEAS.md`.
5. Update `LAST_SWEEP.md` to today's date.
