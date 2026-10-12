Follow-up to 🔀 #23921 - make Activity Settings offer only optional activities available to the current user.

Activity Settings currently lists Upload and Tools whenever a user can use Custom Tools, even though neither is optional. It also lists Interactive Tools and GalaxyAI when the instance has disabled them. The activity bar and command palette already apply the availability checks; Settings now uses the same checks.

| Activity and condition | Settings before | Settings after |
| --- | --- | --- |
| Upload / Tools, user permitted to use Custom Tools | Listed | Omitted: always-on activities |
| Custom Tools, user permitted | Listed | Listed |
| Custom Tools, user lacks permission | Omitted | Omitted |
| Interactive Tools, instance feature disabled | Listed | Omitted |
| GalaxyAI, no LLM configured | Listed | Omitted |

***Upload and Tools remain available in the activity bar; this change removes them from Settings’s optional activity list and applies the existing feature and Custom Tools permission checks.***

***Users can still show or hide available optional activities, search the list, and manage saved custom activities; their stored preferences are preserved.***

<details><summary>Implementation and regression evidence</summary>

`ActivitySettings.vue` requires both `activity.optional` and the shared `isActivityAvailable` check. Its computed list observes the configuration and Custom Tools permission refs.

Component tests check rendered activity titles for a permitted user and for an instance with Interactive Tools and GalaxyAI disabled. Both regressions fail against the current `dev` component at the incorrect rendered activity titles. Mounted transition tests also cover configuration arriving, feature flags changing independently and Custom Tools permission being granted and revoked; saved visibility stays unchanged. Existing tests cover show/hide controls, deletion and search.

Local validation on the polished branch: 36 tests pass across ActivityBar, activitySetup and command-palette navigation; TypeScript, eslint and prettier pass. Fresh fork CI is pending on the pushed head.

</details>

## Risks

Risks are minimal: this is a small, reversible correction to the settings list (a two-way door). Config-gated entries remain hidden until configuration is available; saved activity preferences are preserved.

## Context

Builds on 🔀 #23921, which merged the shared activity availability checks used by the bar and command palette. That PR intentionally left the settings filter for this behavior-changing follow-up. The branch now targets `dev` directly.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Unavailable activities are hidden; an empty search displays “No matching activities found.” Existing unexpected Custom Tools access-check failures show a toast.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check rendered titles, live configuration/permission changes, saved visibility and existing show/hide, deletion and search behavior.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

Run from `client/`:

```sh
pnpm exec vitest run src/components/ActivityBar src/stores/activitySetup.test.ts src/components/CommandPalette/providers/navigation.test.ts
```

On Node 25, set `NODE_OPTIONS=--no-experimental-webstorage` for the browser-test environment.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
