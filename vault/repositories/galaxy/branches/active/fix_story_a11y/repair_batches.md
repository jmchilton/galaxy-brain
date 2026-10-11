# Accessibility repair batches

Source: `vitest_story_a11y/client/.storybook/A11Y_AUDIT.md`, 121 excepted story states across 26 files, 236 stories total. Repeated findings are grouped by shared component rather than one fix per story.

| Owner | Batch |
| --- | --- |
| forms_a11y | Form elements, FormData, FormSelection, SelectionField, library permissions, password form, admin role/quota forms; shared multiselect patch, label component, styles |
| collections_a11y | Collection creators and shared editing, file selection dialog, CommandPalette, ScrollList, ScrollToTop; FormSelectMany structure/targets |
| workflow_a11y | Object store badges/markdown, quota progress, workflow/invocation navigation and zoom, toolshed installation labels |
| coordinator | Shared modal and heading controls, tooltip accessible names, export/wizard labels, tool dropdown nesting and keyboard regression |

Each batch repairs production components on dev without changing rules or adding exceptions. Validation reuses frozen stories in `/private/tmp/galaxy-a11y-validation`, with all todo exceptions changed to error. Role-based selectors may need updating where a corrected combobox role moves from the wrapper to the actual input; these adaptations preserve all behavior assertions and stay outside the dev branch.
