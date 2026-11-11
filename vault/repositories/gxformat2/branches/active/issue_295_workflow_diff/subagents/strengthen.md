Run via Claude Opus 5.5 at high effort.

Strengthening round on `e5439cf`. New head `4440404` on `jmchilton` (three commits: `1c698f2`, `e4d1b9a`, `4440404`).

## Misreadings checked

- **"State comparison knows tool defaults, so the default-fill lines are noise."** Not answered before. Now answered by a new highlighted paragraph: state is compared as written, and an absent parameter differs from `null`/`""`/`[]`.
- **"This catches a real removal on a real run."** Answered. The description keeps "no pre-test snapshot exists". The new real-pair paragraph says it is agreement on a revision, not a caught removal.
- **"Foundry uses this already."** Answered by "library half; nothing in Foundry calls it yet".
- **"It's a text diff / label-based."** Answered by "structural diff, not a text diff".
- **"Draft-only tool."** Answered: either side may be a draft or a final workflow.

## Task list

1. Decide what to do about the "added (none)" state leaves on the real draft→final pair.
2. Pin `in_defaults` alone and `out_actions` alone as enough to put a step in `changed`.
3. Pin a dict step whose inner `id` differs from its key.
4. Leave the missing pre-test snapshot as stated; don't fabricate one.
5. Give a CI verdict for the 3.13 red.

## Applied

- **1, decision: no suppression; the JSON contract is unchanged.**
  - The run folder (galaxyproject/iwc-lab#8) has `galaxy-workflow.before-revision.gxwf.yml`, a real pre-revision snapshot. Diffing it against the final gives exactly six state leaves: `post_fastqc.min_length`, `multiqc.comment`, and `fastx_single`'s `copy_arb_tags`, `inclusive_filter`, `exclusive_filter` and `exclusive_filter_all`.
  - Those are rows 1-4, 8 and 9 of the change-set (`revision/galaxy-workflow-changeset.md`), which made Galaxy's substituted defaults explicit on purpose, for strict validation and determinism across Galaxy versions. There is no step, edge or output change, which matches the change-set's "unchanged" list.
  - So the "noise" on the draft→final pair is recorded work. Suppressing absent↔empty would hide it.
  - Pinned by `test_diff_unset_state_leaves_differ_from_absent`. A debrief contract bullet tells the TS port not to "fix" it.
  - Text only: state lines now print `null` and `""` instead of `(none)` and a blank (`e4d1b9a`, red first: `test_render_text_spells_out_unset_state_values`).
- **2:** `test_diff_step_input_default_alone_is_a_change` and `test_diff_output_action_alone_is_a_change`. Each asserts that the other terms are empty. Mutation-checked: dropping each term from `differs` turns its case red.
- **3:** `test_diff_dict_step_inner_id_is_not_its_identity`. Renaming only the inner id gives `has_changes: false`. Sourcing through the inner id was dropped from the case: `to_native` rejects `cat_b/out_file1`, so the diff resolver accepting it is lenient, not a contract.
- Five small synthetic fixtures, all in the catalog. Updated: the `diff.yml` header, the debrief contract (step identity, state, membership, text), and `pr_description.md` (the real-pair paragraph, the state-as-written paragraph, the "what is compared" list, case counts, and the comments blind spot citing change-set rows 11-12).
- Gate: `pytest tests/` 991 passed, 8 skipped. The IWC subset (`GXFORMAT2_TEST_IWC_DIRECTORY`) passed 910. Green: ruff, flake8, black, mypy, pyrefly, flake8-docstrings, `make lint-docs`.

## CI verdict

The Python CI red on the 3.13 job is unrelated to the branch.

- IWC merged #1541 (`5bfb694`) at 2026-11-11 14:15Z. gxformat2 main's last green run (`42998946080`) was at 09:53Z, before that merge.
- #1541 adds `scripts/tests`. pytest, run from the repo root, collects it from the `iwc/` clone, and it imports `planemo`.
- The `schema_rules.yml` FileNotFoundError is a knock-on. `iwc/` sorts first, so gxformat2 loads from `.tox` site-packages, and `schema_rules.yml` is missing from package-data (it's absent from main's sdist too).
- Reproduced on `origin/main` source with the current IWC `scripts/`.
- Same two collection errors on `4440404` (run `43084303770`), nothing new. 3.10/3.11/3.12/3.14 passed, and 3.15 was cancelled by the 3.13 red. Java, TypeScript and docs passed.
- The matrix cancels the remaining versions on the first red, so no run can show every Python version green until main stops collecting `iwc/`.
- Not fixed here.

## Leftovers / questions for John

- Fix on main: add `testpaths = ["tests"]` (or `norecursedirs = iwc`) so the IWC clone isn't collected, and add `schema_rules.yml` to package-data. Only tests call `load_schema_rules` today, but the public module breaks when gxformat2 is installed from a package.
- Classifying fills: a "filled default" kind would need tool metadata (or a draft-aware heuristic) and widens scope. Should it be a follow-up?
- Optional: pin the real bamtofastq before-revision/final pair as `real-*` fixtures. I skipped it to keep the TS sync set small.
