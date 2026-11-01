Embedded tool resolution is already extracted in a separate baseline refactor commit before the import-ordering fix; no additional history rewrite was needed.

The branch preserves the required review sequence:

1. `7bc2781a561` — **Baseline tests for embedded user tool workflow imports** adds the two passing final-output and earlier-annotation cases without changing implementation behavior.
2. `446f74bbfc5` — **Extract embedded workflow tool resolution** moves the existing user/admin creation and ownership checks from `ToolModule.from_dict` into `resolve_tool_uuid`, with `from_dict` still calling it at module construction. It does not add the dependency pre-pass or fix the reported failure.
3. `9b4b8fde415` — **Resolve embedded tools before building workflow steps** adds the importer pre-pass and failing-before/passing-after regression cases. The importer uses the extracted resolver rather than duplicating permission or creation logic.
4. `d8e943eff4c` — **Document embedded tool resolution transaction side effects** clarifies the helper's commit behavior without changing runtime behavior.

The remaining implementation change is the four-line dependency-preloading guard and call, so there is no additional independent refactor to split out. The test-challenge evidence establishes that the first commit's two baseline cases pass on the original implementation and the regression cases retain the original constraint failure on the base manager. No tests, implementation files, commits, or branch history were changed during this evaluation.
