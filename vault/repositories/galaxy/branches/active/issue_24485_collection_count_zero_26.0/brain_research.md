```yaml
documents:
  - path: vault/research/Component - Collections in Tool XML Tests.md
    why: Documents `count`/`min`/`max` on `<output_collection>` (min/max added 26.0), the semantics being fixed.
    load_when: Writing the unit test or checking expected-count semantics.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: Overview of interactor.py verification flow; verify_collection sits beside the dataset count/min/max checks that already use `is not None`.
    load_when: Reviewing consistency with the sibling checks.
research_requests: []
```
