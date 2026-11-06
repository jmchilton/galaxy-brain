# Filtered findings

- thermo_review P3 2 (store exports `rawToolsById` / `toolTagsById`): not actionable. Pinia setup stores must return all state refs (no private state per Pinia docs), so these refs can't simply be hidden.
