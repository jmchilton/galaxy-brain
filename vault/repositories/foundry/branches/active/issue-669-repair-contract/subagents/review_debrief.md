# Review debrief: `issue-669-repair-contract`

Reviewed `6f5be153`, now `c9235876`. Acted on 22 groups of findings across the five reviews, on the branch in 9 commits (2 of them regenerations), and left 8 items. The branch should ship as a draft PR. Both P1 families were real: the branch's main removal scenario rewarded the failure its guard exists to stop, and another scenario failed its own real repair. Trials after the fixes also caught a gap no reviewer found: the wrapper sentence talked an agent out of `add-step`.

The three implementer questions:

- **Partly cited removal:** a clear reading exists, so the wording now says it. The quoted artifacts must carry the removal alone. Strike everything uncited, and the removal must still follow. Debt can sit beside a removal about secondary claims, but can't be what justifies it.
- **One repair closing a second entry:** fine, and now stated. Scoping to one entry would have shipped a realized step's entry open.
- **Chain rule:** cut. No failure sits behind it, nothing records which steps a repair inserted, and a trip surrenders every open entry.

## Not acted on

- **A stop for a step that stays drafty** (domain P2 4, thermo P2 2, risks): #686's "How a call ends" (checked on `origin/fix/advance-draft-needs-tool`). This branch only stops promising it a terminal. The PR states the dependency. Nothing in `advance` bounds `while draft` until #686 lands, and the citation rule makes that state likelier.
- **One named repair gate in `advance`** (thermo P2 1): a larger refactor than the problem needs. A pass before extract closes the gap, and the cap and the persisted trip bound it.
- **Single owner for `blocking` and the invariant** (thermo P2 3): the copies are one clause each. I aligned the wording that actually differed. `implement:161` stays, as the plan review found it true for where it sits.
- **A writer branch in `advance` step 2** (thermo P2 3): #686 adds it.
- **Rewording `ledger:83`'s "uncited drop is a debt"** (default P1 1): it's general to every Mold, and the repair rule is stricter and specific.
- **`open_before` or `tripped` ledger fields** (default P2 1, thermo P2 2): the trip is now visible as `escalations` at `cap`, with no shape change.
- **Gating the fixtures, and fixtures for `rename`, `replace-tool`, `expose-output`, copied steps** (domain P3 6, thermo P3 3, test P3 2, plus the realized and consumer cases in test P2 1): the gate gap predates this branch and needs its own change. Listed as uncovered in the PR. Worth a `work/ready-implement` issue, which I couldn't file here.
- **Upstream text for `when` on unwired `skip_trim`** (domain P3 5): outside this branch. A second trial independently noticed it. The runtime effect on Galaxy is unverified, so it belongs with `workflow_libs` beside U1 and U2.

## Trials after the fixes

Single runs in scratch directories, judged by me. The first two ran at `de31f1bd`, before the last wording commit.

- `dupradar-cache-miss-only` through `repair`: left open, nothing removed. Pass.
- `sample-sheet-restore-last-drafty` through `advance`: went to step 2 rather than jumping, cited the Apply Rules ports and `SAMPLE_SHEET_MAPPING`, narrowed, also closed the entry on a realized step, extracted in the same call. `[0, 0]` didn't trip. Pass. The agent also struck the earlier drop's reason, which it had refuted, as the ledger's reopen rule asks.
- `fastqc-zip-no-port` through `repair`: first run left the entry open. It said the exhausted-branch sentence read as "not repair's case" and it never weighed `add-step`. I added a sentence saying a chosen wrapper lacking a declared output is in scope, and a second run made the `add-step` and moved MultiQC's edge. Fail, then pass.

## Other notes

- No `AI_POLICY.md` exists in this worktree. No PR template either, so `pr_description.md` follows the plan's summary and the record's requirements.
- `make -k check` at `c9235876`: only `validate-roadmap` and `check-vendored` fail, both known.

<details><summary>Verified findings acted on</summary>

Reports: [initial_review.md](initial_review.md) (default), [domain_review.md](domain_review.md) (domain), [test_challenges_review.md](test_challenges_review.md) (test), [thermo_review.md](thermo_review.md) (thermo), [risks.md](risks.md).

**`d4aa4376` Make a removal's citation carry the removal alone**

1. Guard and oracle pass a removal on uncited claims (default P1 1, domain P1 1, test P2 2). Verified: the fixture's `missing` holds Tool Shed searches and "no confirmed stock Apply-Rules pin", and `close-enough-7`, `author-7` and `collision-7` realized the step with a `GalaxyUserTool`. The scenario now accepts a cited removal or an open entry.
2. Step 1 skips the author branch on a cache-miss entry (default P1 1, domain P2 2). Narrowed.
3. No scenario exercises the guard (test P2 1, in part). Added `dupradar-cache-miss-only`.
4. "When the step is already realized" reads as forbidding realized-step closures (domain P2 3, default P3 2). Now scoped to removal.
5. "For the terminal path" promises nothing real for a drafty step (domain P2 4). Reworded.
6. The semantics note isn't cued on a removal (domain P2 1). Trigger extended.
7. Removal rules scattered, no order between narrowing and removing (thermo P2 4). Split into a **Removal** paragraph.
8. Narrowing property's scope unstated (test P3 4). Now "from this repair".

**`4b16dc34` Tighten what repair checks after an edit**

9. Dead-input walk misses `${label}` (default P2 3).
10. Plain `draft-validate` passes a wrong nested key on a realized step (test P2 5). Reproduced: exit 0 plain, `No parameter definition matching connection key` under `--concrete --strict-state`.
11. `doc` promising removed work survives (test P2 6). Verified on `trimmed_reads`.
12. Validation ordered before the cleanup edits, and "twin" undefined (thermo P2 4).

**`f59dd3b1` Persist a tripped gate and cut the chain rule**

13. A trip leaves no state (default P2 1, domain P2 5, thermo P2 2). Tripping sets `escalations` to `cap`.
14. The chain rule can't be evaluated (default P2 2, domain P3 1, thermo P2 2). Cut.
15. `blocking` wording differs ("must", "only") (thermo P2 3). Aligned.

**`22bdfa81` Send open blocking entries to repair before extracting**

16. Wider grade has no route off the picked step (default P2 4, thermo P2 1). Pass before extract added.
17. `advance`'s routing has no oracle (domain P2 6, test P2 3, thermo P3 3). Three properties and two scenarios, including `[0, 1]` as the gate regression.

**`6c9f89e1` Add remove-output and drop stale wording**

18. Output removal has no kind (default P3 3, domain P3 3, thermo P3 2). Added to all three lists, and "direct" spelled out.
19. Stale wording (default P3 1, domain P3 2, thermo P3 1), here and in `22bdfa81`.

**`e2c26d73` Correct the repair scenarios**

20. `fastqc-zip-no-port` fails its own golden (test P1 1). Verified at `repaired.gxwf.yml:241`. Also has the emitted-draft check from test P3 3.
21. Synthetic fixtures in unreachable states (test P2 4, domain P3 4). `raised_by` changed, direct invocation stated.
22. Deterministic tags without oracles, and "copied, with its `state`" (test P3 1).

**`da8df536` Say a wrapper missing one output is a repair case**

Test P2 7 asked for an `add-step` run. That run found this wording gap.

</details>
