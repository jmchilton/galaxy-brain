# Debrief

- Checked `origin/dev` (11b5df98451): bug still present. `ContentOptions.vue` edit button uses `v-g-tooltip.hover` + `:disabled`; `vGTooltip.showTooltip` bails on `aria-disabled="true"` and `suppressNativeTooltip` blanks `title`.
- No duplicate found (gh searches: "not yet editable", "v-g-tooltip disabled", "disabled button tooltip", "tooltip disabled").
- Rewrote raw.md into proposal per GX_ISSUE_DESCRIPTIONS: symptom + rendered HTML first, cause in details, Context cites #24377, Proposed Approach = GButton `disabled-title` pattern (23 components use it), Alternative = make vGTooltip honor aria-disabled.
- Subagent review (one round): no pushback. Fixed HTML snippet (disabled GButton renders `<button>` even with `href`), audit count ~30 → ~20 GButtons across 9 components. I reworded 26.1 note (BButton link blocked by Bootstrap `pointer-events: none`, not native disable).
- Left over: audit count covers GButton only; other elements with `v-g-tooltip` + disabled not counted.
- Recommendation: post; assign John (from his #24377 branch work).
