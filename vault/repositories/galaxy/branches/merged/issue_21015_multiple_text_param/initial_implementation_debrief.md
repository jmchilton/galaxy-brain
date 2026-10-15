# Initial split implementation

John approved moving the text fixes into PR #23992 and retaining float support on a separate stacked branch. Text commit `299a59367472389cd2aa8eda1b69c2f8b5b4b543` changes seven files: newline-default row presentation, numeric text defaults and connected preselection, boolean/None validation, newline error guidance, and their regression tests/fixture. The original float editor behavior is preserved. Existing implementation and screenshot notes were archived under `earlier_drafts/1` before the revision.

The normal review found no actionable issues. Backend/doctests:191 passed,1 skipped; API:4 passed; client:22 passed; configured hooks passed. The original PR description was reviewed, published and verified against the prepared body. Final scope and screenshot evidence are linked from the implementation debrief.
