# Codex review

Codex (read-only, `origin/release_26.0...d23bf1d1cf5`) returned one P2 finding; not acted on.

Not acted on:
- `HistoryManager.get_converted_dataset` pre-checks metadata/existing conversions before the model call, so a no-history requester racing a conversion that completes between the check and model call gets 400 instead of the result. NEEDS-DECISION/minor: outcome matches arriving slightly earlier; the pre-check is what lets already-converted datasets skip history resolution. A model-level `history` resolver callback would remove the duplication but pushes history policy into the model layer (rejected in scope eval).

<details><summary>Full review</summary>

Files reviewed: managers/histories.py, model/__init__.py, api/users.py, services/datasets.py, test_datasets.py, test_users.py, populators.py, test_actions.py, plus context/session/serialization code. One finding: P2 concurrency, histories.py:311 "Duplicated conversion check can reject an available conversion" (likely).

</details>
