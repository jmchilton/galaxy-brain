Refactor following 🔀 #23473 - the activity bar and the command palette now share one check for which activities a user can see.

Where the user-defined-tools, interactive-tools and GalaxyAI checks live:

```diff
 ActivityBar.vue
-  activities.get()       3 checks
-  activities.set()       same 3 checks, negated by hand
+  activities.get()/set() isActivityAvailable() / !isActivityAvailable()
 CommandPalette/providers/navigation.ts
-  activityAvailable()    same 3 checks, written against PaletteContext
+  isActivityOffered()    anonymous + exclusions, then isActivityAvailable()
 stores/activitySetup.ts  (both sides already import this module)
   defaultActivities
+  isActivityAvailable()  the 3 checks, once
```

Since #23473, the palette's navigation scope offers the same activities the bar shows, so it repeats the bar's checks. ***If a check is added to only one copy, the palette can route to an activity the bar hides.*** The bar's setter also has to negate every condition by hand to put hidden activities back. `isActivityAvailable` sits beside `defaultActivities` in `activitySetup.ts`, which both sides already import.

***No behaviour change: each check is moved as written. Anonymous access and the palette's excluded activities stay in the palette, because the bar doesn't apply them.***

***`ActivitySettings.vue` keeps its own, mis-grouped filter here. Moving it onto the shared check changes what the settings list shows, so that fix is its own PR on top of this one.***

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Follows up the review of 🔀 #23473 (command palette configuration options, anonymous access and a navigation scope), which flagged the duplicated activity checks. Used by 🌿 [`activity_settings_availability`](https://github.com/jmchilton/galaxy/tree/activity_settings_availability) to make the activity settings list apply the same checks.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing new: an activity whose check fails stays hidden, in the bar and in the palette, as before.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Each check is tested open and closed, including a configuration that hasn't loaded yet counting as closed. A new `ActivityBar` test reorders the bar while an activity is hidden and checks the store still holds it; it fails if the setter drops hidden activities.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `client/src/stores/activitySetup.test.ts` (new): each check open and closed, an activity with no check, and an unloaded configuration.
- `client/src/components/ActivityBar/ActivityBar.test.js`: reordering the visible activities keeps a hidden `interactivetools` in the store (the setter path, untested until now).
- `CommandPalette/providers/navigation.test.ts` passes unchanged.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
