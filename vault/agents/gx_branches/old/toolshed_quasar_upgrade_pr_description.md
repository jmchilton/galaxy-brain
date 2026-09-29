Supersedes #23195.

## What

Bumps Quasar in the Tool Shed frontend from 2.18.6 to 2.33.1 and widens the declared range from `^2.5.0` to `^2.33.1`. Two files, lockfile included; nothing else in the diff.

## Why not just merge #23195

Dependabot opened that PR in July against 2.22.0. Quasar is at 2.33.1 now, automatic rebases were disabled on the PR after 30 days, and its base predates the current `jsondiffpatch` pin, so the lockfile hunk no longer applies cleanly. Redoing the bump against current `dev` is less work than rescuing it, and lands eleven minors further forward.

The two red checks on #23195 are Integration and Integration Selenium, failing in `test_workflow_run_target.py` on a history-indicator timeout. Galaxy Selenium, nothing to do with the Tool Shed frontend — that PR's CI was never evidence about the bump.

## The range, not just the pin

`^2.5.0` was the declared floor while the lockfile had been carried forward to 2.18.6 — thirteen minors of drift between what the manifest promised and what anyone actually installed. Dependabot moves both, and that is the right call; keeping the floor at the version we build and test against is the point of the range.

## Node

Quasar 2.33 declares `engines: {node: '>= 22.0.0'}`, up from `>= 10.18.1`. `.github/workflows/toolshed.yaml` sets up pnpm but never `actions/setup-node`, so the frontend builds on whatever node the `ubuntu-latest` image ships — currently well past 22. No change needed, but the build now has a floor it did not have before, and it is invisible in the workflow file.

## Verified

Against the pinned `packageManager` (pnpm 10.26.1, self-selected):

- `pnpm install --frozen-lockfile` clean, lockfile unchanged afterwards.
- `pnpm typecheck` (`vue-tsc --noEmit`) clean.
- `pnpm build` clean — 847 modules, same chunk-size warning as before.
- `pnpm test:run` — 94 passed, 1 failed.

That one failure is pre-existing. Confirmed by stashing the bump, reinstalling at 2.18.6 and re-running: `RevisionsTab > invalid tools > shows invalid tool paths when revision is expanded` fails identically on unmodified `dev`. Same for the two `prettier/prettier` errors from `pnpm lint`. Neither is a regression from this bump and neither is fixed here.

The app imports only `Cookies`, `copyToClipboard`, `exportFile`, `Notify`, `Quasar`, `QTableColumn` and `QTableProps` from the package — no `extend`, so the 2.22 prototype-pollution fix touches nothing we call.

## Noticed, not fixed here

- `RevisionsTab.test.ts` and the two prettier errors are red on `dev` today. Nothing catches them: the Toolshed workflow runs `pnpm install --frozen-lockfile && make client`, and `make client` is `pnpm build`. `pnpm test:run` and `make lint` run nowhere in CI, so this frontend's unit tests and lint have no gate. Worth a follow-up to add them to the workflow and then fix what they find.
- `dev`'s committed lockfile carries `libc:` fields that pnpm 10.26.1 — the version `packageManager` pins — strips on install. Some earlier commit was made with a newer pnpm. I restored those lines by hand so this diff stays quasar-only; the drift is still there and will reappear in whichever bump lands next.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
