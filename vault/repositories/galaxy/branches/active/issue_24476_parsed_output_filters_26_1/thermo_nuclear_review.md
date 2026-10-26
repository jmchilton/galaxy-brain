No implementation changes recommended. The parsed-only base and shared expression conversion keep this fix small, consistent across output types, and separate from tool authoring.

No findings were left unaddressed. A broader rewrite of the generic output hierarchy was considered and rejected because it would add migration work without simplifying this field's ownership or its three conversion sites.

<details>
<summary>Full code-quality review</summary>

Reviewed `origin/release_26.1..90601b3bc4e`, including both baseline and implementation commits, the surrounding output model/parser hierarchy, XML/YAML/CWL filter initialization, runtime filter handling, regression tests, and generated Tool Shed schema. Applied the thermo-nuclear code-quality review standards.

- **Structure:** `ToolOutputBaseModel` owns one parsed-output contract shared by all six concrete variants. Its explicit inheritance preserves the existing generic dataset/collection/simple fields while preventing the new field from entering incoming authoring models. The generated diff confirms no unrelated field or requirement changes from Pydantic inheritance.
- **Conversion:** `ToolOutputBase.filter_expressions` removes three copies of XML-to-string normalization. Dataset, collection, and scalar conversions simply pass that value to their models. There are no new special-case branches, casts, mode flags, source checks, or runtime evaluation paths.
- **Boundary:** XML expressions remain metadata. Existing YAML/CWL sources initialize filters to an empty list, and incoming user-defined models remain strict. Extending the scalar conversion avoids inconsistent metadata for the same supported XML feature.
- **Contract:** A non-null list with an independent default avoids a second representation for unconditional outputs and permits older serialized models to load. Expression order and surrounding-whitespace normalization match the existing filtering convention. Empty XML elements preserve a list entry rather than silently appearing unconditional.
- **Canonical helpers:** Existing runtime/linters directly normalize element text; neither exposes an appropriate reusable serialization helper. The new property belongs on the parser object that owns the elements and is used by every affected conversion.
- **Size and decomposition:** The two implementation modules remain 788 and 562 lines; neither crosses 1,000 lines. Adding a module, serializer framework, or generic hierarchy rewrite would create more concepts than this fix needs.
- **Tests and generated types:** Tests use real parser/model entry points and existing fixtures without mocks. Parameterization covers all scalar variants and unfiltered XML/YAML cases. Generated types change only the six parsed variants. The separate baseline commit preserves the requested reviewable history.

No structural regressions, missed substantial simplifications, branching growth, or unjustified abstraction were found. This was a static maintainability review; the coordinator's execution evidence and independent test-challenge report supply test validation.

</details>
