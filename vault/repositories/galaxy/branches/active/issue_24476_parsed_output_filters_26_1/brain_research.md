```yaml
documents:
  - path: vault/research/PR 18524 - Add Tool-Centric APIs to Tool Shed 2.0.md
    why: Traces ParsedTool output conversion, API consumers, and Tool Shed schema-keyed caching, including the move to tool_util_models.
    load_when: Checking how preserving filters reaches Galaxy and Tool Shed parsed-tool responses and generated client schemas.
  - path: vault/research/Component - User-Defined Tool Source Validation.md
    why: Explains the separate authoring contract and strict incoming models; verify current class names against release_26.1 before using examples.
    load_when: Keeping the new parsed-output field out of UserToolSource and YamlToolSource authoring models and schemas.
  - path: vault/projects/workflow_state/TOOL_PARSING_DECLARATIVE_TESTING_DESIGN.md
    why: Documents ParsedTool serialization expectations and existing output-model testing locations; historical gaps and nested collection examples are not current code.
    load_when: Choosing regression coverage for output conversion and the public serialized ParsedTool shape.
research_requests: []
```
