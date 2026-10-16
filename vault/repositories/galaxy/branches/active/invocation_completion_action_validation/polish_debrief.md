# Expanded-head polish — 2026-10-16

Status: branches_need_polish; final verification in progress. No approval SHA or title chosen.

Head `ddfbb3b991c185779b0f4e200801d6f4d443d8c2`; actual base release_26.2 at `579ca73440d776002b7099538cef000838687d8e`. Earlier expanded head `9f04be9b5ad` has exactly the same final tree.

The current GENERAL checklist requires baseline controls in leading commits. Fresh independent review identified two new notification acceptance cases sharing the implementation commit. Split these into leading `993613b8a9e`, followed by unknown-name fix `8d60f4e6a09` and required export configuration fix `ddfbb3b991c`. Unknown-name/eight malformed-export tests remain with their fixes. Re-review confirms all agent-answerable items pass; human-read stays unchecked. Published to jmchilton fork with exact old-head force-with-lease. No production/test content change from the reviewed expanded scope.

[Description](pr_description.md), [three release-prefixed titles](pr_titles.md), [labels](pr_tags.md), [checklist](checklist_evaluation.md), [one strengthening review](strengthening_review.md). Label recommendation is kind/bug + area/workflows + area/API: fixes accepted unusable completion requests. Bot would apply workflow/testing/testing-api path labels; semantic API/workflow areas are central.

Pre-reorder fork CI had no failures; seven workflows succeeded, API/docs/general units were running, remaining checks pending/queued or skipped. Fresh head requires separate CI. Local verification: Black, isort and whitespace pass for five changed Python files. 28 focused API/unit cases running against identical final contents; two notification cases running against the leading base-only test commit. Reports /tmp/completion-polish-tests.html and /tmp/completion-polish-baseline.html; logs use matching .log names. Direct pytest avoids dependency-mutating runner startup.

No PR or GitHub discussion created or edited. Description covers hook-owned configuration validation, preserves accepting defaults, and explicitly bounds optional options/destination checks. Human review/title choice remain for John.
