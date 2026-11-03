```yaml
documents:
  - path: vault/repositories/galaxy/branches/merged/fix_story_a11y/implementation_debrief.md
    why: PR #24046 (the a11y/contrast repair that gave GFormInput its grey-500 border) - what shared controls were changed and how contrast was validated; this issue's override masks that fix in the Shed.
    load_when: Deciding the replacement border color and how to verify 1.4.11 contrast.
  - path: vault/repositories/galaxy/branches/merged/fix_story_a11y/review_comments_2026-10-14.md
    why: Reviewer feedback on the same contrast/focus repairs; likely preferences for the Shed follow-up.
    load_when: Reviewing the change.
  - path: vault/projects/toolshed/index.md
    why: Tool Shed maintenance project overview; context for Shed frontend (shed.css, brand tokens, Quasar leftovers).
  - path: vault/repositories/galaxy/branches/merged/toolshed_quasar_upgrade/index.md
    why: Prior Quasar bump in the Shed frontend; the remaining Quasar selects are what the q-field__control::before rule styles.
    load_when: Touching the Quasar field rules.
research_requests: []
```

Notes
- No galaxy-brain note covers the Tool Shed frontend styling (shed.css, brand-tokens, Quasar leftovers, galaxy-ui GFormInput); minimal gap, not queued because the code is small and readable in minutes.
- Code facts: `lib/tool_shed/webapp/frontend/src/styles/shed.css` lines ~233-294: `.shed-main input/textarea.g-form-input` border `--color-ebony-clay-200 #bbc0d2`, hover `ebony-clay-400`; Quasar `.q-field__control::before` border same color. Prior commits on this file: 3e2086adb4a, fb0b2042d60 (focus ring work).
