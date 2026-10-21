No refactoring of the base branch was performed.

Round 2, after the re-scope. Head stays at `c1c12b303ed`. The [re-scope debrief](implementation_rescope_debrief.md) cites `294dc0dd957`, which is an earlier sha for the same commit.

- The new last commit, "Disable Convert Collection until a converter is selected", contains no refactoring. It changes one line in `SuitableConvertersTab.vue` (`selectedConverter == {}` becomes `!selectedConverter?.tool_id`) and adds two `assert_disabled` checks to `test_convert_datatype_simple_list`. Both checks depend on the fix, so neither can move to the base.
- The round-1 split still holds ([earlier_drafts/1/baseline_refactor.md](earlier_drafts/1/baseline_refactor.md)). `876754fddc7` holds every change to existing code. The 3 coverage commits only add code and keep their galaxy_ui_driver subjects.

No tests were run because the history did not change.
