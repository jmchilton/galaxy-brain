# vitest_story_a11y

Status: rebased prototype; browser validation has failures to resolve before integration. Do not PR independently.
Stacked on `vitest_story_play`.
Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/vitest_story_a11y`.
Base: `81c4987360debdff86678e038e8035c31213a410` (pushed Play tip captured for the 2026-10-12 rebase).
Pushed to `jmchilton/vitest_story_a11y` at `c246eb4fde308f62f817018b5ce5f41fbfba7407` on 2026-10-12; see [rebase handoff](rebase_2026-10-12.md).
User requested an isolated fork to explore visual and accessibility testing for
the BootstrapVue/Vue 3 migration, leaving the running conversion lanes alone.

- [Initial implementation](initial_implementation_debrief.md)
- [Final implementation](implementation_debrief.md)
- [Normal review](normal_review.md)
- [Test challenges](test_challenges_debrief.md)
- [Quality review](thermo_nuclear_review.md)
- [Scope evaluation](scope_evaluation.md)
- [Screenshots](screenshot_debrief.md)
- [Storybook pitch](../../../../../projects/just_jesting_around/STORYBOOK_PITCH.md)

No conversion ledger edits. No PR, cloud project, credentials, or browser CI
workflow added. Visual screenshot comparisons remain a documented option.

Original implementation validation (2026-10-10): 236/236 browser stories, 14/14 affected unit tests, final typecheck,
lint, formatting, and static Storybook build pass. See final debrief for the
121 legacy accessibility exceptions and the verified strict failure controls.

## Dependency audit — 2026-10-16

[Exact layer boundary and core-stack restack audit](dependency_audit_2026-10-16.md). Remote head is unchanged. This branch requires its own transplant from its recorded historical cut; the stories/play core stack is now published. Existing validation and review holds remain.
