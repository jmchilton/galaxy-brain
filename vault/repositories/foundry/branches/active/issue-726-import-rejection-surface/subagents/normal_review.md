# Normal review debrief

Acted on all four real problems and most nits (commit `36514619`): managed Galaxy streams `main.log` into the Planemo terminal (verified planemo 0.75.47 `config.py:200-210`); Planemo converts gxformat2 client-side (`workflows.py:_raw_dict`), so bisection re-imports the converted dict; "well formed" now means passes `gxwf validate`, and a construct static validation accepted but Galaxy rejected is recorded as its own validator-gap finding; `not-run` vs `fail` rule stated in run-workflow-test step 0. Also named `failure_modality: workflow-import-rejected` in debug step 1, fixed `install_workflows()` citation, closed em-dashes in new prose.

Not acted on:
- Overlap between note's evidence table and debug step 2 — reviewer judged it serves different readers.

<details><summary>Full review</summary>

Verdict: sound, merge after small fixes. Covers all five #726 points; planemo claims mostly hold vs 0.75.47; casts match sources; nothing else in content/ lists the old five surfaces.

Real problems: (1) "server log only place a 500's cause appears" wrong for managed — read_log streams main.log to terminal. (2) Re-POSTing source format2 ≠ what Planemo sent (client-side python_to_workflow). (3) "well formed" undefined; #580 counter-case passed draft-validate yet 400'd — define as static gate, record validator gap (#644). (4) not-run vs fail drawn only in step 5; step 0 still lists env failures as not-run.

Nits: install_workflows defined in config.py, called from serve.py `_serve()`; `--workflows_from_path` uses a different endpoint, say "import endpoint"; name the modality key in debug step 1; spaced em-dashes in new prose; eval/scenarios split correct; coverage-gap entry right call.
</details>
