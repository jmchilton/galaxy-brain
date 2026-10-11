The header grouping and layout switching look sound. I checked the actual component and styles in Chromium against the pre-PR component, including narrow cards, the real history counts badge, wrapping badge rows, larger font sizing, keyboard order and the dropdown. The caret stays on the first row and inside the header, and the documented tab order is preserved. All 55 focused and sibling tests passed.

Risk is low and reversible: this changes shared card layout without changing persisted data or APIs. Approve.
