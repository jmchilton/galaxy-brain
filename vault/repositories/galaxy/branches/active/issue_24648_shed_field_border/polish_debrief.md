# Polish debrief

No branch changes: head stays `85ca630bac6`. Only the description and notes changed.

```
created .../issue_24648_shed_field_border/differential-review/snapshots/20261106T165853Z-polishing-85ca630bac61.json
  polishing @ 85ca630bac61 vs origin/dev (merge-base 5ab3087a5662)
  first snapshot: 4 commits, 1 file, 3 hunks
```

"First snapshot" only means this machine has no earlier ones. The hardening snapshot was at the same SHA on another machine.

- **CI:** unrelated reds only (mypy `kombu` in `Test Galaxy packages`, `macOS startup`). The record wrongly said "on base"; dev shows 0/3 failed, so that's corrected. Nothing rerun.
- **Checklist:** all pass (Sonnet 5.5, medium). The agent read the diff and log, not the notes.
- **Strengthening:** no development needed. It caught wrong draft claims, all fixed: a focused, hovered select thins from 2px to 1px rather than losing its outline; the old hover is dropped because it would lighten against grey-500; "error fields keep state colours" was unsupported. Added highlights for scope and for going past the issue.
- **Corrected notes:** `scope_evaluation.md` said the alt left selects at 1.8:1 (`132b1ec8a9c` sets grey-500) and that the branch restored valid/invalid colours (true on hover only).
- **Evidence limit:** select values come from one outlined field; a filled `SelectUser` was never measured in a real page. The description says so.
- **Added:** `screenshots/crop_*.png`, cut from the existing captures for the description.
- **Check branch:** Prettier passes on `shed.css`. `make format` and mypy skipped: no Python changed.

## Left for John

- A hovered error select still loses its `::before` border, though commit 4's subject says "every state". No Tool Shed field sets an error state, so it's unreachable. Recommend leaving it.
- A focused invalid input shows a primary border instead of red; its outline stays red. Pre-existing and unreachable. Recommend leaving it.
- `initial_implementation_debrief.md` and `screenshot_debrief.md` hold smaller stale claims (26.2 backport border colour, landing search box colour), per the strengthening review. Not corrected and not linked from the PR.
